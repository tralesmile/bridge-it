import Phaser from 'phaser';
import {
  DEFAULT_SANDBOX, SANDBOX_BANKS, SANDBOX_GAPS, SANDBOX_HELPS, SANDBOX_VEHICLES,
  sandboxId, sandboxLevel, type SandboxOptions,
} from '../../core/sandbox';
import { vehicleTextureKey } from '../../core/shop';
import { VEHICLES } from '../../core/vehicles';
import { onBack } from '../back';
import { addBackground } from '../background';
import { sfx } from '../audio';
import { save } from '../save';
import { C, GAME_W, hex } from '../theme';
import { button, label, panel, type Button } from '../ui';

/** The last setup, so "New setup" and Back open with the same choices. */
let current: SandboxOptions = { ...DEFAULT_SANDBOX };

const BANK_NAMES: Record<string, string> = { flat: 'Same height', lower: 'Lower', higher: 'Higher' };
const HELP_NAMES: Record<string, string> = { none: 'Nothing', rocks: 'Rocks', posts: 'High posts', both: 'Both' };

/** Sandbox setup: pick a gap, a vehicle, the far bank and helper anchors, then build anything. */
export class SandboxScene extends Phaser.Scene {
  private preview!: Phaser.GameObjects.Graphics;
  private previewCar?: Phaser.GameObjects.Image;

  constructor() {
    super('sandbox');
  }

  create(): void {
    addBackground(this);
    panel(this, GAME_W / 2, 400, 1100, 600);
    button(this, 110, 60, '◀ Back', () => this.scene.start('menu'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });
    onBack(this, () => this.scene.start('menu'));
    label(this, GAME_W / 2, 60, 'Sandbox', 52, C.white).setStroke(C.ink, 10);
    label(this, GAME_W / 2, 130, 'Every material, no money limit, no stars. Just build!', 24, C.greyDark);

    this.row('Gap', 195, SANDBOX_GAPS.map((g) => [`${g} m`, () => ({ ...current, gap: g })] as const), (o) => `${o.gap} m`);
    this.row('Vehicle', 275, SANDBOX_VEHICLES.map((v) => [VEHICLES[v].name, () => ({ ...current, vehicle: v })] as const), (o) => VEHICLES[o.vehicle].name);
    this.row('Far side', 355, SANDBOX_BANKS.map((b) => [BANK_NAMES[b], () => ({ ...current, bank: b })] as const), (o) => BANK_NAMES[o.bank]);
    this.row('Helpers', 435, SANDBOX_HELPS.map((h) => [HELP_NAMES[h], () => ({ ...current, help: h })] as const), (o) => HELP_NAMES[o.help]);

    this.preview = this.add.graphics();
    this.drawPreview();
    const go = button(this, GAME_W / 2 + 380, 600, 'Build ▶', () => this.scene.start('play', { levelId: sandboxId(current) }), {
      width: 220, height: 76, fontSize: 32, color: C.good, shade: C.goodDark,
    });
    go.setName('sandbox-build');
  }

  /** One row of choices; the chosen one is green with a white ring. */
  private row(title: string, y: number, choices: ReadonlyArray<readonly [string, () => SandboxOptions]>, chosen: (o: SandboxOptions) => string): void {
    label(this, 170, y, title, 28, C.ink).setOrigin(0, 0.5);
    const buttons: Array<[string, Button]> = [];
    const paint = () => {
      for (const [text, b] of buttons) {
        const on = chosen(current) === text;
        b.setColors(on ? C.good : C.blue, on ? C.goodDark : C.blueDark).setSelected(on);
      }
    };
    choices.forEach(([text, pick], i) => {
      const b = button(this, 420 + i * 190, y, text, () => {
        current = pick();
        sfx.place(0);
        paint();
        this.drawPreview();
      }, { width: 176, height: 58, fontSize: 24 });
      b.setName(`sandbox-${title}-${i}`);
      buttons.push([text, b]);
    });
    paint();
  }

  /** A small picture of the setup: banks, water, anchors and the vehicle. */
  private drawPreview(): void {
    const level = sandboxLevel(current);
    const g = this.preview;
    g.clear();
    const left = 200;
    const width = 560;
    const top = 500;
    const bottom = 670;
    const span = level.gapEnd + 8;
    const ppm = width / span;
    const x = (m: number) => left + (m + 4) * ppm;
    const y = (m: number) => top + 70 - m * 10;
    g.fillStyle(hex(C.skyTop), 0.35);
    g.fillRoundedRect(left, top, width, bottom - top, 14);
    g.fillStyle(hex(C.water), 1);
    g.fillRect(x(0), y(-5), x(level.gapEnd) - x(0), bottom - y(-5));
    g.fillStyle(hex(C.dirt), 1);
    g.fillRect(left, y(level.leftHeight), x(0) - left, bottom - y(level.leftHeight));
    g.fillRect(x(level.gapEnd), y(level.rightHeight), left + width - x(level.gapEnd), bottom - y(level.rightHeight));
    g.fillStyle(hex(C.grass), 1);
    g.fillRect(left, y(level.leftHeight) - 4, x(0) - left, 6);
    g.fillRect(x(level.gapEnd), y(level.rightHeight) - 4, left + width - x(level.gapEnd), 6);
    g.fillStyle(hex(C.anchor), 1);
    for (const a of level.anchors) g.fillCircle(x(a.x), y(a.y), 5);
    this.previewCar?.destroy();
    const kind = current.vehicle;
    this.previewCar = this.add.image(x(-2.2), y(level.leftHeight) - 14, vehicleTextureKey(save.shop, kind)).setScale(kind === 'car' ? 0.3 : 0.22);
  }
}
