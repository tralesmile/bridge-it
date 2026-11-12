import { describe, expect, test } from 'vitest';
import { platformName } from '../src/core/adPolicy';
import { ADMOB_UNITS, AdMobPlatform, createPlatform, type AdMobApi, type AdMobConsent } from '../src/game/platform';

const MIN = 60 * 1000;

function fakeClock() {
  const c = { t: 1000, paused: [] as boolean[] };
  return { c, hooks: { now: () => c.t, pause: (p: boolean) => c.paused.push(p) } };
}

interface FakeOptions {
  consent?: Partial<AdMobConsent>;
  formResult?: Partial<AdMobConsent>;
  tracking?: 'authorized' | 'denied' | 'notDetermined' | 'restricted';
  /** What the player does with a rewarded ad. */
  reward?: 'watch' | 'skip' | 'fail';
  noFill?: boolean;
}

/** A fake AdMob plugin: records calls and fires the plugin's events like the real one. */
function fakeAdMob(o: FakeOptions = {}) {
  const calls: string[] = [];
  const listeners = new Map<string, Set<() => void>>();
  const emit = (event: string) => listeners.get(event)?.forEach((fn) => fn());
  const consent: AdMobConsent = { status: 'NOT_REQUIRED', canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED', ...o.consent };
  const api: AdMobApi = {
    initialize: async () => void calls.push('initialize'),
    requestConsentInfo: async () => (calls.push('consentInfo'), consent),
    showConsentForm: async () => (calls.push('consentForm'), { ...consent, status: 'OBTAINED', canRequestAds: true, ...o.formResult }),
    showPrivacyOptionsForm: async () => void calls.push('privacyForm'),
    trackingAuthorizationStatus: async () => (calls.push('trackingStatus'), { status: o.tracking ?? 'authorized' }),
    requestTrackingAuthorization: async () => void calls.push('trackingPrompt'),
    prepareInterstitial: async ({ adId }) => {
      calls.push(`prepareInterstitial ${adId}`);
      if (o.noFill) throw new Error('no fill');
    },
    showInterstitial: async () => {
      calls.push('showInterstitial');
      setTimeout(() => emit('interstitialAdDismissed'), 5);
    },
    prepareRewardVideoAd: async ({ adId }) => {
      calls.push(`prepareReward ${adId}`);
      if (o.noFill) throw new Error('no fill');
    },
    showRewardVideoAd: () => {
      calls.push('showReward');
      const r = o.reward ?? 'watch';
      if (r === 'fail') {
        setTimeout(() => emit('onRewardedVideoAdFailedToShow'), 5);
        return new Promise(() => {});
      }
      if (r === 'watch') {
        setTimeout(() => emit('onRewardedVideoAdReward'), 3);
        setTimeout(() => emit('onRewardedVideoAdDismissed'), 6);
        return new Promise((resolve) => setTimeout(() => resolve({ type: 'coins', amount: 1 }), 3));
      }
      // Closed early: the real plugin never settles this promise.
      setTimeout(() => emit('onRewardedVideoAdDismissed'), 5);
      return new Promise(() => {});
    },
    addListener: async (event, fn) => {
      const set = listeners.get(event) ?? new Set();
      set.add(fn as () => void);
      listeners.set(event, set);
      return { remove: async () => void set.delete(fn as () => void) };
    },
  };
  const listenerCount = () => [...listeners.values()].reduce((n, s) => n + s.size, 0);
  return { api, calls, listenerCount };
}

const flush = () => new Promise((r) => setTimeout(r, 20));

describe('AdMob app adapter', () => {
  test('the app build mode picks the AdMob adapter', () => {
    expect(platformName('app')).toBe('app');
    const { hooks } = fakeClock();
    const p = createPlatform('app', hooks, { Capacitor: { getPlatform: () => 'ios' } });
    expect(p.name).toBe('app');
    expect(p).toBeInstanceOf(AdMobPlatform);
  });

  test('outside the EU: no consent form, ads load, break after 5 minutes, muted while it plays', async () => {
    const f = fakeAdMob();
    const { c, hooks } = fakeClock();
    const p = new AdMobPlatform(hooks, async () => f.api, 'android');
    await p.init();
    await flush();
    expect(f.calls).toEqual(['initialize', 'consentInfo', `prepareInterstitial ${ADMOB_UNITS.android.interstitial}`, `prepareReward ${ADMOB_UNITS.android.rewarded}`]);
    expect(p.hasPrivacyOptions()).toBe(false);
    await p.commercialBreak(); // first 5 minutes: nothing
    expect(f.calls).not.toContain('showInterstitial');
    c.t += 6 * MIN;
    await p.commercialBreak();
    expect(f.calls).toContain('showInterstitial');
    expect(c.paused).toEqual([true, false, false]);
    await flush();
    // The next ad is loaded again, and no listener is left behind.
    expect(f.calls.filter((x) => x.startsWith('prepareInterstitial'))).toHaveLength(2);
    expect(f.listenerCount()).toBe(0);
  });

  test('EU: the consent form shows before any ad, and Settings can open it again', async () => {
    const f = fakeAdMob({ consent: { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' } });
    const { hooks } = fakeClock();
    const p = new AdMobPlatform(hooks, async () => f.api, 'android');
    await p.init();
    expect(f.calls.slice(0, 3)).toEqual(['initialize', 'consentInfo', 'consentForm']);
    expect(f.calls.indexOf('consentForm')).toBeLessThan(f.calls.findIndex((x) => x.startsWith('prepare')));
    expect(p.hasPrivacyOptions()).toBe(true);
    await p.privacyOptions();
    expect(f.calls).toContain('privacyForm');
  });

  test('consent refused: no ads are loaded or shown, and the hint is still given', async () => {
    const f = fakeAdMob({ consent: { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false }, formResult: { canRequestAds: false } });
    const { c, hooks } = fakeClock();
    const p = new AdMobPlatform(hooks, async () => f.api, 'android');
    await p.init();
    await flush();
    c.t += 6 * MIN;
    await p.commercialBreak();
    expect(await p.rewardedAd()).toBe(true);
    expect(f.calls.some((x) => x.startsWith('prepare') || x.startsWith('show'))).toBe(false);
  });

  test('iOS asks about tracking once, Android never does', async () => {
    const ios = fakeAdMob({ tracking: 'notDetermined' });
    await new AdMobPlatform(fakeClock().hooks, async () => ios.api, 'ios').init();
    expect(ios.calls).toContain('trackingPrompt');
    const asked = fakeAdMob({ tracking: 'denied' });
    await new AdMobPlatform(fakeClock().hooks, async () => asked.api, 'ios').init();
    expect(asked.calls).not.toContain('trackingPrompt');
    const android = fakeAdMob({ tracking: 'notDetermined' });
    await new AdMobPlatform(fakeClock().hooks, async () => android.api, 'android').init();
    expect(android.calls).not.toContain('trackingStatus');
    expect(ios.calls).toContain(`prepareInterstitial ${ADMOB_UNITS.ios.interstitial}`);
  });

  test('rewarded: watched gives the reward, closed early gives none, an ad that fails to show gives it free', async () => {
    for (const [reward, want] of [['watch', true], ['skip', false], ['fail', true]] as const) {
      const f = fakeAdMob({ reward });
      const { c, hooks } = fakeClock();
      const p = new AdMobPlatform(hooks, async () => f.api, 'android');
      await p.init();
      await flush();
      expect(await p.rewardedAd()).toBe(want);
      expect(c.paused.at(-1)).toBe(false);
      await flush();
      expect(f.listenerCount()).toBe(0);
    }
  });

  test('no plugin, no network or no ad fill never breaks the game', async () => {
    const { c, hooks } = fakeClock();
    const none = new AdMobPlatform(hooks, async () => undefined, 'android');
    await none.init();
    expect(await none.rewardedAd()).toBe(true);
    const broken = new AdMobPlatform(hooks, () => Promise.reject(new Error('not implemented on web')), 'android');
    await broken.init();
    c.t += 6 * MIN;
    await broken.commercialBreak();
    expect(broken.hasPrivacyOptions()).toBe(false);
    const empty = fakeAdMob({ noFill: true });
    const p = new AdMobPlatform(hooks, async () => empty.api, 'android');
    await p.init();
    await flush();
    expect(await p.rewardedAd()).toBe(true);
    c.t += 4 * MIN;
    await p.commercialBreak();
    expect(empty.calls).not.toContain('showInterstitial');
  });

  test('test ad units are Google test ids until the owner adds real ones', () => {
    for (const units of Object.values(ADMOB_UNITS)) {
      expect(units.interstitial).toMatch(/^ca-app-pub-\d{16}\/\d{10}$/);
      expect(units.rewarded).toMatch(/^ca-app-pub-\d{16}\/\d{10}$/);
      if (units.interstitial.startsWith('ca-app-pub-3940256099942544/')) expect(units.testing).toBe(true);
    }
  });
});
