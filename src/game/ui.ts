import Phaser from 'phaser';
import { sfx } from './audio';
import { closeOnBack } from './back';
import { platform } from './platform';
import { ACHIEVEMENTS } from '../core/achievements';
import { save } from './save';
import { store, type BuyResult, type RestoreResult } from './store';
import { PRODUCTS, owns } from '../core/purchases';
import { C, FONT, hex } from './theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: string;
  shade?: string;
  fontSize?: number;
  textColor?: string;
  /** Moves the label down (or up) from the centre, in pixels. */
  textOffsetY?: number;
}

export interface Button extends Phaser.GameObjects.Container {
  setEnabled(enabled: boolean): Button;
  setLabel(text: string): Button;
  setSelected(selected: boolean): Button;
  setColors(color: string, shade: string): Button;
}

/** A chunky rounded button with a pressed-in animation. Works with mouse and touch. */
export function button(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, opts: ButtonOptions = {}): Button {
  const w = opts.width ?? 200;
  const h = opts.height ?? 64;
  let color = opts.color ?? C.primary;
  let shade = opts.shade ?? C.primaryDark;
  const container = scene.add.container(x, y) as Button;
  const base = scene.add.graphics();
  const ring = scene.add.graphics();
  const text = scene.add
    .text(0, -3, label, { fontFamily: FONT, fontSize: `${opts.fontSize ?? 28}px`, fontStyle: 'bold', color: opts.textColor ?? C.white, align: 'center' })
    .setOrigin(0.5);
  text.setShadow(0, 2, 'rgba(0,0,0,0.25)', 0);
  let enabled = true;

  const draw = (pressed: boolean) => {
    base.clear();
    const drop = pressed ? 2 : 6;
    base.fillStyle(hex(shade), 1);
    base.fillRoundedRect(-w / 2, -h / 2 + drop, w, h, 18);
    base.fillStyle(hex(color), 1);
    base.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 2 : 0), w, h - 2, 18);
    base.fillStyle(0xffffff, 0.18);
    base.fillRoundedRect(-w / 2 + 8, -h / 2 + 6 + (pressed ? 2 : 0), w - 16, h * 0.28, 10);
    text.y = (pressed ? 0 : -3) - 1 + (opts.textOffsetY ?? 0);
  };
  draw(false);
  container.add([base, ring, text]);
  container.setSize(w, h + 6);
  container.setInteractive({ useHandCursor: true });

  let down = false;
  container.on('pointerdown', () => {
    if (!enabled) return;
    down = true;
    draw(true);
    sfx.unlock();
  });
  container.on('pointerout', () => {
    if (down) draw(false);
    down = false;
  });
  container.on('pointerup', () => {
    if (!enabled || !down) return;
    down = false;
    draw(false);
    sfx.click();
    onClick();
  });

  container.setEnabled = (value: boolean) => {
    enabled = value;
    container.setAlpha(value ? 1 : 0.45);
    return container;
  };
  container.setLabel = (value: string) => {
    text.setText(value);
    return container;
  };
  container.setColors = (c: string, sh: string) => {
    color = c;
    shade = sh;
    draw(false);
    return container;
  };
  container.setSelected = (selected: boolean) => {
    ring.clear();
    if (selected) {
      ring.lineStyle(5, 0xffffff, 1);
      ring.strokeRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 12, 22);
    }
    return container;
  };
  return container;
}

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 28, color: string = C.ink): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color }).setOrigin(0.5);
}

/** A soft rounded panel. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y });
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 28);
  g.fillStyle(hex(C.cream), 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 28);
  return g;
}

/** Settings window with on/off switches. Shows on top of any scene; `onClose` runs when it closes. */
export function openSettings(scene: Phaser.Scene, onChange: () => void = () => undefined): void {
  const W = 1280;
  const H = 720;
  const layer = scene.add.container(0, 0).setDepth(50);
  const shade = scene.add.rectangle(0, 0, W, H, hex(C.ink), 0.45).setOrigin(0).setInteractive();
  layer.add([shade, panel(scene, W / 2, H / 2, 620, 600)]);
  layer.add(label(scene, W / 2, H / 2 - 220, 'Settings', 48, C.ink));
  const rows: Array<{ key: 'sound' | 'music' | 'reducedMotion' | 'shake'; text: string }> = [
    { key: 'sound', text: 'Sound' },
    { key: 'shake', text: 'Screen shake' },
    { key: 'reducedMotion', text: 'Less motion' },
    { key: 'music', text: 'Music' },
  ];
  // In the app with a store, rows move up to make room for the purchases button.
  const shop = store.available();
  rows.forEach((row, i) => {
    const y = shop ? H / 2 - 140 + i * 68 : H / 2 - 95 + i * 80;
    layer.add(label(scene, W / 2 - 130, y, row.text, 30, C.ink).setOrigin(0, 0.5));
    const text = (): string => (save.data.settings[row.key] ? 'On' : 'Off');
    const colors = (): ButtonOptions => (save.data.settings[row.key] ? { color: C.good, shade: C.goodDark } : { color: C.greyDark, shade: C.ink });
    const b = button(scene, W / 2 + 170, y, text(), () => {
      save.data.settings[row.key] = !save.data.settings[row.key];
      save.persist();
      b.setLabel(text());
      b.setColors(colors().color ?? C.good, colors().shade ?? C.goodDark);
      sfx.unlock();
      onChange();
    }, { width: 130, height: 58, fontSize: 26, ...colors() });
    layer.add(b);
  });
  if (shop) {
    layer.add(button(scene, W / 2, H / 2 + 140, save.data.purchases.noAds ? 'Support the game' : 'Remove ads', () => openSupport(scene), { width: 330, height: 60, fontSize: 24, color: C.gold, shade: C.primaryDark, textColor: C.ink }));
  }
  // App in the EU and UK: the player must be able to change their ad consent at any time.
  const privacy = platform.hasPrivacyOptions();
  if (privacy) {
    layer.add(button(scene, W / 2 - 125, H / 2 + 230, 'Privacy choices', () => void platform.privacyOptions(), { width: 250, height: 66, fontSize: 24, color: C.greyDark, shade: C.ink }));
  }
  layer.add(button(scene, privacy ? W / 2 + 140 : W / 2, H / 2 + 230, 'Close', () => layer.destroy(), { width: 220, height: 66, color: C.blue, shade: C.blueDark }));
  closeOnBack(layer, () => layer.destroy());
}

const BUY_TEXT: Record<BuyResult, string> = {
  bought: 'Thank you for your support!',
  cancelled: '',
  pending: 'Payment pending. It unlocks when the payment goes through.',
  failed: 'The purchase did not work. Please try again later.',
};
const RESTORE_TEXT: Record<RestoreResult, string> = {
  restored: 'Purchases restored.',
  nothing: 'No purchases found for this account.',
  failed: 'Could not reach the store. Please try again later.',
};

/** Real-money purchases (app only): Remove ads, Supporter pack, Restore purchases. */
export function openSupport(scene: Phaser.Scene, onClose: () => void = () => undefined): void {
  const W = 1280;
  const H = 720;
  const layer = scene.add.container(0, 0).setDepth(55);
  const shade = scene.add.rectangle(0, 0, W, H, hex(C.ink), 0.45).setOrigin(0).setInteractive();
  layer.add([shade, panel(scene, W / 2, H / 2, 840, 580)]);
  layer.add(label(scene, W / 2, H / 2 - 230, 'Support Bridge It!', 44, C.ink));
  const status = label(scene, W / 2, H / 2 + 150, '', 22, C.ink);
  const buys: Array<() => void> = [];
  PRODUCTS.forEach((p, i) => {
    const x = W / 2 + (i === 0 ? -200 : 200);
    const y = H / 2 - 30;
    const card = scene.add.graphics();
    card.fillStyle(0xffffff, 0.75);
    card.fillRoundedRect(x - 180, y - 130, 360, 260, 22);
    layer.add([card, label(scene, x, y - 92, p.name, 32, C.ink)]);
    p.lines.forEach((line, n) => layer.add(label(scene, x, y - 40 + n * 30, line, 21, C.ink)));
    const b = button(scene, x, y + 80, '', async () => {
      b.setEnabled(false);
      status.setText('Opening the store...');
      const result = await store.buy(p.id);
      if (!layer.active) return;
      status.setText(BUY_TEXT[result]);
      for (const fn of buys) fn();
    }, { width: 240, height: 62, fontSize: 26, color: C.good, shade: C.goodDark });
    const show = () => {
      const have = owns(save.data.purchases, p.id);
      b.setLabel(have ? 'Owned ✓' : (store.price(p.id) ?? p.fallbackPrice));
      b.setEnabled(!have);
    };
    show();
    buys.push(show);
    layer.add(b);
  });
  // A pending payment or a refund can arrive while the window is open.
  const stop = store.onChange(() => {
    for (const fn of buys) fn();
  });
  layer.once('destroy', stop);
  const restore = button(scene, W / 2 - 150, H / 2 + 225, 'Restore purchases', async () => {
    restore.setEnabled(false);
    status.setText('Checking...');
    const result = await store.restore();
    if (!layer.active) return;
    restore.setEnabled(true);
    status.setText(RESTORE_TEXT[result]);
    for (const fn of buys) fn();
  }, { width: 280, height: 64, fontSize: 24, color: C.greyDark, shade: C.ink });
  layer.add([status, restore]);
  const close = () => {
    layer.destroy();
    onClose();
  };
  layer.add(button(scene, W / 2 + 170, H / 2 + 225, 'Close', close, { width: 220, height: 64, color: C.blue, shade: C.blueDark }));
  closeOnBack(layer, close);
}

/**
 * Checks for new achievements and shows a banner for each one at the top of the screen.
 * The banner does not take input, so it never blocks a button.
 */
export function announceAchievements(scene: Phaser.Scene, delay = 0): void {
  const ids = save.checkAchievements();
  // Many at once (an old save, or a big win): one banner, not a long queue.
  const banners = ids.length > 2 ? [`${ids.length} new achievements!`] : ids.map((id) => ACHIEVEMENTS.find((x) => x.id === id)?.name ?? '');
  banners.forEach((name, n) => {
    const box = scene.add.container(1280 / 2, -60).setDepth(60);
    const g = scene.add.graphics();
    g.fillStyle(hex(C.ink), 0.25);
    g.fillRoundedRect(-260, -36 + 6, 520, 72, 20);
    g.fillStyle(hex(C.gold), 1);
    g.fillRoundedRect(-260, -36, 520, 72, 20);
    box.add([g, label(scene, 0, -12, '🏆 Achievement!', 20, C.ink), label(scene, 0, 14, name, 26, C.ink)]);
    const still = save.data.settings.reducedMotion;
    scene.tweens.add({
      targets: box,
      y: 60,
      delay: delay + n * 2600,
      duration: still ? 1 : 350,
      ease: 'Back.easeOut',
      onStart: () => sfx.coin(),
      onComplete: () => scene.tweens.add({ targets: box, alpha: 0, y: still ? 60 : 30, delay: 1900, duration: 300, onComplete: () => box.destroy() }),
    });
  });
}
