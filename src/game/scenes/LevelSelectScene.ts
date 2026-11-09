import Phaser from 'phaser';
import { ALL_LEVELS, WORLDS } from '../../core/levels';
import { LEVELS_PER_PAGE, isUnlocked, pageCount, pageOfIndex } from '../../core/scoring';
import { addBackground } from '../background';
import { save } from '../save';
import { C, GAME_W } from '../theme';
import { button, label, panel } from '../ui';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('levels');
  }

  create(data: { world?: number; page?: number }): void {
    addBackground(this, data.world ?? 1);
    const world = WORLDS.find((w) => w.id === data.world) ?? WORLDS[0];
    panel(this, GAME_W / 2, 395, 1000, 580);
    label(this, GAME_W / 2, 160, world.name, 48, C.ink);
    button(this, 110, 60, '◀ Back', () => this.scene.start('worlds'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });

    const ids = ALL_LEVELS.map((l) => l.id);
    const cols = 5;
    const pages = pageCount(world.levels.length);
    let page = data.page;
    if (page === undefined) {
      // Open on the page of the first level without a star.
      const next = world.levels.findIndex((l) => !(save.data.stars[l.id] ?? 0));
      page = pageOfIndex(next < 0 ? world.levels.length - 1 : next);
    }
    page = Math.min(Math.max(0, page), pages - 1);
    if (pages > 1) {
      const go = (p: number) => () => this.scene.restart({ world: world.id, page: p });
      label(this, GAME_W - 200, 60, `Page ${page + 1} / ${pages}`, 24, C.ink);
      const opt = { width: 80, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark };
      if (page > 0) button(this, GAME_W - 340, 60, '◀', go(page - 1), opt);
      if (page < pages - 1) button(this, GAME_W - 60, 60, '▶', go(page + 1), opt);
    }
    const first = page * LEVELS_PER_PAGE;
    world.levels.slice(first, first + LEVELS_PER_PAGE).forEach((level, k) => {
      const i = k;
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
