import Phaser from 'phaser';
import { BUILD_MARGIN_X, BUILD_MAX_Y, BUILD_MIN_Y } from '../../core/bridge';
import {
  CUSTOM_BUDGET, CUSTOM_GAP, CUSTOM_GOAL, CUSTOM_HEIGHT, CUSTOM_MAX_ANCHORS, CUSTOM_MAX_LANES, CUSTOM_VEHICLES, LANE_WIDTH, MY_LEVELS_MAX,
  anchorProblem, baseAnchors, cleanName, customId, decodeLevel, encodeLevel, goalOf, inLane, laneProblem, lanesOf, type CustomSpec,
} from '../../core/custom';
import { MATERIALS, MATERIAL_ORDER, type MaterialId } from '../../core/materials';
import { vehicleTextureKey } from '../../core/shop';
import { closeOnBack, onBack } from '../back';
import { addBackground } from '../background';
import { sfx } from '../audio';
import { codeDialogOpen, showCodeDialog } from '../codeDialog';
import { save } from '../save';
import { C, FONT, GAME_H, GAME_W, hex } from '../theme';
import { button, label, panel, type Button } from '../ui';

/** The picture where anchors are placed: a box on the right side of the screen. */
const BOX = { left: 560, top: 120, width: 680, height: 430 } as const;

const MONEY_STEP = (budget: number, up: boolean): number => (budget + (up ? 0 : -1) < 2000 ? 100 : 500);

/**
 * Level editor: set the gap, cliff heights, vehicle, materials and money, tap the grid to add
 * rocks and posts, then test it. Once your own bridge crosses it, copy the level code for friends.
 */
export class EditorScene extends Phaser.Scene {
  private picture!: Phaser.GameObjects.Graphics;
  private pictureCar?: Phaser.GameObjects.Image;
  private values = new Map<string, Phaser.GameObjects.Text>();
  private vehicleButtons: Button[] = [];
  private materialButtons = new Map<MaterialId, Button>();
  private status!: Phaser.GameObjects.Text;
  private nameButton!: Button;
  private copyButton!: Button;
  private toast!: Phaser.GameObjects.Text;
  /** What a tap on the grid adds: a rock or a ship lane. */
  private tapMode: 'rock' | 'lane' = 'rock';
  private modeButtons = new Map<'rock' | 'lane', Button>();
  private modeHint!: Phaser.GameObjects.Text;
  /** The "My levels" window, while it is open. */
  private listLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('editor');
  }

  private get draft(): CustomSpec {
    return save.editorSlot.draft;
  }

  /** `toast`: a message to show on arrival (for example "My levels is full"). `list`: open "My levels". */
  create(data: { toast?: string; list?: boolean } = {}): void {
    this.listLayer = undefined;
    this.values.clear();
    this.vehicleButtons = [];
    this.materialButtons.clear();
    this.modeButtons.clear();
    this.tapMode = 'rock';
    addBackground(this);
    panel(this, GAME_W / 2, 395, 1240, 590);
    button(this, 110, 50, '◀ Back', () => this.scene.start('menu'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });
    onBack(this, () => this.scene.start('menu'));
    button(this, 330, 50, '📂 My levels', () => this.openList(), { width: 230, height: 52, fontSize: 22, color: C.good, shade: C.goodDark }).setName('editor-list');
    label(this, GAME_W / 2 + 20, 50, 'Level Editor', 44, C.white).setStroke(C.ink, 10);
    this.nameButton = button(this, GAME_W - 170, 50, '', () => void this.rename(), { width: 300, height: 52, fontSize: 22, color: C.primary, shade: C.primaryDark });

    this.stepper('gap', 'Gap', 140, (d) => ({ gap: clamp(this.draft.gap + d, CUSTOM_GAP.min, CUSTOM_GAP.max) }), () => `${this.draft.gap} m`);
    this.stepper('left', 'Left cliff', 205, (d) => ({ leftHeight: clamp(this.draft.leftHeight + d, CUSTOM_HEIGHT.min, CUSTOM_HEIGHT.max) }), () => signed(this.draft.leftHeight));
    this.stepper('right', 'Right cliff', 270, (d) => ({ rightHeight: clamp(this.draft.rightHeight + d, CUSTOM_HEIGHT.min, CUSTOM_HEIGHT.max) }), () => signed(this.draft.rightHeight));
    this.stepper('money', 'Money', 335, (d) => {
      const b = this.draft.budget;
      return { budget: clamp(b + d * MONEY_STEP(b, d > 0), CUSTOM_BUDGET.min, CUSTOM_BUDGET.max) };
    }, () => `$${this.draft.budget.toLocaleString('en-US')}`);

    label(this, 60, 400, 'Vehicle', 24, C.ink).setOrigin(0, 0.5);
    CUSTOM_VEHICLES.forEach((v, i) => {
      const b = button(this, 245 + i * 112, 400, VEHICLE_SHORT[v], () => this.change({ vehicle: v }), { width: 104, height: 48, fontSize: 18 });
      b.setName(`editor-vehicle-${v}`);
      this.vehicleButtons.push(b);
    });

    label(this, 60, 462, 'Materials', 24, C.ink).setOrigin(0, 0.5);
    MATERIAL_ORDER.forEach((m, i) => {
      const x = 245 + (i % 3) * 112;
      const y = 462 + Math.floor(i / 3) * 56;
      const b = button(this, x, y, MATERIALS[m].name, () => this.toggleMaterial(m), { width: 104, height: 48, fontSize: 18 });
      b.setName(`editor-material-${m}`);
      this.materialButtons.set(m, b);
    });

    this.picture = this.add.graphics();
    const hit = this.add.zone(BOX.left, BOX.top, BOX.width, BOX.height).setOrigin(0).setInteractive();
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapGrid(p.x, p.y));
    this.stepper('goal', 'Flag', 578, (d) => ({ goal: clamp(goalOf(this.draft) + d, CUSTOM_GOAL.min, CUSTOM_GOAL.max) }), () => `${goalOf(this.draft)} m`);
    const modes = [['rock', '🪨 Rocks'], ['lane', '🚢 Ship lanes']] as const;
    modes.forEach(([mode, text], i) => {
      const b = button(this, BOX.left + 95 + i * 200, 578, text, () => this.setTapMode(mode), { width: 190, height: 44, fontSize: 19 });
      b.setName(`editor-mode-${mode}`);
      this.modeButtons.set(mode, b);
    });
    this.modeHint = label(this, BOX.left + 400, 578, '', 19, C.greyDark).setOrigin(0, 0.5);

    this.status = this.add.text(60, 640, '', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: C.greyDark, wordWrap: { width: 470 } }).setOrigin(0, 0.5);
    button(this, 640, 640, 'Paste code', () => void this.pasteCode(), { width: 190, height: 60, fontSize: 22, color: C.grey, shade: C.greyDark }).setName('editor-paste');
    this.copyButton = button(this, 860, 640, 'Copy level code', () => void this.copyCode(), { width: 230, height: 60, fontSize: 22, color: C.blue, shade: C.blueDark });
    this.copyButton.setName('editor-copy');
    button(this, 1120, 640, 'Test ▶', () => this.scene.start('play', { levelId: save.draftId }), { width: 200, height: 70, fontSize: 30, color: C.good, shade: C.goodDark }).setName('editor-test');

    this.toast = this.add.text(GAME_W / 2, 110, '', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: C.white, align: 'center' }).setOrigin(0.5).setAlpha(0).setDepth(20);
    this.toast.setStroke(C.ink, 7);
    this.refresh();
    if (data.toast) this.showToast(data.toast);
    if (data.list) this.openList();
  }

  /** "My levels": every saved level as a card. Tap one to open it; tap its bin twice to delete it. */
  private openList(): void {
    this.listLayer?.destroy();
    const layer = this.add.container(0, 0).setDepth(30);
    this.listLayer = layer;
    const close = () => {
      layer.destroy();
      if (this.listLayer === layer) this.listLayer = undefined;
    };
    layer.add(this.add.rectangle(0, 0, GAME_W, GAME_H, hex(C.ink), 0.45).setOrigin(0).setInteractive());
    layer.add(panel(this, GAME_W / 2, GAME_H / 2, 1120, 660));
    const levels = save.data.editor.levels;
    layer.add(label(this, GAME_W / 2, 82, `My levels (${levels.length}/${MY_LEVELS_MAX})`, 40, C.ink));
    const note = label(this, GAME_W / 2, 590, 'Tap a level to open it. 🔗 copies the code of a crossed level.', 22, C.greyDark);
    layer.add(note);
    let armed = -1;
    levels.forEach((slot, i) => {
      const cx = GAME_W / 2 + ((i % 3) - 1) * 350;
      const cy = 160 + Math.floor(i / 3) * 106;
      const open = i === save.data.editor.current;
      const d = slot.draft;
      const info = `${d.gap} m${lanesOf(d).length > 0 ? ' 🚢' : ''} · ${VEHICLE_SHORT[d.vehicle]} · ${slot.best > 0 ? `✓ $${slot.best.toLocaleString('en-US')}` : 'not crossed'}`;
      const card = button(this, cx - 32, cy, `${d.name}
${info}`, () => {
        save.openEditorLevel(i);
        sfx.place(0);
        close();
        this.refresh();
      }, { width: 266, height: 90, fontSize: 19, color: open ? C.good : C.blue, shade: open ? C.goodDark : C.blueDark });
      card.setSelected(open).setName(`editor-level-${i}`);
      layer.add(card);
      const share = button(this, cx + 135, cy + 23, '🔗', () => {
        armed = -1;
        void this.copyCode(slot, (t) => note.setText(t).setColor(C.goodDark));
      }, { width: 54, height: 44, fontSize: 20, color: C.blue, shade: C.blueDark });
      share.setEnabled(slot.best > 0).setName(`editor-share-${i}`);
      layer.add(share);
      const bin = button(this, cx + 135, cy - 23, '🗑', () => {
        if (armed !== i) {
          armed = i;
          sfx.error();
          note.setText(`Tap 🗑 again to delete "${d.name}".`).setColor(C.anchor);
          return;
        }
        save.deleteEditorLevel(i);
        this.refresh();
        this.openList();
      }, { width: 54, height: 44, fontSize: 20, color: C.grey, shade: C.greyDark });
      bin.setEnabled(levels.length > 1).setName(`editor-delete-${i}`);
      layer.add(bin);
    });
    const full = levels.length >= MY_LEVELS_MAX;
    const add = button(this, GAME_W / 2 - 140, 650, full ? 'List is full' : '+ New level', () => {
      if (!save.addEditorLevel()) return;
      sfx.place(0);
      close();
      this.refresh();
      this.showToast(`New level: ${save.editorSlot.draft.name}`);
    }, { width: 240, height: 64, fontSize: 24, color: C.primary, shade: C.primaryDark });
    add.setEnabled(!full).setName('editor-new');
    layer.add(add);
    layer.add(button(this, GAME_W / 2 + 140, 650, 'Close', close, { width: 220, height: 64, color: C.blue, shade: C.blueDark }));
    closeOnBack(layer, close);
  }

  /** A row with a name, a minus button, the value and a plus button. */
  private stepper(key: string, title: string, y: number, next: (delta: number) => Partial<CustomSpec>, text: () => string): void {
    label(this, 60, y, title, 24, C.ink).setOrigin(0, 0.5);
    button(this, 245, y, '−', () => this.change(next(-1)), { width: 60, height: 50, fontSize: 30, color: C.blue, shade: C.blueDark }).setName(`editor-${key}-minus`);
    const value = label(this, 357, y, text(), 26, C.ink);
    button(this, 469, y, '+', () => this.change(next(1)), { width: 60, height: 50, fontSize: 30, color: C.blue, shade: C.blueDark }).setName(`editor-${key}-plus`);
    this.values.set(key, value);
    value.setData('text', text);
  }

  private setTapMode(mode: 'rock' | 'lane'): void {
    this.tapMode = mode;
    sfx.place(0);
    this.refresh();
  }

  private change(patch: Partial<CustomSpec>): void {
    const next = { ...this.draft, ...patch };
    // Lanes and anchors that no longer fit (a smaller gap, a moved cliff) are dropped.
    if (next.lanes) next.lanes = next.lanes.filter((x0) => laneProblem(next, x0) === null);
    next.anchors = next.anchors.filter((p) => anchorProblem(next, p) === null);
    if (customId(next) === customId(this.draft)) {
      sfx.error();
      return;
    }
    sfx.place(0);
    save.setDraft(next);
    this.refresh();
  }

  private toggleMaterial(m: MaterialId): void {
    if (m === 'road') {
      sfx.error();
      this.showToast('Every level needs road.');
      return;
    }
    const has = this.draft.materials.includes(m);
    this.change({ materials: MATERIAL_ORDER.filter((x) => (x === m ? !has : this.draft.materials.includes(x))) });
  }

  /** Grid point (in metres) under a screen point, or null outside the build area. */
  private gridAt(sx: number, sy: number): { x: number; y: number } | null {
    const v = this.view();
    const x = Math.round((sx - v.x0) / v.ppm) - BUILD_MARGIN_X;
    const y = Math.round((v.y0 - sy) / v.ppm) + BUILD_MIN_Y;
    if (x < -BUILD_MARGIN_X || x > this.draft.gap + BUILD_MARGIN_X || y < BUILD_MIN_Y || y > BUILD_MAX_Y) return null;
    return { x, y };
  }

  private tapGrid(sx: number, sy: number): void {
    if (codeDialogOpen() || this.listLayer) return;
    const p = this.gridAt(sx, sy);
    if (!p) return;
    if (this.tapMode === 'lane') {
      this.tapLane(p.x);
      return;
    }
    const anchors = this.draft.anchors;
    if (anchors.some((a) => a.x === p.x && a.y === p.y)) {
      this.change({ anchors: anchors.filter((a) => a.x !== p.x || a.y !== p.y) });
      return;
    }
    const bad = anchorProblem(this.draft, p);
    if (bad) {
      sfx.error();
      this.showToast(bad);
      return;
    }
    if (anchors.length >= CUSTOM_MAX_ANCHORS) {
      sfx.error();
      this.showToast(`At most ${CUSTOM_MAX_ANCHORS} rocks.`);
      return;
    }
    this.change({ anchors: [...anchors, p] });
  }

  /** Lane mode: a tap on a lane removes it; anywhere else adds a 4 m lane around the tap. */
  private tapLane(x: number): void {
    const d = this.draft;
    const lanes = lanesOf(d);
    const hit = lanes.find((x0) => x > x0 && x < x0 + LANE_WIDTH) ?? lanes.find((x0) => x >= x0 && x <= x0 + LANE_WIDTH);
    if (hit !== undefined) {
      this.change({ lanes: lanes.filter((x0) => x0 !== hit) });
      return;
    }
    const fail = (text: string) => {
      sfx.error();
      this.showToast(text);
    };
    if (d.gap < LANE_WIDTH) return fail(`A ship lane needs a gap of ${LANE_WIDTH} m or more.`);
    if (lanes.length >= CUSTOM_MAX_LANES) return fail(`At most ${CUSTOM_MAX_LANES} ship lanes.`);
    const x0 = clamp(x - LANE_WIDTH / 2, 0, d.gap - LANE_WIDTH);
    const bad = laneProblem(d, x0);
    if (bad) return fail(bad);
    if (d.anchors.some((a) => inLane({ lanes: [x0] }, a.x))) return fail('Move the rocks out of the lane first.');
    const withPiston = d.materials.includes('piston');
    this.change({ lanes: [...lanes, x0].sort((a, b) => a - b), materials: MATERIAL_ORDER.filter((m) => m === 'piston' || d.materials.includes(m)) });
    if (!withPiston) this.showToast('Piston added: drawbridges need it.');
  }

  /** Pixels per metre and the screen point of grid (−3, −6), so the whole build area fits the box. */
  private view(): { ppm: number; x0: number; y0: number } {
    const cols = this.draft.gap + BUILD_MARGIN_X * 2;
    const rows = BUILD_MAX_Y - BUILD_MIN_Y;
    const ppm = Math.min((BOX.width - 40) / cols, (BOX.height - 40) / rows);
    const x0 = BOX.left + (BOX.width - cols * ppm) / 2;
    const y0 = BOX.top + BOX.height - (BOX.height - rows * ppm) / 2;
    return { ppm, x0, y0 };
  }

  private refresh(): void {
    const d = this.draft;
    for (const value of this.values.values()) value.setText((value.getData('text') as () => string)());
    CUSTOM_VEHICLES.forEach((v, i) => {
      const on = d.vehicle === v;
      this.vehicleButtons[i].setColors(on ? C.good : C.blue, on ? C.goodDark : C.blueDark).setSelected(on);
    });
    for (const [m, b] of this.materialButtons) {
      const on = d.materials.includes(m);
      b.setColors(on ? C.good : C.grey, on ? C.goodDark : C.greyDark).setSelected(on);
    }
    for (const [mode, b] of this.modeButtons) {
      const on = this.tapMode === mode;
      b.setColors(on ? C.good : C.grey, on ? C.goodDark : C.greyDark).setSelected(on);
    }
    this.modeHint.setText(this.tapMode === 'rock' ? 'Tap: add or remove a rock.' : `Tap: add or remove a ${LANE_WIDTH} m lane.`);
    this.nameButton.setLabel(`✏️ ${d.name}`);
    const best = save.editorSlot.best;
    this.status.setText(best > 0 ? `Crossed for $${best.toLocaleString('en-US')} ✓\nCopy the code for a friend.` : 'Not crossed yet.\nTest it: your bridge must cross first.');
    this.status.setColor(best > 0 ? C.goodDark : C.greyDark);
    this.copyButton.setEnabled(best > 0);
    this.drawPicture();
  }

  /** Cliffs, water, the grid and every anchor, with the vehicle on the left cliff. */
  private drawPicture(): void {
    const d = this.draft;
    const g = this.picture;
    const { ppm, x0, y0 } = this.view();
    const sx = (m: number) => x0 + (m + BUILD_MARGIN_X) * ppm;
    const sy = (m: number) => y0 - (m - BUILD_MIN_Y) * ppm;
    const bottom = BOX.top + BOX.height;
    g.clear();
    g.fillStyle(hex(C.skyTop), 0.35);
    g.fillRoundedRect(BOX.left, BOX.top, BOX.width, BOX.height, 16);
    g.fillStyle(hex(C.water), 0.9);
    g.fillRect(sx(0), sy(BUILD_MIN_Y + 1), sx(d.gap) - sx(0), bottom - sy(BUILD_MIN_Y + 1) - 10);
    g.fillStyle(hex(C.dirt), 1);
    g.fillRect(BOX.left + 10, sy(d.leftHeight), sx(0) - BOX.left - 10, bottom - 10 - sy(d.leftHeight));
    g.fillRect(sx(d.gap), sy(d.rightHeight), BOX.left + BOX.width - 10 - sx(d.gap), bottom - 10 - sy(d.rightHeight));
    g.fillStyle(hex(C.grass), 1);
    g.fillRect(BOX.left + 10, sy(d.leftHeight) - 4, sx(0) - BOX.left - 10, 6);
    g.fillRect(sx(d.gap), sy(d.rightHeight) - 4, BOX.left + BOX.width - 10 - sx(d.gap), 6);
    // Ship lanes: light blue columns with white dashes on both edges.
    for (const x0 of lanesOf(d)) {
      const l = sx(x0);
      const w = sx(x0 + LANE_WIDTH) - l;
      g.fillStyle(hex(C.waterLight), 0.45);
      g.fillRect(l, BOX.top + 10, w, bottom - BOX.top - 20);
      g.fillStyle(0xffffff, 0.85);
      for (let y = BOX.top + 14; y < bottom - 14; y += 20) {
        g.fillRect(l - 1.5, y, 3, 10);
        g.fillRect(l + w - 1.5, y, 3, 10);
      }
    }
    // The finish flag (at the edge of the picture when it is further out).
    const fx = sx(Math.min(d.gap + goalOf(d), d.gap + BUILD_MARGIN_X));
    const fy = sy(d.rightHeight);
    const pole = Math.max(18, ppm * 1.6);
    g.fillStyle(hex(C.ink), 1);
    g.fillRect(fx - 1.5, fy - pole, 3, pole);
    g.fillStyle(hex(C.gold), 1);
    g.fillTriangle(fx + 1.5, fy - pole, fx + pole * 0.55, fy - pole * 0.8, fx + 1.5, fy - pole * 0.6);
    g.fillStyle(hex(C.ink), 0.25);
    for (let x = -BUILD_MARGIN_X; x <= d.gap + BUILD_MARGIN_X; x++) for (let y = BUILD_MIN_Y; y <= BUILD_MAX_Y; y++) g.fillCircle(sx(x), sy(y), 2);
    const r = Math.max(5, Math.min(10, ppm * 0.3));
    for (const a of [...baseAnchors(d), ...d.anchors]) {
      g.fillStyle(hex(C.ink), 1);
      g.fillCircle(sx(a.x), sy(a.y), r + 2);
      g.fillStyle(hex(C.anchor), 1);
      g.fillCircle(sx(a.x), sy(a.y), r);
    }
    this.pictureCar?.destroy();
    const scale = (d.vehicle === 'car' ? 0.012 : 0.009) * ppm;
    const wheelR = Math.max(3, ppm * 0.22);
    this.pictureCar = this.add.image(sx(-1.6), sy(d.leftHeight) - wheelR, vehicleTextureKey(save.shop, d.vehicle)).setOrigin(0.5, 1).setScale(scale);
    // Two wheels under the body, so it reads as a vehicle at this small size.
    const half = this.pictureCar.displayWidth * 0.3;
    g.fillStyle(hex(C.ink), 1);
    for (const dx of [-half, half]) g.fillCircle(sx(-1.6) + dx, sy(d.leftHeight) - wheelR, wheelR);
  }

  private async rename(): Promise<void> {
    if (codeDialogOpen()) return;
    const text = await showCodeDialog({ title: 'Name your level:', value: this.draft.name, okLabel: 'OK' });
    if (text === null || !this.scene.isActive()) return;
    const name = cleanName(text);
    if (name !== this.draft.name) this.change({ name });
  }

  /** Copy the code of a crossed level (the open one, or a card in My levels). */
  private async copyCode(slot = save.editorSlot, tell = (t: string) => this.showToast(t)): Promise<void> {
    if (slot.best <= 0 || codeDialogOpen()) return;
    const code = encodeLevel({ ...slot.draft, authorCost: slot.best });
    try {
      await navigator.clipboard.writeText(code);
      sfx.place(0);
      tell(`Code of "${slot.draft.name}" copied! Send it to a friend.`);
    } catch {
      await showCodeDialog({ title: 'Copy this level code:', value: code, readOnly: true });
    }
  }

  /** A friend's level code: play it now. */
  private async pasteCode(): Promise<void> {
    if (codeDialogOpen()) return;
    const text = await showCodeDialog({ title: 'Paste a level code here:', okLabel: 'Play' });
    if (!text || !this.scene.isActive()) return;
    const r = decodeLevel(text);
    if (!r.ok) {
      sfx.error();
      this.showToast(r.error);
      return;
    }
    this.scene.start('play', { levelId: customId(r.spec) });
  }

  private showToast(text: string): void {
    this.tweens.killTweensOf(this.toast);
    this.toast.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 2000, duration: 400 });
  }
}

const VEHICLE_SHORT: Record<string, string> = { car: 'Car', truck: 'Truck', train: 'Train' };
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const signed = (h: number): string => (h > 0 ? `+${h} m` : `${h} m`);
