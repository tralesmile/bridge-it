import Phaser from 'phaser';
import { sfx } from './audio';
import { ACHIEVEMENTS } from '../core/achievements';
import { save } from './save';
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
  rows.forEach((row, i) => {
    const y = H / 2 - 95 + i * 80;
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
  layer.add(button(scene, W / 2, H / 2 + 230, 'Close', () => layer.destroy(), { width: 220, height: 66, color: C.blue, shade: C.blueDark }));
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
