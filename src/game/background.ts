import Phaser from 'phaser';
import { save } from './save';
import { GAME_H, GAME_W } from './theme';

/** The shared animated backdrop: sky, sun, drifting clouds and two parallax hill layers. */
export function addBackground(scene: Phaser.Scene): void {
  scene.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(GAME_W, GAME_H).setScrollFactor(0);
  const sun = scene.add.image(1040, 130, 'sun').setScale(1.4).setScrollFactor(0);
  const still = save.data.settings.reducedMotion;
  if (!still) scene.tweens.add({ targets: sun, scale: 1.5, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  for (let i = 0; i < 5; i++) {
    const cloud = scene.add.image(i * 300 + 80, 70 + (i % 3) * 55, 'cloud').setScale(0.6 + (i % 2) * 0.35).setAlpha(0.9).setScrollFactor(0);
    if (!still) scene.tweens.add({
      targets: cloud,
      x: cloud.x + GAME_W + 300,
      duration: 90000 + i * 15000,
      repeat: -1,
      onRepeat: () => (cloud.x = -200),
    });
  }
  scene.add.tileSprite(0, GAME_H - 400, GAME_W, 320, 'hills-far').setOrigin(0).setScrollFactor(0).setAlpha(0.9);
  scene.add.tileSprite(0, GAME_H - 330, GAME_W, 320, 'hills-near').setOrigin(0).setScrollFactor(0);
}
