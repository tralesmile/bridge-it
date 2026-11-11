import Phaser from 'phaser';
import { SHOP_ITEMS, equipped, isOwned, type ShopItem } from '../../core/shop';
import { sfx } from '../audio';
import { addBackground } from '../background';
import { save } from '../save';
import { C, GAME_W, hex } from '../theme';
import { button, label, panel } from '../ui';

const CARD_W = 136;
const CARD_H = 196;
const GAP = 14;

/** Coin shop: paint jobs for the vehicles and road colours. Cosmetic only. */
export class ShopScene extends Phaser.Scene {
  private toast?: Phaser.GameObjects.Text;

  constructor() {
    super('shop');
  }

  create(): void {
    addBackground(this);
    panel(this, GAME_W / 2, 400, 1240, 600);
    button(this, 110, 60, '◀ Back', () => this.scene.start('menu'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });
    label(this, GAME_W / 2, 60, 'Shop', 52, C.white).setStroke(C.ink, 10);
    this.add.image(GAME_W - 190, 60, 'coin').setScale(1.1);
    label(this, GAME_W - 165, 60, `${save.data.coins}`, 34, C.white).setOrigin(0, 0.5).setStroke(C.ink, 8);

    label(this, GAME_W / 2, 132, 'Paint for your car, truck and train', 26, C.ink);
    this.row(SHOP_ITEMS.filter((i) => i.kind === 'paint'), 260);
    label(this, GAME_W / 2, 400, 'Road colour', 26, C.ink);
    this.row(SHOP_ITEMS.filter((i) => i.kind === 'deck'), 528);
    label(this, GAME_W / 2, 668, 'Earn coins with new stars. Looks only: the bridge works the same.', 20, C.greyDark);

    this.toast = label(this, GAME_W / 2, 400, '', 34, C.white).setStroke(C.ink, 8).setDepth(20).setAlpha(0);
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
      for (const dx of [-47, 47]) this.add.image(x + dx * 0.68, y - 50 + 28 * 0.68, 'wheel').setScale(0.72 * 0.68);
      this.add.image(x, y - 50, key).setScale(0.68);
      this.add.image(x + 1, y - 59, 'cow-calm').setScale(0.68);
    } else {
      // A short piece of road with its dashed centre line.
      const [road, line] = item.colors;
      g.fillStyle(hex(C.ink), 1);
      g.fillRoundedRect(-56, -62, 112, 22, 8);
      g.fillStyle(hex(road), 1);
      g.fillRoundedRect(-54, -60, 108, 18, 7);
      g.fillStyle(hex(line), 1);
      for (let dx = -44; dx < 44; dx += 22) g.fillRect(dx, -52, 11, 3);
    }
    label(this, x, y + 8, item.name, 22, C.ink);
    const text = worn ? 'In use' : owned ? 'Use' : `${item.price}`;
    const canAfford = save.data.coins >= item.price;
    const colors = worn ? { color: C.good, shade: C.goodDark } : owned ? { color: C.blue, shade: C.blueDark } : canAfford ? { color: C.primary, shade: C.primaryDark } : { color: C.grey, shade: C.greyDark };
    const b = button(this, x, y + 60, text, () => this.choose(item), { width: 112, height: 50, fontSize: 24, ...colors });
    if (!owned) {
      // Price with a coin in front of it.
      this.add.image(x - 30, y + 57, 'coin').setScale(0.6);
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
