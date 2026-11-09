import Phaser from 'phaser';
import { ALL_LEVELS, WORLDS } from '../../core/levels';
import { isUnlocked } from '../../core/scoring';
import { addBackground } from '../background';
import { save } from '../save';
import { C, GAME_W } from '../theme';
import { button, label, panel } from '../ui';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('levels');
  }

  create(data: { world?: number }): void {
    addBackground(this, data.world ?? 1);
    const world = WORLDS.find((w) => w.id === data.world) ?? WORLDS[0];
    panel(this, GAME_W / 2, 395, 1000, 580);
    label(this, GAME_W / 2, 160, world.name, 48, C.ink);
    button(this, 110, 60, '◀ Back', () => this.scene.start('worlds'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });

    const ids = ALL_LEVELS.map((l) => l.id);
    const cols = 5;
    world.levels.forEach((level, i) => {
      const x = GAME_W / 2 - 380 + (i % cols) * 190;
      const y = 265 + Math.floor(i / cols) * 155;
      const open = isUnlocked(ids, save.data.stars, level.id);
      const b = button(this, x, y, open ? `${level.index}` : '🔒', () => this.scene.start('play', { levelId: level.id }), {
        width: 130,
        height: 90,
        fontSize: 46,
        color: open ? C.primary : C.grey,
        shade: open ? C.primaryDark : C.greyDark,
      });
      b.setEnabled(open);
      label(this, x, y + 62, level.name, 18, C.ink);
      const stars = save.data.stars[level.id] ?? 0;
      for (let s = 0; s < 3; s++) this.add.image(x - 30 + s * 30, y - 60, s < stars ? 'star' : 'star-empty').setScale(0.4);
    });
  }
}
