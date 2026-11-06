/**
 * One interface for every place the game runs (own website, Poki, CrazyGames, Android, iOS).
 * The game only talks to this, so adding a portal SDK never touches game code.
 */
export interface Platform {
  readonly name: string;
  init(): Promise<void>;
  /** Tell the portal real play started or stopped (portals use this for ad timing). */
  gameplayStart(): void;
  gameplayStop(): void;
  /** Shows a rewarded ad. Resolves true only if the player earned the reward. */
  rewardedAd(): Promise<boolean>;
  /** A break between levels. Resolves when the game may continue. */
  commercialBreak(): Promise<void>;
}

/** Used on our own website and in development: no ads, rewards are free. */
class LocalPlatform implements Platform {
  readonly name = 'local';
  async init(): Promise<void> {}
  gameplayStart(): void {}
  gameplayStop(): void {}
  async rewardedAd(): Promise<boolean> {
    return true;
  }
  async commercialBreak(): Promise<void> {}
}

export const platform: Platform = new LocalPlatform();
