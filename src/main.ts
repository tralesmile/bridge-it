import '@fontsource-variable/fredoka/wght.css';
import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { LevelSelectScene } from './game/scenes/LevelSelectScene';
import { WorldSelectScene } from './game/scenes/WorldSelectScene';
import { MenuScene } from './game/scenes/MenuScene';
import { PlayScene } from './game/scenes/PlayScene';
import { ShopScene } from './game/scenes/ShopScene';
import { DailyScene } from './game/scenes/DailyScene';
import { StatsScene } from './game/scenes/StatsScene';
import { TrophyScene } from './game/scenes/TrophyScene';
import { C, GAME_H, GAME_W } from './game/theme';

async function loadFont(): Promise<void> {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('700 24px "Fredoka Variable"'), document.fonts.load('400 24px "Fredoka Variable"')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

function start(): void {
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: C.skyTop,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, MenuScene, WorldSelectScene, LevelSelectScene, PlayScene, ShopScene, TrophyScene, StatsScene, DailyScene],
});

// Exposed for automated browser tests only.
(globalThis as unknown as { __bridgeit?: Phaser.Game }).__bridgeit = game;
}

void loadFont().then(start);
