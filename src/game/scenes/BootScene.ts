import Phaser from 'phaser';
import { makeTextures } from '../art';
import { sfx } from '../audio';
import { platform, setAdPauseHook } from '../platform';
import { save } from '../save';
import { store } from '../store';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    makeTextures(this);
    // Pause sound when the tab or app is hidden; resume when it comes back.
    this.game.events.on(Phaser.Core.Events.HIDDEN, () => sfx.setPaused(true));
    this.game.events.on(Phaser.Core.Events.VISIBLE, () => sfx.setPaused(false));
    this.input.once('pointerdown', () => sfx.unlock());
    // Ads must play in silence.
    setAdPauseHook((paused) => sfx.setPaused(paused || document.hidden));
    // Purchases: the saved state first (works offline), then the store's answer when it comes.
    platform.setNoAds(save.data.purchases.noAds);
    store.onChange((owned) => {
      save.applyPurchases(owned);
      platform.setNoAds(owned.noAds);
    });
    void platform.init().finally(() => {
      void store.init();
      this.scene.start('menu');
      platform.loadingDone();
      const el = document.getElementById('loading');
      if (el) {
        el.classList.add('done');
        setTimeout(() => el.remove(), 400);
      }
    });
  }
}
