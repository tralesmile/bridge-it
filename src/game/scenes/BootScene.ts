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
    void platform.init().finally(() => this.scene.start('menu'));
  }
}
