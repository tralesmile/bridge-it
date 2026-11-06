import Phaser from 'phaser';
import { makeTextures } from '../art';
import { sfx } from '../audio';
import { platform } from '../platform';

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
    // Wait (at most 2 s) for the bundled font, so the first screen never flashes a fallback font.
    const fontReady = Promise.race([
      Promise.all([document.fonts.load('700 24px Fredoka'), document.fonts.load('400 24px Fredoka')]),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]).catch(() => undefined);
    void Promise.all([platform.init(), fontReady]).finally(() => this.scene.start('menu'));
  }
}
