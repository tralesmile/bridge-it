import { describe, expect, it } from 'vitest';
import { EMPTY_PURCHASES, PRODUCTS, SUPPORTER_COINS, applyOwned, ownedFrom, owns, sanitizePurchases } from '../src/core/purchases';
import { NoStore, RevenueCatStore, createStore, type CustomerInfoLike, type PurchasesApi, type StoreProduct } from '../src/game/store';
import { createPlatform } from '../src/game/platform';

const info = (...ids: string[]): CustomerInfoLike => ({ entitlements: { active: Object.fromEntries(ids.map((id) => [id, { identifier: id }])) } });

/** A fake RevenueCat plugin. `next` decides what the next purchase does. */
function fakeApi(opts: { owned?: string[]; products?: StoreProduct[]; restore?: string[] } = {}) {
  let active = opts.owned ?? [];
  const calls: string[] = [];
  let listener: ((i: CustomerInfoLike) => void) | null = null;
  let next: 'buy' | 'cancel' | 'pending' | 'error' | 'owned' = 'buy';
  const api: PurchasesApi = {
    async configure({ apiKey }) {
      calls.push(`configure:${apiKey}`);
    },
    async getProducts({ productIdentifiers }) {
      calls.push('products');
      const all = opts.products ?? [
        { identifier: 'remove_ads', priceString: '€3,99' },
        { identifier: 'supporter_pack', priceString: '€9,99' },
      ];
      return { products: all.filter((p) => productIdentifiers.includes(p.identifier)) };
    },
    async purchaseStoreProduct({ product }) {
      calls.push(`buy:${product.identifier}`);
      if (next === 'cancel') throw Object.assign(new Error('cancelled'), { code: '1', userCancelled: true });
      if (next === 'pending') throw Object.assign(new Error('pending'), { code: '20' });
      if (next === 'owned') throw Object.assign(new Error('already'), { code: '6' });
      if (next === 'error') throw Object.assign(new Error('network'), { code: '10' });
      active = [...active, product.identifier === 'remove_ads' ? 'no_ads' : 'supporter'];
      return { customerInfo: info(...active) };
    },
    async restorePurchases() {
      calls.push('restore');
      if (opts.restore) active = opts.restore;
      return { customerInfo: info(...active) };
    },
    async getCustomerInfo() {
      return { customerInfo: info(...active) };
    },
    async addCustomerInfoUpdateListener(fn) {
      listener = fn;
      return 'id';
    },
  };
  return {
    api,
    calls,
    setNext: (n: typeof next) => (next = n),
    push: (...ids: string[]) => {
      active = ids;
      listener?.(info(...ids));
    },
  };
}

describe('purchases core', () => {
  it('has two one-time products with fallback prices', () => {
    expect(PRODUCTS.map((p) => p.id)).toEqual(['remove_ads', 'supporter_pack']);
    for (const p of PRODUCTS) expect(p.fallbackPrice).toMatch(/^\$\d+\.99$/);
  });

  it('supporter also removes ads', () => {
    expect(ownedFrom(['supporter'])).toEqual({ noAds: true, supporter: true });
    expect(ownedFrom(['no_ads'])).toEqual({ noAds: true, supporter: false });
    expect(ownedFrom([])).toEqual({ noAds: false, supporter: false });
  });

  it('gives supporter coins once, keeps them after a refund', () => {
    const a = applyOwned(EMPTY_PURCHASES, { noAds: true, supporter: true });
    expect(a.coins).toBe(SUPPORTER_COINS);
    const again = applyOwned(a.state, { noAds: true, supporter: true });
    expect(again.coins).toBe(0);
    const refunded = applyOwned(again.state, { noAds: false, supporter: false });
    expect(refunded.state).toEqual({ noAds: false, supporter: false, supporterCoins: true });
    expect(applyOwned(refunded.state, { noAds: true, supporter: true }).coins).toBe(0);
    expect(owns(a.state, 'remove_ads')).toBe(true);
    expect(owns(applyOwned(EMPTY_PURCHASES, { noAds: true, supporter: false }).state, 'supporter_pack')).toBe(false);
  });

  it('reads old or broken saves as nothing bought', () => {
    expect(sanitizePurchases(undefined)).toEqual(EMPTY_PURCHASES);
    expect(sanitizePurchases({ noAds: 'yes', supporter: 1 })).toEqual(EMPTY_PURCHASES);
    expect(sanitizePurchases({ noAds: true })).toEqual({ ...EMPTY_PURCHASES, noAds: true });
  });
});

describe('RevenueCat store', () => {
  it('web and portal builds have no store', () => {
    expect(createStore(false, 'android').available()).toBe(false);
    expect(new NoStore().price()).toBeNull();
  });

  it('no API key yet: no store, the plugin is never loaded', async () => {
    let loaded = false;
    const s = new RevenueCatStore(async () => ((loaded = true), fakeApi().api), '');
    await s.init();
    expect(s.available()).toBe(false);
    expect(loaded).toBe(false);
  });

  it('starts: configures, reports what is owned, loads store prices', async () => {
    const f = fakeApi({ owned: ['no_ads'] });
    const s = new RevenueCatStore(async () => f.api, 'goog_key');
    const seen: unknown[] = [];
    s.onChange((o) => seen.push(o));
    await s.init();
    expect(f.calls[0]).toBe('configure:goog_key');
    expect(seen).toEqual([{ noAds: true, supporter: false }]);
    expect(s.price('remove_ads')).toBe('€3,99');
    expect(s.price('supporter_pack')).toBe('€9,99');
  });

  it('buy, cancel, pending, failure, already owned', async () => {
    const f = fakeApi();
    const s = new RevenueCatStore(async () => f.api, 'key');
    await s.init();
    f.setNext('cancel');
    expect(await s.buy('remove_ads')).toBe('cancelled');
    f.setNext('pending');
    expect(await s.buy('remove_ads')).toBe('pending');
    f.setNext('error');
    expect(await s.buy('remove_ads')).toBe('failed');
    f.setNext('buy');
    expect(await s.buy('supporter_pack')).toBe('bought');
    f.setNext('owned');
    expect(await s.buy('supporter_pack')).toBe('bought'); // restored instead
  });

  it('a double tap starts only one payment', async () => {
    const f = fakeApi();
    const s = new RevenueCatStore(async () => f.api, 'key');
    await s.init();
    const [a, b] = await Promise.all([s.buy('remove_ads'), s.buy('remove_ads')]);
    expect([a, b]).toEqual(['bought', 'cancelled']);
    expect(f.calls.filter((c) => c.startsWith('buy:'))).toHaveLength(1);
  });

  it('a pending payment that goes through, and a refund, reach the listener', async () => {
    const f = fakeApi();
    const s = new RevenueCatStore(async () => f.api, 'key');
    const seen: Array<{ noAds: boolean }> = [];
    const stop = s.onChange((o) => seen.push(o));
    await s.init();
    f.push('no_ads');
    f.push();
    expect(seen.map((o) => o.noAds)).toEqual([false, true, false]);
    stop();
    f.push('no_ads');
    expect(seen).toHaveLength(3);
  });

  it('restore finds purchases or says nothing was found', async () => {
    const found = fakeApi({ restore: ['supporter'] });
    const s = new RevenueCatStore(async () => found.api, 'key');
    await s.init();
    expect(await s.restore()).toBe('restored');
    const none = new RevenueCatStore(async () => fakeApi().api, 'key');
    await none.init();
    expect(await none.restore()).toBe('nothing');
  });

  it('no plugin or no network: fails softly, shows fallback prices', async () => {
    const s = new RevenueCatStore(async () => undefined, 'key');
    await s.init();
    expect(s.price('remove_ads')).toBeNull();
    expect(await s.buy('remove_ads')).toBe('failed');
    expect(await s.restore()).toBe('failed');
    const broken = new RevenueCatStore(async () => {
      throw new Error('no plugin');
    }, 'key');
    await expect(broken.init()).resolves.toBeUndefined();
  });
});

describe('Remove ads in the platform', () => {
  it('no breaks and rewards without an ad', async () => {
    let t = 0;
    let shown = 0;
    const sdk = {
      init: async () => undefined,
      game: { loadingStart() {}, loadingStop() {}, gameplayStart() {}, gameplayStop() {} },
      ad: {
        requestAd: (_type: string, cb: { adFinished?(): void; adError?(): void }) => {
          shown++;
          cb.adFinished?.();
        },
      },
    };
    const p = createPlatform('crazygames', { pause() {}, now: () => t }, { CrazyGames: { SDK: sdk } });
    await p.init();
    p.setNoAds(true);
    t = 10 * 60_000;
    await p.commercialBreak();
    expect(await p.rewardedAd()).toBe(true);
    expect(shown).toBe(0);
    p.setNoAds(false);
    await p.commercialBreak();
    expect(shown).toBe(1);
  });
});
