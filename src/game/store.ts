/**
 * Real-money store for the app build (RevenueCat over Google Play Billing and StoreKit).
 * Web and portal builds have no store: `store.available()` is false and no purchase UI is shown.
 * Like the ad code, the plugin is only bundled into the app build.
 */
import { PRODUCTS, ownedFrom, type ProductId } from '../core/purchases';

declare const __PLATFORM__: string | undefined;

/** The parts of @revenuecat/purchases-capacitor we use. */
export interface PurchasesApi {
  configure(opts: { apiKey: string }): Promise<void>;
  getProducts(opts: { productIdentifiers: string[]; type?: string }): Promise<{ products: StoreProduct[] }>;
  purchaseStoreProduct(opts: { product: StoreProduct }): Promise<{ customerInfo: CustomerInfoLike }>;
  restorePurchases(): Promise<{ customerInfo: CustomerInfoLike }>;
  getCustomerInfo(): Promise<{ customerInfo: CustomerInfoLike }>;
  addCustomerInfoUpdateListener(fn: (info: CustomerInfoLike) => void): Promise<string>;
}

export interface StoreProduct {
  identifier: string;
  priceString: string;
}

export interface CustomerInfoLike {
  entitlements: { active: Record<string, unknown> };
}

export type BuyResult = 'bought' | 'cancelled' | 'pending' | 'failed';
export type RestoreResult = 'restored' | 'nothing' | 'failed';
export type Owned = { noAds: boolean; supporter: boolean };

export interface Store {
  available(): boolean;
  init(): Promise<void>;
  /** The store price in the player's currency, or null when the store has not given one. */
  price(id: ProductId): string | null;
  buy(id: ProductId): Promise<BuyResult>;
  restore(): Promise<RestoreResult>;
  /** Called with fresh data from the store (start, purchase, restore, a pending payment that went through, a refund). */
  onChange(fn: (owned: Owned) => void): () => void;
}

/** RevenueCat public SDK keys (not secret). Empty until the owner has a RevenueCat account. */
export const REVENUECAT_KEYS: Record<'android' | 'ios', string> = { android: '', ios: '' };

// RevenueCat error codes (PURCHASES_ERROR_CODE).
const CANCELLED = '1';
const ALREADY_OWNED = '6';
const PENDING = '20';

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | undefined> =>
  Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);

const ownedOf = (info: CustomerInfoLike | undefined): Owned => ownedFrom(Object.keys(info?.entitlements?.active ?? {}));

export class NoStore implements Store {
  available(): boolean {
    return false;
  }
  async init(): Promise<void> {}
  price(): string | null {
    return null;
  }
  async buy(): Promise<BuyResult> {
    return 'failed';
  }
  async restore(): Promise<RestoreResult> {
    return 'failed';
  }
  onChange(): () => void {
    return () => undefined;
  }
}

export class RevenueCatStore implements Store {
  private api: PurchasesApi | null = null;
  private products = new Map<string, StoreProduct>();
  private listeners: Array<(owned: Owned) => void> = [];
  private busy = false;

  constructor(
    private readonly load: () => Promise<PurchasesApi | undefined>,
    private readonly apiKey: string,
  ) {}

  /** No key (owner has no account yet) means no store, so the buttons stay hidden. */
  available(): boolean {
    return this.apiKey.length > 0;
  }

  async init(): Promise<void> {
    if (!this.available()) return;
    try {
      const api = await withTimeout(this.load(), 5000);
      if (!api) return;
      await withTimeout(api.configure({ apiKey: this.apiKey }), 8000);
      this.api = api;
      await api.addCustomerInfoUpdateListener((info) => this.emit(info));
      const info = await withTimeout(api.getCustomerInfo(), 8000);
      if (info) this.emit(info.customerInfo);
      await this.loadProducts();
    } catch {
      // No network or no store account on the phone: the game uses the saved state.
    }
  }

  private async loadProducts(): Promise<void> {
    if (!this.api || this.products.size) return;
    const got = await withTimeout(this.api.getProducts({ productIdentifiers: PRODUCTS.map((p) => p.id), type: 'NON_SUBSCRIPTION' }), 8000);
    for (const p of got?.products ?? []) this.products.set(p.identifier, p);
  }

  price(id: ProductId): string | null {
    return this.products.get(id)?.priceString ?? null;
  }

  onChange(fn: (owned: Owned) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }

  private emit(info: CustomerInfoLike | undefined): Owned {
    const owned = ownedOf(info);
    for (const fn of this.listeners) fn(owned);
    return owned;
  }

  async buy(id: ProductId): Promise<BuyResult> {
    // A double tap must never start two payments.
    if (this.busy) return 'cancelled';
    this.busy = true;
    try {
      await this.loadProducts().catch(() => undefined);
      const product = this.products.get(id);
      if (!this.api || !product) return 'failed';
      const want = PRODUCTS.find((p) => p.id === id)?.entitlement ?? '';
      try {
        const { customerInfo } = await this.api.purchaseStoreProduct({ product });
        const owned = this.emit(customerInfo);
        return (want === 'no_ads' ? owned.noAds : owned.supporter) ? 'bought' : 'pending';
      } catch (e) {
        const code = String((e as { code?: unknown })?.code ?? '');
        if (code === CANCELLED || (e as { userCancelled?: unknown })?.userCancelled === true) return 'cancelled';
        if (code === PENDING) return 'pending';
        if (code === ALREADY_OWNED) return (await this.restore()) === 'restored' ? 'bought' : 'failed';
        return 'failed';
      }
    } finally {
      this.busy = false;
    }
  }

  async restore(): Promise<RestoreResult> {
    if (!this.api) return 'failed';
    try {
      const { customerInfo } = await this.api.restorePurchases();
      const owned = this.emit(customerInfo);
      return owned.noAds || owned.supporter ? 'restored' : 'nothing';
    } catch {
      return 'failed';
    }
  }
}

const loadPurchases = (): Promise<PurchasesApi | undefined> =>
  typeof __PLATFORM__ === 'string' && __PLATFORM__ === 'app'
    ? import('@revenuecat/purchases-capacitor').then((m) => m.Purchases as unknown as PurchasesApi)
    : Promise.resolve(undefined);

export function createStore(isApp: boolean, os: 'android' | 'ios', load = loadPurchases): Store {
  return isApp ? new RevenueCatStore(load, REVENUECAT_KEYS[os]) : new NoStore();
}

const isApp = typeof __PLATFORM__ === 'string' && __PLATFORM__ === 'app';
const os = (globalThis as { Capacitor?: { getPlatform?(): string } }).Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android';
export const store: Store = createStore(isApp, os);
