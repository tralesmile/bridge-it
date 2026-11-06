import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { LevelSelectScene } from "./game/scenes/LevelSelectScene";
import { MenuScene } from "./game/scenes/MenuScene";
import { PlayScene } from "./game/scenes/PlayScene";
import { C, GAME_H, GAME_W } from "./game/theme";

async function loadFonts(): Promise<void> {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 24px "Fredoka"'),
        document.fonts.load('bold 24px "Fredoka"'),
      ]),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch {
    // Fallback fonts are fine.
  }
}

void loadFonts().then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: GAME_W,
    height: GAME_H,
    backgroundColor: C.skyTop,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    render: { antialias: true, roundPixels: false },
    scene: [BootScene, MenuScene, LevelSelectScene, PlayScene],
  });

  // Exposed for automated browser tests only.
  (globalThis as unknown as { __bridgeit?: Phaser.Game }).__bridgeit = game;
});
