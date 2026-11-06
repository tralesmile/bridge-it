import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { LevelSelectScene } from './game/scenes/LevelSelectScene';
import { MenuScene } from './game/scenes/MenuScene';
import { PlayScene } from './game/scenes/PlayScene';
import { C, GAME_H, GAME_W } from './game/theme';

async function start(): Promise<Phaser.Game> {
  // Load the bundled font first, so canvas text never flashes in a fallback font.
  try {
    await Promise.race([
      Promise.all([document.fonts.load('400 24px "Fredoka"'), document.fonts.load('700 24px "Fredoka"')]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    // Fallback fonts from the theme are used.
  }
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: C.skyTop,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    render: { antialias: true, roundPixels: false },
    scene: [BootScene, MenuScene, LevelSelectScene, PlayScene],
  });
}

void start().then((game) => {
  // Exposed for automated browser tests only.
  (globalThis as unknown as { __bridgeit?: Phaser.Game }).__bridgeit = game;
});
