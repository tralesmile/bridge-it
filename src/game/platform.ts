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
  protected readonly clock: AdClock;

  constructor(protected readonly hooks: AdHooks) {
    this.clock = { start: hooks.now(), lastBreak: null };
  }

  async init(): Promise<void> {}
  loadingDone(): void {}
  protected sdkStart(): void {}
  protected sdkStop(): void {}
  protected abstract showBreak(): Promise<void>;
  abstract rewardedAd(): Promise<boolean>;

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
    if (!breakAllowed(this.clock, this.hooks.now())) return;
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
  async rewardedAd(): Promise<boolean> {
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

  async rewardedAd(): Promise<boolean> {
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

  async rewardedAd(): Promise<boolean> {
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

export function createPlatform(name: PlatformName, hooks: AdHooks, win: Record<string, unknown> = globalThis as unknown as Record<string, unknown>): Platform {
  if (name === 'crazygames') return new CrazyGamesPlatform(hooks, () => (win.CrazyGames as { SDK?: CrazySdk } | undefined)?.SDK);
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
