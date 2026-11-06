import Phaser from 'phaser';
import { WORLDS } from '../../core/levels';
import { isUnlocked } from '../../core/scoring';
import { addBackground } from '../background';
import { save } from '../save';
import { C, GAME_W } from '../theme';
import { button, label, panel } from '../ui';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('levels');
  }

  create(): void {
    addBackground(this);
    const world = WORLDS[0];
    panel(this, GAME_W / 2, 390, 1000, 560);
    label(this, GAME_W / 2, 160, world.name, 48, C.ink);
    button(this, 110, 60, '◀ Back', () => this.scene.start('menu'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });

    const ids = world.levels.map((l) => l.id);
    const cols = 4;
    world.levels.forEach((level, i) => {
      const x = GAME_W / 2 - 330 + (i % cols) * 220;
      const y = 280 + Math.floor(i / cols) * 200;
      const open = isUnlocked(ids, save.data.stars, level.id);
      const b = button(this, x, y, open ? `${level.index}` : '🔒', () => this.scene.start('play', { levelId: level.id }), {
        width: 150,
        height: 110,
        fontSize: 52,
        color: open ? C.primary : C.grey,
        shade: open ? C.primaryDark : C.greyDark,
      });
      b.setEnabled(open);
      label(this, x, y + 78, level.name, 18, C.ink);
      const stars = save.data.stars[level.id] ?? 0;
      for (let s = 0; s < 3; s++) this.add.image(x - 36 + s * 36, y - 74, s < stars ? 'star' : 'star-empty').setScale(0.45);
    });
  }
}
