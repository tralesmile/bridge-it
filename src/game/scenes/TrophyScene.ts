import Phaser from 'phaser';
import { ACHIEVEMENTS } from '../../core/achievements';
import { ALL_LEVELS } from '../../core/levels';
import { addBackground } from '../background';
import { save } from '../save';
import { C, FONT, GAME_W, hex } from '../theme';
import { button, label, panel } from '../ui';

const COLS = 5;
const CARD_W = 228;
const CARD_H = 118;
const GAP = 10;

/** Achievements list: earned ones in gold, others grey with progress. */
export class TrophyScene extends Phaser.Scene {
  constructor() {
    super('trophies');
  }

  create(): void {
    addBackground(this);
    panel(this, GAME_W / 2, 400, 1240, 600);
    button(this, 110, 60, '◀ Back', () => this.scene.start('menu'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });
    label(this, GAME_W / 2, 60, 'Achievements', 52, C.white).setStroke(C.ink, 10);
    const earned = new Set(save.data.achievements);
    label(this, GAME_W - 130, 60, `🏆 ${earned.size} / ${ACHIEVEMENTS.length}`, 30, C.white).setStroke(C.ink, 8);

    const input = { stars: save.data.stars, bestCost: save.data.bestCost, owned: save.data.owned, stats: save.data.stats, levels: ALL_LEVELS };
    const total = COLS * CARD_W + (COLS - 1) * GAP;
    ACHIEVEMENTS.forEach((a, i) => {
      const x = GAME_W / 2 - total / 2 + CARD_W / 2 + (i % COLS) * (CARD_W + GAP);
      const y = 185 + Math.floor(i / COLS) * (CARD_H + GAP);
      const done = earned.has(a.id);
      const g = this.add.graphics({ x, y });
      g.fillStyle(hex(done ? C.gold : C.white), 1);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
      label(this, x, y - 36, `${done ? '🏆' : '🔒'} ${a.name}`, 21, done ? C.ink : C.greyDark);
      this.add
        .text(x, y + 2, a.text, { fontFamily: FONT, fontSize: '17px', color: done ? C.ink : C.greyDark, align: 'center', wordWrap: { width: CARD_W - 20 } })
        .setOrigin(0.5);
      if (!done) {
        const [have, need] = a.progress(input);
        if (need > 1) {
          // Progress bar with the count beside it.
          const w = CARD_W - 100;
          const left = -CARD_W / 2 + 16;
          g.fillStyle(0xe4e0ea, 1);
          g.fillRoundedRect(left, 36, w, 12, 6);
          g.fillStyle(hex(C.good), 1);
          if (have > 0) g.fillRoundedRect(left, 36, Math.max(12, (w * have) / need), 12, 6);
          label(this, x + CARD_W / 2 - 44, y + 42, `${have}/${need}`, 15, C.greyDark);
        }
      }
    });
  }
}
