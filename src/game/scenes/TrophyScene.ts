import { onBack } from '../back';
import Phaser from 'phaser';
import { ACHIEVEMENTS, TROPHY_PAGE, pageItems } from '../../core/achievements';
import { addBackground } from '../background';
import { save } from '../save';
import { sfx } from '../audio';
import { C, FONT, GAME_W, hex } from '../theme';
import { button, label, panel, type Button } from '../ui';

// 6 columns and 5 rows a page; more achievements go on the next page.
const COLS = 6;
const CARD_W = 196;
const CARD_H = 100;
const GAP = 8;

/** Achievements list: earned ones in gold, others grey with progress. Pages of 30. */
export class TrophyScene extends Phaser.Scene {
  private page = 0;
  /** Cards a page; only e2e passes a smaller number, to see the page buttons. */
  private perPage = TROPHY_PAGE;
  private cards?: Phaser.GameObjects.Container;
  private pageText?: Phaser.GameObjects.Text;
  private prevBtn?: Button;
  private nextBtn?: Button;

  constructor() {
    super('trophies');
  }

  init(data: { page?: number; perPage?: number } = {}): void {
    this.page = data.page ?? 0;
    this.perPage = data.perPage ?? TROPHY_PAGE;
    // Phaser keeps start data for the next start without data, so clear it.
    this.sys.settings.data = {};
  }

  create(): void {
    addBackground(this);
    panel(this, GAME_W / 2, 400, 1240, 600);
    button(this, 110, 60, '◀ Back', () => this.scene.start('menu'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });
    onBack(this, () => this.scene.start('menu'));
    label(this, GAME_W / 2, 60, 'Achievements', 52, C.white).setStroke(C.ink, 10);
    const earned = new Set(save.data.achievements);
    label(this, GAME_W - 130, 60, `🏆 ${earned.size} / ${ACHIEVEMENTS.length}`, 30, C.white).setStroke(C.ink, 8);

    const { pages } = pageItems(ACHIEVEMENTS, 0, this.perPage);
    if (pages > 1) {
      const btn = { width: 64, height: 48, fontSize: 24, color: C.blue, shade: C.blueDark };
      this.prevBtn = button(this, GAME_W / 2 - 120, 670, '◀', () => this.turn(-1), btn).setName('trophy-prev');
      this.nextBtn = button(this, GAME_W / 2 + 120, 670, '▶', () => this.turn(1), btn).setName('trophy-next');
      this.pageText = label(this, GAME_W / 2, 670, '', 24, C.greyDark);
      this.input.keyboard?.on('keydown-LEFT', () => this.turn(-1));
      this.input.keyboard?.on('keydown-RIGHT', () => this.turn(1));
    }
    this.showPage();
  }

  private turn(step: number): void {
    const { page, pages } = pageItems(ACHIEVEMENTS, this.page + step, this.perPage);
    if (page === this.page || pages < 2) return;
    this.page = page;
    sfx.place(0);
    this.showPage();
  }

  private showPage(): void {
    this.cards?.destroy();
    const layer = this.add.container(0, 0);
    this.cards = layer;
    const { page, pages, items } = pageItems(ACHIEVEMENTS, this.page, this.perPage);
    this.page = page;
    this.pageText?.setText(`Page ${page + 1} / ${pages}`);
    this.prevBtn?.setEnabled(page > 0);
    this.nextBtn?.setEnabled(page < pages - 1);

    const earned = new Set(save.data.achievements);
    const input = save.achievementInput;
    const total = COLS * CARD_W + (COLS - 1) * GAP;
    items.forEach((a, i) => {
      const x = GAME_W / 2 - total / 2 + CARD_W / 2 + (i % COLS) * (CARD_W + GAP);
      const y = 160 + Math.floor(i / COLS) * (CARD_H + GAP);
      const done = earned.has(a.id);
      const g = this.add.graphics({ x, y });
      g.fillStyle(hex(done ? C.gold : C.white), 1);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
      const title = label(this, x, y - 32, `${done ? '🏆' : '🔒'} ${a.name}`, 19, done ? C.ink : C.greyDark);
      // Long names shrink to fit inside the card.
      if (title.width > CARD_W - 16) title.setScale((CARD_W - 16) / title.width);
      const text = this.add
        .text(x, y + 2, a.text, { fontFamily: FONT, fontSize: '16px', color: done ? C.ink : C.greyDark, align: 'center', wordWrap: { width: CARD_W - 20 } })
        .setOrigin(0.5);
      layer.add([g, title, text]);
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
          layer.add(label(this, x + CARD_W / 2 - 44, y + 37, `${have}/${need}`, 15, C.greyDark));
        }
      }
    });
  }
}
