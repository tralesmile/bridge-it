import Phaser from 'phaser';
import { ALL_LEVELS, WORLDS } from '../../core/levels';
import { isUnlocked } from '../../core/scoring';
import { addBackground } from '../background';
import { save } from '../save';
import { C, GAME_W, WORLD_BACKGROUNDS, hex } from '../theme';
import { button, label, panel } from '../ui';

/** Worlds that are planned but have no levels yet. Shown as "Coming soon". */
const COMING_SOON = ['Candy Mountain'];

/** Card colours per world (index = world id - 1). */
const CARD_COLORS: [string, string][] = [
  ['#4fa843', '#337a2b'],
  ['#e0843f', '#ad5a22'],
  ['#2f8fc9', '#1d6594'],
  ['#6b7fc4', '#4a5b99'],
  ['#e85d9c', '#b03b72'],
];

/** A small picture of the world, drawn in code, centred on (0, 0) and about w by h pixels. */
export function drawWorldIcon(g: Phaser.GameObjects.Graphics, world: number, w: number, h: number): void {
  const bg = WORLD_BACKGROUNDS[world - 1] ?? WORLD_BACKGROUNDS[0];
  const x0 = -w / 2;
  const y0 = -h / 2;
  g.fillStyle(hex(C.ink), 0.35);
  g.fillRoundedRect(x0 - 3, y0 - 3, w + 6, h + 6, 12);
  g.fillStyle(hex(bg.skyTop), 1);
  g.fillRoundedRect(x0, y0, w, h, 10);
  g.fillStyle(hex(bg.skyBottom), 1);
  g.fillRect(x0, y0 + h * 0.45, w, h * 0.3);
  const ground = y0 + h * 0.72;
  const bottom = y0 + h;
  /** Ground or water from y to the bottom, with the window's round bottom corners. */
  const floor = (color: number, y: number): void => {
    g.fillStyle(color, 1);
    g.fillRoundedRect(x0, y, w, bottom - y, { tl: 0, tr: 0, bl: 10, br: 10 });
  };
  if (world === 1) {
    // Farm: green hills and a red barn.
    g.fillStyle(hex(bg.hillNear), 1);
    g.fillEllipse(-w * 0.18, ground, w * 0.62, h * 0.36);
    g.fillEllipse(w * 0.22, ground + 2, w * 0.54, h * 0.3);
    floor(hex(bg.hillNear), ground);
    g.fillStyle(0xd94b3b, 1);
    g.fillRect(w * 0.05, ground - 22, 30, 22);
    g.fillTriangle(w * 0.05 - 4, ground - 22, w * 0.05 + 34, ground - 22, w * 0.05 + 15, ground - 36);
    g.fillStyle(0xffffff, 1);
    g.fillRect(w * 0.05 + 11, ground - 12, 8, 12);
  } else if (world === 2) {
    // Canyon: two mesas and a rail bridge between them.
    g.fillStyle(hex(bg.hillNear), 1);
    g.fillRoundedRect(x0, ground - 14, w * 0.32, bottom - ground + 14, { tl: 0, tr: 0, bl: 10, br: 0 });
    g.fillRoundedRect(w * 0.18, ground - 14, w * 0.32, bottom - ground + 14, { tl: 0, tr: 0, bl: 0, br: 10 });
    g.fillStyle(hex(bg.hillFar), 1);
    g.fillRect(x0 + 6, ground - 14, w * 0.32 - 12, 5);
    g.lineStyle(3, hex(C.ink), 1);
    g.lineBetween(x0 + w * 0.32, ground - 14, w * 0.18, ground - 14);
    for (let x = x0 + w * 0.32; x < w * 0.18; x += 8) g.lineBetween(x, ground - 14, x + 4, ground - 4);
  } else if (world === 3) {
    // Pirate Bay: sea and a ship with a sail.
    floor(hex(C.water), ground);
    g.fillStyle(hex(C.waterLight), 1);
    for (let x = x0 + 6; x < w / 2; x += 18) g.fillEllipse(x, ground + 2, 12, 4);
    g.fillStyle(0x7a4a2a, 1);
    g.fillTriangle(-24, ground - 6, 24, ground - 6, 14, ground + 6);
    g.fillRect(-24, ground - 6, 38, 12);
    g.fillStyle(hex(C.ink), 1);
    g.fillRect(-2, ground - 40, 3, 34);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(2, ground - 38, 2, ground - 10, 22, ground - 12);
  } else if (world === 4) {
    // River Town: water, banks, and a drawbridge leaf swinging up.
    floor(hex(C.water), ground);
    g.fillStyle(hex(bg.hillNear), 1);
    g.fillRoundedRect(x0, ground - 6, w * 0.28, bottom - ground + 6, { tl: 0, tr: 0, bl: 10, br: 0 });
    g.fillRoundedRect(w * 0.22, ground - 6, w * 0.28, bottom - ground + 6, { tl: 0, tr: 0, bl: 0, br: 10 });
    g.lineStyle(6, hex(C.road), 1);
    g.lineBetween(x0 + w * 0.28, ground - 6, x0 + w * 0.28 + 20, ground - 30);
    g.lineBetween(w * 0.22, ground - 6, w * 0.22 - 20, ground - 30);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(-2, ground - 2, -2, ground - 24, 12, ground - 4);
  } else {
    // Candy Mountain: pink hills with a lollipop.
    g.fillStyle(0xf7a8cf, 1);
    g.fillEllipse(0, ground + 4, w * 0.9, h * 0.4);
    floor(0xf7a8cf, ground + 6);
    g.lineStyle(3, 0xffffff, 1);
    g.lineBetween(w * 0.2, ground - 4, w * 0.2, ground - 26);
    g.fillStyle(0xe85d9c, 1);
    g.fillCircle(w * 0.2, ground - 32, 9);
  }
}

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
    // Cards share the panel width (5 cards fit at 170 px).
    const gap = 20;
    const cardW = Math.min(210, Math.floor((940 - (total - 1) * gap) / total));
    const startX = GAME_W / 2 - ((total - 1) * (cardW + gap)) / 2;

    WORLDS.forEach((world, i) => {
      const x = startX + i * (cardW + gap);
      const open = world.levels.length > 0 && isUnlocked(ids, save.data.stars, world.levels[0].id);
      // Two-word names go on two lines so they fit a narrow card.
      const [color, shade] = CARD_COLORS[i] ?? [C.primary, C.primaryDark];
      const b = button(this, x, 350, open ? world.name.replace(' ', '\n') : '🔒', () => this.scene.start('levels', { world: world.id }), {
        width: cardW,
        height: 190,
        fontSize: open ? 28 : 56,
        color: open ? color : C.grey,
        shade: open ? shade : C.greyDark,
        textOffsetY: open ? 42 : 0,
      });
      if (open) {
        const icon = this.add.graphics({ x: 0, y: -42 });
        drawWorldIcon(icon, world.id, cardW - 28, 84);
        // Under the label (index 2) so the button still draws its pressed state on top of the base.
        b.addAt(icon, 2);
      }
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
