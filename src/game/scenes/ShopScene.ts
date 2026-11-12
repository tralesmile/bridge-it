import { onBack } from '../back';
import Phaser from 'phaser';
import { SHOP_ITEMS, equipped, isOwned, type ShopItem } from '../../core/shop';
import { sfx } from '../audio';
import { addBackground } from '../background';
import { save } from '../save';
import { C, GAME_W, hex } from '../theme';
import { announceAchievements, button, label, panel } from '../ui';

const CARD_W = 136;
const CARD_H = 150;
const GAP = 14;

/** Coin shop: paint jobs for the vehicles, road colours and wood and steel colours. Cosmetic only. */
export class ShopScene extends Phaser.Scene {
  private toast?: Phaser.GameObjects.Text;

  constructor() {
    super('shop');
  }

  create(): void {
    addBackground(this);
    panel(this, GAME_W / 2, 400, 1240, 600);
    button(this, 110, 60, '◀ Back', () => this.scene.start('menu'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });
    onBack(this, () => this.scene.start('menu'));
    label(this, GAME_W / 2, 60, 'Shop', 52, C.white).setStroke(C.ink, 10);
    this.add.image(GAME_W - 190, 60, 'coin').setScale(1.1);
    label(this, GAME_W - 165, 60, `${save.data.coins}`, 34, C.white).setOrigin(0, 0.5).setStroke(C.ink, 8);

    label(this, GAME_W / 2, 118, 'Paint for your car, truck and train', 24, C.ink);
    this.row(SHOP_ITEMS.filter((i) => i.kind === 'paint'), 212);
    label(this, GAME_W / 2, 307, 'Road colour', 24, C.ink);
    this.row(SHOP_ITEMS.filter((i) => i.kind === 'deck'), 401);
    label(this, GAME_W / 2, 496, 'Wood and steel colour', 24, C.ink);
    this.row(SHOP_ITEMS.filter((i) => i.kind === 'frame'), 590);
    label(this, GAME_W / 2, 684, 'Earn coins with new stars. Looks only: the bridge works the same.', 20, C.greyDark);

    this.toast = label(this, GAME_W / 2, 400, '', 34, C.white).setStroke(C.ink, 8).setDepth(20).setAlpha(0);
    announceAchievements(this);
  }

  private row(items: ShopItem[], y: number): void {
    const total = items.length * CARD_W + (items.length - 1) * GAP;
    items.forEach((item, i) => this.card(item, GAME_W / 2 - total / 2 + CARD_W / 2 + i * (CARD_W + GAP), y));
  }

  private card(item: ShopItem, x: number, y: number): void {
    const shop = save.shop;
    const owned = isOwned(shop, item.id);
    const worn = equipped(shop, item.kind).id === item.id;
    const g = this.add.graphics({ x, y });
    g.fillStyle(hex(C.white), 1);
    g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 18);
    if (worn) {
      g.lineStyle(5, hex(C.good), 1);
      g.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 18);
    }
    if (item.kind === 'paint') {
      const key = item.id === 'paint-classic' ? 'car' : `car-${item.id}`;
      const k = 0.58;
      for (const dx of [-47, 47]) this.add.image(x + dx * k, y - 38 + 28 * k, 'wheel').setScale(0.72 * k);
      this.add.image(x, y - 38, key).setScale(k);
      this.add.image(x + 1, y - 46, 'cow-calm').setScale(k);
    } else if (item.kind === 'deck') {
      // A short piece of road with its dashed centre line.
      const [road, line] = item.colors;
      g.fillStyle(hex(C.ink), 1);
      g.fillRoundedRect(-56, -46, 112, 22, 8);
      g.fillStyle(hex(road), 1);
      g.fillRoundedRect(-54, -44, 108, 18, 7);
      g.fillStyle(hex(line), 1);
      for (let dx = -44; dx < 44; dx += 22) g.fillRect(dx, -36, 11, 3);
    } else {
      // A small truss: a wood triangle with a steel bottom chord.
      const [wood, woodLight, steel, steelLight] = item.colors;
      const beam = (ax: number, ay: number, bx: number, by: number, main: string, light: string) => {
        g.lineStyle(10, hex(C.ink), 0.9);
        g.lineBetween(ax, ay, bx, by);
        g.lineStyle(6, hex(main), 1);
        g.lineBetween(ax, ay, bx, by);
        g.lineStyle(2, hex(light), 0.8);
        g.lineBetween(ax, ay - 1.5, bx, by - 1.5);
      };
      beam(-48, -22, 0, -58, wood, woodLight);
      beam(0, -58, 48, -22, wood, woodLight);
      beam(0, -58, 0, -22, wood, woodLight);
      beam(-48, -22, 48, -22, steel, steelLight);
      g.fillStyle(hex(C.ink), 1);
      for (const [px, py] of [[-48, -22], [0, -58], [48, -22], [0, -22]]) g.fillCircle(px, py, 4);
    }
    label(this, x, y + 2, item.name, 21, C.ink);
    const text = worn ? 'In use' : owned ? 'Use' : `${item.price}`;
    const canAfford = save.data.coins >= item.price;
    const colors = worn ? { color: C.good, shade: C.goodDark } : owned ? { color: C.blue, shade: C.blueDark } : canAfford ? { color: C.primary, shade: C.primaryDark } : { color: C.grey, shade: C.greyDark };
    const b = button(this, x, y + 44, text, () => this.choose(item), { width: 112, height: 44, fontSize: 22, ...colors });
    if (!owned) {
      // Price with a coin in front of it.
      this.add.image(x - 30, y + 42, 'coin').setScale(0.55);
      (b.list[2] as Phaser.GameObjects.Text).setX(12);
    }
    b.setName(item.id);
  }

  private choose(item: ShopItem): void {
    const shop = save.shop;
    if (equipped(shop, item.kind).id === item.id) return;
    if (isOwned(shop, item.id)) {
      save.equipItem(item.id);
      this.scene.restart();
      return;
    }
    const error = save.buyItem(item.id);
    if (error) {
      this.say(error);
      return;
    }
    sfx.coin();
    this.scene.restart();
  }

  private say(text: string): void {
    if (!this.toast) return;
    this.toast.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1400, duration: 400 });
  }
}
