/**
 * One interface for every place the game runs (own website, Poki, CrazyGames, Android, iOS).
 * The game only talks to this, so adding a portal SDK never touches game code.
 * The build picks the adapter: `npm run build:crazygames` / `npm run build:poki` (see vite.config.ts).
 */
import { breakAllowed, platformName, type AdClock, type PlatformName } from '../core/adPolicy';

/** Set by vite.config.ts for each build flavour. */
declare const __PLATFORM__: string | undefined;

export interface Platform {
  readonly name: PlatformName;
  init(): Promise<void>;
  /** The menu is on screen: loading is over. */
  loadingDone(): void;
  /** Tell the portal real play started or stopped (portals use this for ad timing). */
  gameplayStart(): void;
  gameplayStop(): void;
  /** Shows a rewarded ad. Resolves true only if the player earned the reward. */
  rewardedAd(): Promise<boolean>;
  /** A break between levels. Resolves when the game may continue. Skipped in the first 5 minutes. */
  commercialBreak(): Promise<void>;
  /** True when the player must be able to change their ad consent (EU and UK, in the app). */
  hasPrivacyOptions(): boolean;
  /** Opens the ad consent form again (Settings, "Privacy choices"). */
  privacyOptions(): Promise<void>;
  /** The player bought Remove ads (or it was refunded: false). */
  setNoAds(on: boolean): void;
}

/** Called while an ad plays, so the game can mute itself. */
export interface AdHooks {
  pause(paused: boolean): void;
  now(): number;
}

/** Shared parts: the gameplay flag (portals dislike repeated start or stop) and our break timing. */
abstract class BasePlatform implements Platform {
  abstract readonly name: PlatformName;
  protected playing = false;
  protected noAds = false;
  protected readonly clock: AdClock;

  constructor(protected readonly hooks: AdHooks) {
    this.clock = { start: hooks.now(), lastBreak: null };
  }

  async init(): Promise<void> {}
  loadingDone(): void {}
  hasPrivacyOptions(): boolean {
    return false;
  }
  async privacyOptions(): Promise<void> {}
  protected sdkStart(): void {}
  protected sdkStop(): void {}
  protected abstract showBreak(): Promise<void>;
  protected abstract showRewarded(): Promise<boolean>;

  /** Remove ads bought: no breaks, and rewards come without an ad. */
  setNoAds(on: boolean): void {
    this.noAds = on;
  }

  async rewardedAd(): Promise<boolean> {
    if (this.noAds) return true;
    return this.showRewarded();
  }

  gameplayStart(): void {
    if (this.playing) return;
    this.playing = true;
    this.sdkStart();
  }

  gameplayStop(): void {
    if (!this.playing) return;
    this.playing = false;
    this.sdkStop();
  }

  async commercialBreak(): Promise<void> {
    if (this.noAds || !breakAllowed(this.clock, this.hooks.now())) return;
    this.clock.lastBreak = this.hooks.now();
    const was = this.playing;
    this.gameplayStop();
    try {
      await this.showBreak();
    } catch {
      // An ad blocker or an SDK error must never stop the game.
    } finally {
      this.hooks.pause(false);
      if (was) this.gameplayStart();
    }
  }
}

/** Own website and development: no ads, rewards are free. */
export class LocalPlatform extends BasePlatform {
  readonly name = 'local' as const;
  protected async showBreak(): Promise<void> {}
  protected async showRewarded(): Promise<boolean> {
    return true;
  }
}

/** The parts of the CrazyGames SDK v3 we use (window.CrazyGames.SDK). */
export interface CrazySdk {
  init(): Promise<void>;
  game: { gameplayStart(): void; gameplayStop(): void; loadingStart?(): void; loadingStop?(): void };
  ad: { requestAd(type: 'midgame' | 'rewarded', callbacks: { adStarted?(): void; adFinished?(): void; adError?(error: unknown): void }): void };
}

export class CrazyGamesPlatform extends BasePlatform {
  readonly name = 'crazygames' as const;
  private sdk: CrazySdk | null = null;

  constructor(hooks: AdHooks, private readonly find: () => CrazySdk | undefined) {
    super(hooks);
  }

  override async init(): Promise<void> {
    const sdk = this.find();
    if (!sdk) return;
    try {
      await sdk.init();
      this.sdk = sdk;
      sdk.game.loadingStart?.();
    } catch {
      this.sdk = null;
    }
  }

  override loadingDone(): void {
    this.sdk?.game.loadingStop?.();
  }

  protected override sdkStart(): void {
    this.sdk?.game.gameplayStart();
  }

  protected override sdkStop(): void {
    this.sdk?.game.gameplayStop();
  }

  private ad(type: 'midgame' | 'rewarded'): Promise<boolean> {
    const sdk = this.sdk;
    if (!sdk) return Promise.resolve(false);
    return new Promise((resolve) => {
      sdk.ad.requestAd(type, {
        adStarted: () => this.hooks.pause(true),
        adFinished: () => {
          this.hooks.pause(false);
          resolve(true);
        },
        adError: () => {
          this.hooks.pause(false);
          resolve(false);
        },
      });
    });
  }

  protected async showBreak(): Promise<void> {
    await this.ad('midgame');
  }

  protected async showRewarded(): Promise<boolean> {
    return this.ad('rewarded');
  }
}

/** The parts of the Poki SDK v2 we use (window.PokiSDK). */
export interface PokiSdk {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(onStart?: () => void): Promise<void>;
  rewardedBreak(onStart?: () => void): Promise<boolean>;
}

export class PokiPlatform extends BasePlatform {
  readonly name = 'poki' as const;
  private sdk: PokiSdk | null = null;

  constructor(hooks: AdHooks, private readonly find: () => PokiSdk | undefined) {
    super(hooks);
  }

  override async init(): Promise<void> {
    const sdk = this.find();
    if (!sdk) return;
    try {
      await sdk.init();
      this.sdk = sdk;
    } catch {
      // Poki still works with an ad blocker; the game just gets no ads.
      this.sdk = sdk;
    }
  }

  override loadingDone(): void {
    this.sdk?.gameLoadingFinished();
  }

  protected override sdkStart(): void {
    this.sdk?.gameplayStart();
  }

  protected override sdkStop(): void {
    this.sdk?.gameplayStop();
  }

  protected async showBreak(): Promise<void> {
    await this.sdk?.commercialBreak(() => this.hooks.pause(true));
  }

  protected async showRewarded(): Promise<boolean> {
    if (!this.sdk) return false;
    try {
      return await this.sdk.rewardedBreak(() => this.hooks.pause(true));
    } catch {
      return false;
    } finally {
      this.hooks.pause(false);
    }
  }
}

/**
 * The parts of @capacitor-community/admob we use. Our own copy of the types, so tests can pass a fake
 * and this file never loads the plugin on the web.
 */
export interface AdMobApi {
  initialize(options?: { maxAdContentRating?: string; initializeForTesting?: boolean }): Promise<void>;
  requestConsentInfo(): Promise<AdMobConsent>;
  showConsentForm(): Promise<AdMobConsent>;
  showPrivacyOptionsForm(): Promise<void>;
  trackingAuthorizationStatus(): Promise<{ status: 'authorized' | 'denied' | 'notDetermined' | 'restricted' }>;
  requestTrackingAuthorization(): Promise<void>;
  prepareInterstitial(options: { adId: string; isTesting?: boolean }): Promise<unknown>;
  showInterstitial(): Promise<void>;
  prepareRewardVideoAd(options: { adId: string; isTesting?: boolean }): Promise<unknown>;
  showRewardVideoAd(): Promise<unknown>;
  addListener(event: string, fn: (...args: unknown[]) => void): Promise<{ remove(): Promise<void> }>;
}

export interface AdMobConsent {
  status: 'NOT_REQUIRED' | 'OBTAINED' | 'REQUIRED' | 'UNKNOWN';
  isConsentFormAvailable?: boolean;
  canRequestAds: boolean;
  privacyOptionsRequirementStatus: 'NOT_REQUIRED' | 'REQUIRED' | 'UNKNOWN';
}

export interface AdUnits {
  interstitial: string;
  rewarded: string;
  /** Google's test ids: always true until the owner has an AdMob account. */
  testing: boolean;
}

/**
 * Google's public test ad units (they never pay and are safe to click). The owner's real ids replace
 * these after the AdMob account exists (docs/NEEDS_FROM_OWNER.md); the app ids are in the
 * Android manifest and the iOS Info.plist.
 */
export const ADMOB_UNITS: Record<'android' | 'ios', AdUnits> = {
  android: { interstitial: 'ca-app-pub-3940256099942544/1033173712', rewarded: 'ca-app-pub-3940256099942544/5224354917', testing: true },
  ios: { interstitial: 'ca-app-pub-3940256099942544/4411468910', rewarded: 'ca-app-pub-3940256099942544/1712485313', testing: true },
};

/** Waits for a promise, but gives up after `ms` (a phone with no network must still reach the menu). */
const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | undefined> =>
  Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);

/** How long to wait for a full screen ad to close before the game goes on anyway. */
export const AD_GIVE_UP_MS = 90_000;
/** A reward event can come just after the close event; wait this long for it. */
const REWARD_GRACE_MS = 400;

/**
 * Android and iOS app: Google AdMob with the UMP consent form (EU and UK) and, on iOS, the
 * App Tracking Transparency prompt. Our break rule (src/core/adPolicy.ts) still applies.
 * A missing plugin, no network or no ad fill never breaks the game: the player just gets no ad
 * (and a rewarded ad's reward for free).
 */
export class AdMobPlatform extends BasePlatform {
  readonly name = 'app' as const;
  private ads: AdMobApi | null = null;
  private privacyRequired = false;
  private interstitialReady = false;
  private rewardReady = false;

  constructor(
    hooks: AdHooks,
    private readonly load: () => Promise<AdMobApi | undefined>,
    private readonly os: 'android' | 'ios',
    private readonly units: AdUnits = ADMOB_UNITS[os],
  ) {
    super(hooks);
  }

  override async init(): Promise<void> {
    try {
      const ads = await withTimeout(this.load(), 5000);
      if (!ads) return;
      await withTimeout(ads.initialize({ maxAdContentRating: 'General', initializeForTesting: this.units.testing }), 8000);
      let consent = await withTimeout(ads.requestConsentInfo(), 8000);
      if (!consent) return; // no network: try again next start
      // iOS: ask about tracking once. A "no" is fine, ads are then not personalised.
      if (this.os === 'ios') {
        const tracking = await ads.trackingAuthorizationStatus();
        if (tracking.status === 'notDetermined') await ads.requestTrackingAuthorization();
      }
      if (consent.status === 'REQUIRED' && consent.isConsentFormAvailable) consent = await ads.showConsentForm();
      this.privacyRequired = consent.privacyOptionsRequirementStatus === 'REQUIRED';
      if (!consent.canRequestAds) return;
      this.ads = ads;
      void this.prepare();
    } catch {
      this.ads = null;
    }
  }

  override hasPrivacyOptions(): boolean {
    return this.privacyRequired;
  }

  override async privacyOptions(): Promise<void> {
    const ads = this.ads ?? (await this.load().catch(() => undefined));
    await ads?.showPrivacyOptionsForm().catch(() => undefined);
  }

  /** Loads the next ads in the background, so a break or reward shows at once. */
  private async prepare(): Promise<void> {
    const ads = this.ads;
    if (!ads) return;
    const opts = (adId: string) => ({ adId, isTesting: this.units.testing });
    if (!this.interstitialReady) {
      this.interstitialReady = await ads.prepareInterstitial(opts(this.units.interstitial)).then(() => true, () => false);
    }
    if (!this.rewardReady) {
      this.rewardReady = await ads.prepareRewardVideoAd(opts(this.units.rewarded)).then(() => true, () => false);
    }
  }

  /**
   * Shows one full screen ad and resolves when it closes: 'watched', 'closed' (a rewarded ad closed
   * before the reward) or 'none' (no consent, no network, no ad to show, or it failed).
   */
  private async fullScreen(kind: 'interstitial' | 'reward'): Promise<'watched' | 'closed' | 'none'> {
    const ads = this.ads;
    if (!ads) return 'none';
    const ready = kind === 'interstitial' ? this.interstitialReady : this.rewardReady;
    if (!ready) {
      void this.prepare();
      return 'none';
    }
    if (kind === 'interstitial') this.interstitialReady = false;
    else this.rewardReady = false;
    const prefix = kind === 'interstitial' ? 'interstitialAd' : 'onRewardedVideoAd';
    let earned = false;
    let failed = false;
    let done: () => void = () => {};
    const closed = new Promise<void>((resolve) => (done = resolve));
    const giveUp = setTimeout(() => {
      failed = true;
      done();
    }, AD_GIVE_UP_MS);
    const handles: Array<{ remove(): Promise<void> }> = [];
    const fail = () => {
      failed = true;
      done();
    };
    try {
      // Listen before showing, so a fast close is never missed.
      const listen = async (event: string, fn: () => void) => {
        handles.push(await ads.addListener(event, fn));
      };
      await listen(`${prefix}Dismissed`, () => done());
      await listen(`${prefix}FailedToShow`, fail);
      if (kind === 'reward') await listen('onRewardedVideoAdReward', () => (earned = true));
      this.hooks.pause(true);
      if (kind === 'interstitial') await ads.showInterstitial();
      // This promise only settles when the reward is earned, so do not wait for it.
      else void ads.showRewardVideoAd().then(() => (earned = true), fail);
      await closed;
      if (kind === 'interstitial') return failed ? 'none' : 'watched';
      if (!earned && !failed) await new Promise((r) => setTimeout(r, REWARD_GRACE_MS));
      return earned ? 'watched' : failed ? 'none' : 'closed';
    } catch {
      return 'none';
    } finally {
      clearTimeout(giveUp);
      this.hooks.pause(false);
      for (const h of handles) void h.remove().catch(() => undefined);
      void this.prepare();
    }
  }

  protected async showBreak(): Promise<void> {
    await this.fullScreen('interstitial');
  }

  /**
   * The reward is given when the ad was watched, and also when there is no ad to show (consent
   * refused, offline, no fill): a hint must never depend on saying yes to ads. Only closing the ad
   * early gives no reward.
   */
  protected async showRewarded(): Promise<boolean> {
    return (await this.fullScreen('reward')) !== 'closed';
  }
}

/** The plugin code is only bundled into the app build (`--mode app`); other builds never load it. */
const loadAdMob = (): Promise<AdMobApi | undefined> =>
  typeof __PLATFORM__ === 'string' && __PLATFORM__ === 'app' ? import('@capacitor-community/admob').then((m) => m.AdMob as unknown as AdMobApi) : Promise.resolve(undefined);

export function createPlatform(name: PlatformName, hooks: AdHooks, win: Record<string, unknown> = globalThis as unknown as Record<string, unknown>): Platform {
  if (name === 'crazygames') return new CrazyGamesPlatform(hooks, () => (win.CrazyGames as { SDK?: CrazySdk } | undefined)?.SDK);
  if (name === 'app') {
    const os = (win.Capacitor as { getPlatform?(): string } | undefined)?.getPlatform?.() === 'ios' ? 'ios' : 'android';
    return new AdMobPlatform(hooks, loadAdMob, os);
  }
  if (name === 'poki') return new PokiPlatform(hooks, () => win.PokiSDK as PokiSdk | undefined);
  return new LocalPlatform(hooks);
}

/** Set in main.ts once the audio exists (keeps this file free of game imports for tests). */
let pauseHook: (paused: boolean) => void = () => {};
export const setAdPauseHook = (fn: (paused: boolean) => void): void => {
  pauseHook = fn;
};

export const platform: Platform = createPlatform(platformName(typeof __PLATFORM__ === 'string' ? __PLATFORM__ : undefined), {
  pause: (p) => pauseHook(p),
  now: () => Date.now(),
});
