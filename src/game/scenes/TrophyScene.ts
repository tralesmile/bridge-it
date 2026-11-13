import { onBack } from '../back';
import Phaser from 'phaser';
import { ACHIEVEMENTS } from '../../core/achievements';
import { addBackground } from '../background';
import { save } from '../save';
import { C, FONT, GAME_W, hex } from '../theme';
import { button, label, panel } from '../ui';

// 6 columns once there are more than 25 achievements (5 rows fit the panel).
const COLS = ACHIEVEMENTS.length > 25 ? 6 : 5;
const CARD_W = COLS === 6 ? 196 : 228;
const CARD_H = 100;
const GAP = 8;

/** Achievements list: earned ones in gold, others grey with progress. */
export class TrophyScene extends Phaser.Scene {
  constructor() {
    super('trophies');
  }

  create(): void {
    addBackground(this);
    panel(this, GAME_W / 2, 400, 1240, 600);
    button(this, 110, 60, '◀ Back', () => this.scene.start('menu'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });
    onBack(this, () => this.scene.start('menu'));
    label(this, GAME_W / 2, 60, 'Achievements', 52, C.white).setStroke(C.ink, 10);
    const earned = new Set(save.data.achievements);
    label(this, GAME_W - 130, 60, `🏆 ${earned.size} / ${ACHIEVEMENTS.length}`, 30, C.white).setStroke(C.ink, 8);

    const input = save.achievementInput;
    const total = COLS * CARD_W + (COLS - 1) * GAP;
    ACHIEVEMENTS.forEach((a, i) => {
      const x = GAME_W / 2 - total / 2 + CARD_W / 2 + (i % COLS) * (CARD_W + GAP);
      const y = 160 + Math.floor(i / COLS) * (CARD_H + GAP);
      const done = earned.has(a.id);
      const g = this.add.graphics({ x, y });
      g.fillStyle(hex(done ? C.gold : C.white), 1);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
      const title = label(this, x, y - 32, `${done ? '🏆' : '🔒'} ${a.name}`, COLS === 6 ? 19 : 21, done ? C.ink : C.greyDark);
      // Long names shrink to fit inside the card.
      if (title.width > CARD_W - 16) title.setScale((CARD_W - 16) / title.width);
      this.add
        .text(x, y + 2, a.text, { fontFamily: FONT, fontSize: COLS === 6 ? '16px' : '17px', color: done ? C.ink : C.greyDark, align: 'center', wordWrap: { width: CARD_W - 20 } })
        .setOrigin(0.5);
      if (!done) {
        const [have, need] = a.progress(input);
        if (need > 1) {
          // Progress bar with the count beside it.
          const w = CARD_W - 100;
          const left = -CARD_W / 2 + 16;
          g.fillStyle(0xe4e0ea, 1);
          g.fillRoundedRect(left, 32, w, 10, 5);
          g.fillStyle(hex(C.good), 1);
          if (have > 0) g.fillRoundedRect(left, 32, Math.max(10, (w * have) / need), 10, 5);
          label(this, x + CARD_W / 2 - 44, y + 37, `${have}/${need}`, 15, C.greyDark);
        }
      }
    });
  }
}
