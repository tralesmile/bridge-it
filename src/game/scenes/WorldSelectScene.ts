import Phaser from 'phaser';
import { ALL_LEVELS, WORLDS } from '../../core/levels';
import { isUnlocked } from '../../core/scoring';
import { addBackground } from '../background';
import { save } from '../save';
import { C, GAME_W } from '../theme';
import { button, label, panel } from '../ui';

/** Worlds that are planned but have no levels yet. Shown as "Coming soon". */
const COMING_SOON = ['Candy Mountain'];

export class WorldSelectScene extends Phaser.Scene {
  constructor() {
    super('worlds');
  }

  create(): void {
    addBackground(this);
    panel(this, GAME_W / 2, 395, 1000, 580);
    label(this, GAME_W / 2, 160, 'Choose a world', 48, C.ink);
    button(this, 110, 60, '◀ Back', () => this.scene.start('menu'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });

    const ids = ALL_LEVELS.map((l) => l.id);
    const total = WORLDS.length + COMING_SOON.length;
    const cardW = 210;
    const gap = 30;
    const startX = GAME_W / 2 - ((total - 1) * (cardW + gap)) / 2;

    WORLDS.forEach((world, i) => {
      const x = startX + i * (cardW + gap);
      const open = world.levels.length > 0 && isUnlocked(ids, save.data.stars, world.levels[0].id);
      const b = button(this, x, 350, open ? world.name : '🔒', () => this.scene.start('levels', { world: world.id }), {
        width: cardW,
        height: 190,
        fontSize: open ? 30 : 56,
        color: open ? C.primary : C.grey,
        shade: open ? C.primaryDark : C.greyDark,
      });
      b.setEnabled(open);
      const got = world.levels.reduce((n, l) => n + (save.data.stars[l.id] ?? 0), 0);
      if (open) {
        label(this, x, 475, `★ ${got} / ${world.levels.length * 3}`, 26, C.ink);
      } else {
        const prev = WORLDS[i - 1];
        label(this, x, 475, world.name, 22, C.ink);
        label(this, x, 505, prev ? `Finish ${prev.name}` : 'Locked', 18, C.ink);
      }
    });

    COMING_SOON.forEach((name, j) => {
      const x = startX + (WORLDS.length + j) * (cardW + gap);
      const b = button(this, x, 350, '🔒', () => undefined, { width: cardW, height: 190, fontSize: 56, color: C.grey, shade: C.greyDark });
      b.setEnabled(false);
      label(this, x, 475, name, 22, C.ink);
      label(this, x, 505, 'Coming soon', 18, C.ink);
    });
  }
}
