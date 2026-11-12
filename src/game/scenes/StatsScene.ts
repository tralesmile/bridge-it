import { onBack } from '../back';
import Phaser from 'phaser';
import { ACHIEVEMENTS } from '../../core/achievements';
import { ALL_LEVELS, WORLDS } from '../../core/levels';
import { statRows } from '../../core/stats';
import { addBackground } from '../background';
import { save } from '../save';
import { C, GAME_W, hex } from '../theme';
import { button, label, panel } from '../ui';

const ROW_H = 54;
const COL_W = 560;

/** Stats screen: two columns of label and value. */
export class StatsScene extends Phaser.Scene {
  constructor() {
    super('stats');
  }

  create(): void {
    addBackground(this);
    panel(this, GAME_W / 2, 400, 1240, 600);
    button(this, 110, 60, '◀ Back', () => this.scene.start('menu'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });
    onBack(this, () => this.scene.start('menu'));
    label(this, GAME_W / 2, 60, 'Stats', 52, C.white).setStroke(C.ink, 10);

    const d = save.data;
    const rows = statRows({
      stars: d.stars,
      bestCost: d.bestCost,
      stats: d.stats,
      coins: d.coins,
      achievements: d.achievements.length,
      achievementsTotal: ACHIEVEMENTS.length,
      dailyStreak: d.daily.streak,
      dailyBest: d.daily.best,
      levels: ALL_LEVELS,
      worlds: WORLDS,
    });
    const perCol = Math.ceil(rows.length / 2);
    rows.forEach((r, i) => {
      const col = Math.floor(i / perCol);
      const x = GAME_W / 2 + (col === 0 ? -COL_W / 2 - 20 : COL_W / 2 + 20);
      const y = 170 + (i % perCol) * ROW_H;
      const g = this.add.graphics({ x, y });
      g.fillStyle(hex(i % 2 === 0 ? C.white : '#f1edf6'), 1);
      g.fillRoundedRect(-COL_W / 2, -ROW_H / 2 + 4, COL_W, ROW_H - 8, 12);
      label(this, x - COL_W / 2 + 24, y, r.label, 24, C.greyDark).setOrigin(0, 0.5);
      label(this, x + COL_W / 2 - 24, y, r.value, 26, C.ink).setOrigin(1, 0.5);
    });
  }
}
