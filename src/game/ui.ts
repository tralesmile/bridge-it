import Phaser from 'phaser';
import { sfx } from './audio';
import { C, FONT, hex } from './theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: string;
  shade?: string;
  fontSize?: number;
  textColor?: string;
}

export interface Button extends Phaser.GameObjects.Container {
  setEnabled(enabled: boolean): Button;
  setLabel(text: string): Button;
  setSelected(selected: boolean): Button;
}

/** A chunky rounded button with a pressed-in animation. Works with mouse and touch. */
export function button(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, opts: ButtonOptions = {}): Button {
  const w = opts.width ?? 200;
  const h = opts.height ?? 64;
  const color = opts.color ?? C.primary;
  const shade = opts.shade ?? C.primaryDark;
  const container = scene.add.container(x, y) as Button;
  const base = scene.add.graphics();
  const ring = scene.add.graphics();
  const text = scene.add
    .text(0, -3, label, { fontFamily: FONT, fontSize: `${opts.fontSize ?? 28}px`, fontStyle: 'bold', color: opts.textColor ?? C.white })
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
    text.y = (pressed ? 0 : -3) - 1;
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
