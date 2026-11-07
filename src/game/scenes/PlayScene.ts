import Phaser from 'phaser';
import { BUILD_MARGIN_X, BUILD_MAX_Y, BUILD_MIN_Y, BridgeDesign, distance, keyOf, pointOf, snap, type AddResult } from '../../core/bridge';
import { levelById, nextLevel, type LevelEntry } from '../../core/levels';
import { MATERIALS, type MaterialId } from '../../core/materials';
import { starsFor } from '../../core/scoring';
import { MAX_TIME, STEP, Simulation } from '../../core/simulation';
import type { Point } from '../../core/types';
import { sfx } from '../audio';
import { addBackground } from '../background';
import { platform } from '../platform';
import { save } from '../save';
import { C, FONT, GAME_H, GAME_W, PX_PER_M, hex, mix } from '../theme';
import { button, label, panel, type Button } from '../ui';

type Tool = MaterialId | 'erase';
type Mode = 'build' | 'sim' | 'result';

const WATER_Y = -4.5;
const HINT_AFTER_FAILS = 2;

const REASONS: Record<string, string> = {
  'too-long': 'Too long for this material',
  'out-of-area': 'Outside the building area',
  'in-ground': 'Cannot build inside the ground',
  'over-budget': 'Not enough money',
  'material-locked': 'Not available here yet',
  duplicate: 'Already built',
  'same-point': '',
};

export class PlayScene extends Phaser.Scene {
  private level!: LevelEntry;
  private design!: BridgeDesign;
  private sim: Simulation | null = null;
  private mode: Mode = 'build';
  private tool: Tool = 'road';
  private ox = 0;
  private oy = 0;

  private world!: Phaser.GameObjects.Graphics;
  private beamsG!: Phaser.GameObjects.Graphics;
  private previewG!: Phaser.GameObjects.Graphics;
  private hintG!: Phaser.GameObjects.Graphics;
  private nodes!: Phaser.GameObjects.Container;
  private vehicle!: Phaser.GameObjects.Container;
  private chassisSprite!: Phaser.GameObjects.Image;
  private wheelSprites: Phaser.GameObjects.Image[] = [];
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private chips!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puffs!: Phaser.GameObjects.Particles.ParticleEmitter;

  private costText!: Phaser.GameObjects.Text;
  private costBar!: Phaser.GameObjects.Graphics;
  private toast!: Phaser.GameObjects.Text;
  private toolButtons = new Map<Tool, Button>();
  private goButton!: Button;
  private undoButton!: Button;
  private hintButton!: Button;
  private buildUi: Phaser.GameObjects.GameObject[] = [];
  private resultLayer: Phaser.GameObjects.Container | null = null;

  private dragFrom: Point | null = null;
  private dragTo: Point | null = null;
  private dragPointerId: number | null = null;
  private placeStreak = 0;
  private accumulator = 0;
  private timeScale = 1;
  private slowMoUntil = 0;
  private eventsSeen = 0;
  private splashed = false;
  private showHint = false;
  /** Beams that broke or were near breaking in the last failed attempt (shown while editing). */
  private weakBeams: Array<{ a: Point; b: Point }> = [];

  constructor() {
    super('play');
  }

  init(data: { levelId?: string }): void {
    const level = levelById(data.levelId ?? '') ?? levelById('w1-1');
    if (!level) throw new Error('No levels defined');
    this.level = level;
    this.design = new BridgeDesign(level, save.data.designs[level.id] ?? []);
    this.mode = 'build';
    this.tool = level.materials[0];
    this.sim = null;
    this.dragFrom = null;
    this.dragTo = null;
    this.dragPointerId = null;
    this.showHint = false;
    this.weakBeams = [];
    this.resultLayer = null;
    this.toolButtons.clear();
    this.buildUi = [];
    this.wheelSprites = [];
    const mid = (level.gapStart + level.gapEnd) / 2;
    this.ox = GAME_W / 2 - mid * PX_PER_M;
    this.oy = 390;
  }

  create(): void {
    addBackground(this);
    this.world = this.add.graphics();
    this.hintG = this.add.graphics();
    this.beamsG = this.add.graphics();
    this.previewG = this.add.graphics();
    this.nodes = this.add.container(0, 0);
    this.vehicle = this.add.container(0, 0);
    this.createEffects();
    this.drawWorld();
    this.createVehicle();
    this.createHud();
    this.redraw();
    this.bindInput();
    this.showToast(this.level.tip ?? `Level ${this.level.index}: ${this.level.name}`, 3500);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => platform.gameplayStop());
    platform.gameplayStart();
  }

  // ---------- coordinates ----------

  private toScreen(p: Point): Point {
    return { x: this.ox + p.x * PX_PER_M, y: this.oy - p.y * PX_PER_M };
  }

  private toWorld(x: number, y: number): Point {
    return { x: (x - this.ox) / PX_PER_M, y: (this.oy - y) / PX_PER_M };
  }

  // ---------- static world ----------

  private drawWorld(): void {
    const g = this.world;
    const { gapStart, gapEnd, leftHeight, rightHeight } = this.level;
    const water = this.toScreen({ x: 0, y: WATER_Y });
    // Water with a lighter top band.
    g.fillStyle(hex(C.water), 1);
    g.fillRect(0, water.y, GAME_W, GAME_H - water.y);
    g.fillStyle(hex(C.waterLight), 0.6);
    g.fillRect(0, water.y, GAME_W, 8);

    const cliff = (x0: number, x1: number, top: number, edgeRight: boolean) => {
      const a = this.toScreen({ x: x0, y: top });
      const b = this.toScreen({ x: x1, y: top });
      const w = b.x - a.x;
      g.fillStyle(hex(C.dirtDark), 1);
      g.fillRoundedRect(a.x, a.y + 6, w, GAME_H - a.y, { tl: edgeRight ? 0 : 24, tr: edgeRight ? 24 : 0, bl: 0, br: 0 });
      g.fillStyle(hex(C.dirt), 1);
      g.fillRoundedRect(a.x, a.y, w, GAME_H - a.y, { tl: edgeRight ? 0 : 24, tr: edgeRight ? 24 : 0, bl: 0, br: 0 });
      // Dirt stripes.
      g.fillStyle(hex(C.dirtDark), 0.35);
      for (let y = a.y + 40; y < GAME_H; y += 46) g.fillRect(a.x, y, w, 10);
      // Grass cap.
      g.fillStyle(hex(C.grass), 1);
      g.fillRoundedRect(a.x - (edgeRight ? 0 : 6), a.y - 8, w + 6, 22, 11);
      g.fillStyle(hex(C.grassLight), 1);
      g.fillRoundedRect(a.x - (edgeRight ? 0 : 6), a.y - 8, w + 6, 8, 4);
    };
    cliff(gapStart - 30, gapStart, leftHeight, true);
    cliff(gapEnd, gapEnd + 30, rightHeight, false);

    // Rock pillars under mid-gap anchors.
    for (const anchor of this.level.anchors) {
      if (anchor.x <= gapStart || anchor.x >= gapEnd) continue;
      const top = this.toScreen(anchor);
      g.fillStyle(hex('#9b8f86'), 1);
      g.fillRoundedRect(top.x - 22, top.y, 44, water.y - top.y + 10, 14);
      g.fillStyle(0xffffff, 0.15);
      g.fillRoundedRect(top.x - 16, top.y + 6, 10, water.y - top.y - 10, 5);
    }

    // Finish flag.
    const flag = this.toScreen({ x: gapEnd + 4, y: rightHeight });
    g.fillStyle(hex(C.ink), 1);
    g.fillRect(flag.x - 2, flag.y - 90, 5, 90);
    g.fillStyle(hex(C.gold), 1);
    g.fillTriangle(flag.x + 3, flag.y - 90, flag.x + 48, flag.y - 74, flag.x + 3, flag.y - 58);
  }

  private createEffects(): void {
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 120, max: 380 },
      lifespan: 600,
      scale: { start: 1.4, end: 0 },
      gravityY: 600,
      tint: [0xfff1a8, 0xffb347, 0xffffff],
      emitting: false,
    });
    this.chips = this.add.particles(0, 0, 'chip', {
      speed: { min: 80, max: 260 },
      lifespan: 1100,
      rotate: { min: 0, max: 360 },
      gravityY: 800,
      tint: [hex(C.wood), hex(C.woodLight)],
      emitting: false,
    });
    this.puffs = this.add.particles(0, 0, 'puff', {
      speed: { min: 30, max: 140 },
      lifespan: 900,
      scale: { start: 0.8, end: 2.2 },
      alpha: { start: 0.8, end: 0 },
      emitting: false,
    });
  }

  private createVehicle(): void {
    const preview = new Simulation(this.level, []);
    const v = preview.vehicle;
    const isTruck = v.def.id === 'truck';
    this.chassisSprite = this.add.image(0, 0, isTruck ? 'truck' : 'car').setOrigin(0.5, isTruck ? 0.68 : 0.62);
    this.chassisSprite.setDisplaySize((v.def.halfWidth * 2 + 0.3) * PX_PER_M, (v.def.halfWidth * 2 + 0.3) * PX_PER_M * (isTruck ? 120 / 260 : 96 / 172));
    this.vehicle.add(this.chassisSprite);
    for (const w of v.wheels) {
      const sprite = this.add.image(0, 0, 'wheel').setDisplaySize(w.radius * 2 * PX_PER_M, w.radius * 2 * PX_PER_M);
      this.wheelSprites.push(sprite);
      this.vehicle.add(sprite);
    }
    this.placeVehicle(preview);
  }

  private placeVehicle(sim: Simulation): void {
    const v = sim.vehicle;
    const c = this.toScreen(v);
    this.chassisSprite.setPosition(c.x, c.y).setRotation(-v.angle);
    v.wheels.forEach((w, i) => {
      const p = this.toScreen(w);
      this.wheelSprites[i]?.setPosition(p.x, p.y).setRotation(-w.angle);
    });
  }

  // ---------- HUD ----------

  private createHud(): void {
    button(this, 90, 50, '◀', () => this.scene.start('levels'), { width: 76, height: 56, fontSize: 30, color: C.blue, shade: C.blueDark });
    const title = label(this, GAME_W / 2, 40, `${this.level.index}. ${this.level.name}`, 34, C.white);
    title.setStroke(C.ink, 8);

    this.costBar = this.add.graphics();
    this.costText = this.add
      .text(GAME_W - 40, 40, '', { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: C.white })
      .setOrigin(1, 0.5);
    this.costText.setStroke(C.ink, 8);

    this.toast = this.add
      .text(GAME_W / 2, 100, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: C.white, align: 'center' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.toast.setStroke(C.ink, 7);

    // Bottom tool bar.
    const tools: Tool[] = [...this.level.materials, 'erase'];
    const colors: Record<Tool, [string, string]> = {
      road: [C.road, '#2d2938'],
      wood: [C.wood, '#9a6431'],
      steel: [C.steel, '#5f7390'],
      erase: [C.anchor, '#a8302a'],
    };
    tools.forEach((t, i) => {
      const name = t === 'erase' ? 'Erase' : MATERIALS[t].name;
      const b = button(this, 110 + i * 170, GAME_H - 52, name, () => this.selectTool(t), {
        width: 150,
        height: 60,
        fontSize: 24,
        color: colors[t][0],
        shade: colors[t][1],
      });
      this.toolButtons.set(t, b);
      this.buildUi.push(b);
    });
    this.undoButton = button(this, 110 + tools.length * 170, GAME_H - 52, 'Undo', () => this.undo(), { width: 130, height: 60, fontSize: 24, color: C.grey, shade: C.greyDark });
    this.buildUi.push(this.undoButton);
    this.hintButton = button(this, GAME_W - 330, GAME_H - 52, '💡 Hint', () => void this.requestHint(), { width: 150, height: 60, fontSize: 24, color: C.gold, shade: '#d29b1b', textColor: C.ink });
    this.hintButton.setVisible((save.data.fails[this.level.id] ?? 0) >= HINT_AFTER_FAILS);
    this.buildUi.push(this.hintButton);

    this.goButton = button(this, GAME_W - 120, GAME_H - 56, 'GO!', () => this.toggleSim(), { width: 190, height: 76, fontSize: 38, color: C.good, shade: C.goodDark });
    this.selectTool(this.tool);
  }

  private selectTool(tool: Tool): void {
    this.tool = tool;
    for (const [t, b] of this.toolButtons) b.setSelected(t === tool);
  }

  private updateCost(): void {
    const cost = this.design.cost;
    const { budget, starBudgets } = this.level;
    this.costText.setText(`$${cost.toLocaleString('en-US')} / $${budget.toLocaleString('en-US')}`);
    const g = this.costBar;
    g.clear();
    const x = GAME_W - 360;
    const y = 72;
    const w = 320;
    g.fillStyle(hex(C.ink), 0.5);
    g.fillRoundedRect(x, y, w, 14, 7);
    const ratio = Math.min(1, cost / budget);
    const color = cost <= starBudgets[1] ? C.good : cost <= starBudgets[0] ? C.gold : C.primary;
    if (ratio > 0) {
      g.fillStyle(hex(color), 1);
      g.fillRoundedRect(x, y, Math.max(14, w * ratio), 14, 7);
    }
    // Star thresholds as ticks on the bar.
    g.fillStyle(0xffffff, 1);
    for (const s of starBudgets) g.fillRect(x + (w * s) / budget - 1, y - 4, 3, 22);
    this.undoButton.setEnabled(this.design.canUndo);
  }

  private showToast(text: string, ms = 1600): void {
    if (!text) return;
    this.toast.setText(text).setAlpha(1).setY(100);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, y: 92, delay: ms, duration: 400 });
  }

  // ---------- input ----------

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || this.mode !== 'build' || this.dragPointerId !== null) return;
      if (p.y > GAME_H - 100 || p.y < 90) return; // tool bars
      sfx.unlock();
      const w = this.toWorld(p.x, p.y);
      if (this.tool === 'erase') {
        if (this.design.removeNear(w)) {
          sfx.erase();
          this.afterChange();
        }
        return;
      }
      const start = this.nearestNode(w);
      if (!start) {
        sfx.error();
        this.showToast('Start from a red anchor or a white joint');
        return;
      }
      this.dragPointerId = p.id;
      this.dragFrom = start;
      this.dragTo = start;
      this.redrawPreview();
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (p.id !== this.dragPointerId || !this.dragFrom || this.tool === 'erase') return;
      this.dragTo = this.reachablePoint(this.dragFrom, this.toWorld(p.x, p.y), this.tool);
      this.redrawPreview();
    });

    const finish = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.dragPointerId) return;
      const from = this.dragFrom;
      const to = this.dragTo;
      this.cancelDrag();
      if (!from || !to || this.tool === 'erase' || this.mode !== 'build') return;
      if (keyOf(from) === keyOf(to)) return;
      const result: AddResult = this.design.add(from, to, this.tool);
      if (result.ok) {
        this.placeStreak++;
        sfx.place(this.placeStreak);
        this.afterChange();
      } else {
        this.placeStreak = 0;
        sfx.error();
        this.showToast(REASONS[result.reason]);
      }
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, finish);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, finish);
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.cancelDrag());
    this.input.keyboard?.on('keydown-Z', (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) this.undo();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.toggleSim());
  }

  private cancelDrag(): void {
    this.dragFrom = null;
    this.dragTo = null;
    this.dragPointerId = null;
    this.previewG.clear();
  }

  private nearestNode(w: Point): Point | null {
    let best: Point | null = null;
    let bestDist = 0.5;
    for (const key of this.design.nodeKeys) {
      const p = pointOf(key);
      const d = distance(p, w);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  /** Snaps to the grid, pulling the end point back inside the material's reach. */
  private reachablePoint(from: Point, raw: Point, material: MaterialId): Point {
    const max = MATERIALS[material].maxLength;
    let target = raw;
    const d = distance(from, raw);
    if (d > max) target = { x: from.x + ((raw.x - from.x) / d) * max, y: from.y + ((raw.y - from.y) / d) * max };
    const snapped = snap(target);
    if (distance(from, snapped) <= max + 1e-6) return this.clampArea(snapped);
    let best = from;
    let bestDist = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const c = { x: snapped.x + dx, y: snapped.y + dy };
        if (distance(from, c) > max + 1e-6) continue;
        const dd = distance(c, target);
        if (dd < bestDist) {
          bestDist = dd;
          best = c;
        }
      }
    }
    return this.clampArea(best);
  }

  private clampArea(p: Point): Point {
    return {
      x: Math.max(this.level.gapStart - BUILD_MARGIN_X, Math.min(this.level.gapEnd + BUILD_MARGIN_X, p.x)),
      y: Math.max(BUILD_MIN_Y, Math.min(BUILD_MAX_Y, p.y)),
    };
  }

  private undo(): void {
    if (this.mode !== 'build') return;
    if (this.design.undo()) {
      sfx.erase();
      this.afterChange();
    }
  }

  private afterChange(): void {
    save.saveDesign(this.level.id, this.design.list);
    this.redraw();
  }

  private async requestHint(): Promise<void> {
    if (this.showHint) {
      this.showHint = false;
      this.redraw();
      return;
    }
    platform.gameplayStop();
    const ok = await platform.rewardedAd();
    platform.gameplayStart();
    if (!ok) {
      this.showToast('No hint this time. Try again soon!');
      return;
    }
    this.showHint = true;
    this.showToast('Follow the dotted ghost bridge');
    this.redraw();
  }

  // ---------- drawing ----------

  private redraw(): void {
    this.drawBeams();
    this.drawNodes();
    this.drawHint();
    this.updateCost();
  }

  private drawGrid(g: Phaser.GameObjects.Graphics): void {
    const { gapStart, gapEnd } = this.level;
    for (let x = gapStart - BUILD_MARGIN_X; x <= gapEnd + BUILD_MARGIN_X; x++) {
      for (let y = BUILD_MIN_Y; y <= BUILD_MAX_Y; y++) {
        if (this.design.insideTerrain({ x, y })) continue;
        const s = this.toScreen({ x, y });
        g.fillStyle(0xffffff, 0.35);
        g.fillCircle(s.x, s.y, 2.5);
      }
    }
  }

  private beamStyle(material: MaterialId): { width: number; color: string; light: string } {
    if (material === 'road') return { width: 14, color: C.road, light: C.roadLine };
    if (material === 'steel') return { width: 9, color: C.steel, light: C.steelLight };
    return { width: 9, color: C.wood, light: C.woodLight };
  }

  private strokeBeam(g: Phaser.GameObjects.Graphics, a: Point, b: Point, material: MaterialId, stress = 0, alpha = 1): void {
    const sa = this.toScreen(a);
    const sb = this.toScreen(b);
    const style = this.beamStyle(material);
    const main = stress > 0.05 ? mix(style.color, C.stress, Math.min(1, stress * 1.15)) : hex(style.color);
    g.lineStyle(style.width + 4, hex(C.ink), 0.9 * alpha);
    g.lineBetween(sa.x, sa.y, sb.x, sb.y);
    g.lineStyle(style.width, main, alpha);
    g.lineBetween(sa.x, sa.y, sb.x, sb.y);
    if (material === 'road') {
      // Dashed centre line.
      const len = Math.hypot(sb.x - sa.x, sb.y - sa.y);
      const ux = (sb.x - sa.x) / len;
      const uy = (sb.y - sa.y) / len;
      g.lineStyle(3, hex(style.light), alpha);
      for (let t = 8; t < len - 8; t += 22) g.lineBetween(sa.x + ux * t, sa.y + uy * t, sa.x + ux * Math.min(t + 10, len - 8), sa.y + uy * Math.min(t + 10, len - 8));
    } else {
      g.lineStyle(2, hex(style.light), 0.7 * alpha);
      g.lineBetween(sa.x, sa.y - 2, sb.x, sb.y - 2);
    }
  }

  private drawBeams(): void {
    const g = this.beamsG;
    g.clear();
    if (this.mode === 'build') {
      this.drawGrid(g);
      const order: MaterialId[] = ['wood', 'steel', 'road'];
      for (const m of order) for (const beam of this.design.list) if (beam.material === m) this.strokeBeam(g, pointOf(beam.a), pointOf(beam.b), m);
      return;
    }
    if (!this.sim) return;
    const states = this.sim.beamStates;
    for (const s of states) if (!s.beam || s.beam.material !== 'road') this.strokeBeam(g, s.a, s.b, s.beam.material, s.stress, s.broken ? 0 : 1);
    for (const s of states) if (s.beam.material === 'road') this.strokeBeam(g, s.a, s.b, 'road', s.stress);
  }

  private drawNodes(): void {
    this.nodes.removeAll(true);
    if (this.mode !== 'build') return;
    for (const key of this.design.nodeKeys) {
      const s = this.toScreen(pointOf(key));
      const anchor = this.design.isAnchor(key);
      this.nodes.add(this.add.image(s.x, s.y, anchor ? 'anchor' : 'node').setScale(anchor ? 0.9 : 0.8));
    }
  }

  private drawHint(): void {
    const g = this.hintG;
    g.clear();
    if (this.mode !== 'build') return;
    // Ghost of the last failed attempt: red glow under the beams that gave way.
    for (const w of this.weakBeams) {
      const a = this.toScreen(w.a);
      const b = this.toScreen(w.b);
      g.lineStyle(26, hex(C.stress), 0.28);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    if (!this.showHint) return;
    for (const beam of this.level.solution) {
      const a = this.toScreen(pointOf(beam.a));
      const b = this.toScreen(pointOf(beam.b));
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      g.lineStyle(beam.material === 'road' ? 10 : 7, 0xffffff, 0.55);
      for (let t = 0; t < len; t += 16) g.lineBetween(a.x + ux * t, a.y + uy * t, a.x + ux * Math.min(t + 9, len), a.y + uy * Math.min(t + 9, len));
    }
  }

  private redrawPreview(): void {
    const g = this.previewG;
    g.clear();
    if (!this.dragFrom || !this.dragTo || this.tool === 'erase') return;
    if (keyOf(this.dragFrom) === keyOf(this.dragTo)) return;
    const check = this.design.canAdd(this.dragFrom, this.dragTo, this.tool);
    this.strokeBeam(g, this.dragFrom, this.dragTo, this.tool, 0, 0.75);
    const end = this.toScreen(this.dragTo);
    g.lineStyle(4, check.ok ? hex(C.good) : hex(C.stress), 1);
    g.strokeCircle(end.x, end.y, 12);
  }

  // ---------- simulation ----------

  private toggleSim(): void {
    if (this.mode === 'result') return;
    if (this.mode === 'build') this.startSim();
    else this.stopSim();
  }

  private startSim(): void {
    this.cancelDrag();
    this.sim = new Simulation(this.level, this.design.list);
    this.mode = 'sim';
    this.accumulator = 0;
    this.timeScale = 1;
    this.slowMoUntil = 0;
    this.eventsSeen = 0;
    this.splashed = false;
    this.placeStreak = 0;
    sfx.go();
    this.goButton.setLabel('Edit');
    for (const o of this.buildUi) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    this.redraw();
  }

  private stopSim(): void {
    this.sim = null;
    this.mode = 'build';
    this.goButton.setLabel('GO!');
    for (const o of this.buildUi) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(true);
    this.hintButton.setVisible((save.data.fails[this.level.id] ?? 0) >= HINT_AFTER_FAILS);
    this.resultLayer?.destroy();
    this.resultLayer = null;
    this.placeVehicle(new Simulation(this.level, []));
    this.redraw();
  }

  override update(time: number, delta: number): void {
    if (this.mode !== 'sim' || !this.sim) return;
    const sim = this.sim;
    if (time > this.slowMoUntil) this.timeScale = Math.min(1, this.timeScale + delta / 400);
    // Clamp long frames (tab switch, slow phone) so physics never explodes.
    this.accumulator += (Math.min(delta, 50) / 1000) * this.timeScale;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 8 && sim.status === 'running') {
      sim.step();
      this.accumulator -= STEP;
      steps++;
    }
    this.handleEvents(sim, time);
    this.placeVehicle(sim);
    this.drawBeams();
    if (!this.splashed && sim.vehicle.y < WATER_Y + 0.3) {
      this.splashed = true;
      const s = this.toScreen({ x: sim.vehicle.x, y: WATER_Y });
      this.puffs.explode(16, s.x, s.y);
      sfx.splash();
    }
    if (sim.status !== 'running' || sim.time >= MAX_TIME) this.finish(sim);
  }

  private handleEvents(sim: Simulation, time: number): void {
    while (this.eventsSeen < sim.events.length) {
      const e = sim.events[this.eventsSeen++];
      const s = this.toScreen(e.at);
      if (e.material === 'wood') this.chips.explode(14, s.x, s.y);
      else this.sparks.explode(18, s.x, s.y);
      sfx.snap(e.material);
      this.cameras.main.shake(180, 0.006);
      if (this.eventsSeen === 1) {
        // Slow motion on the first break: the funny moment people share.
        this.timeScale = 0.25;
        this.slowMoUntil = time + 1100;
      }
    }
  }

  private finish(sim: Simulation): void {
    this.mode = 'result';
    const won = sim.status === 'won';
    const cost = this.design.cost;
    if (won) {
      const stars = starsFor(this.level, cost);
      const coins = save.recordWin(this.level.id, stars, cost);
      sfx.win(stars);
      this.time.delayedCall(350, () => this.showWin(stars, cost, coins));
    } else {
      save.recordFail(this.level.id);
      this.weakBeams = sim.beamStates
        .filter((s) => s.broken || s.stress > 0.8)
        .map((s) => ({ a: pointOf(s.beam.a), b: pointOf(s.beam.b) }));
      sfx.lose();
      this.time.delayedCall(700, () => this.showLoss(sim.lossReason ?? 'fell'));
    }
  }

  private resultPanel(height: number): Phaser.GameObjects.Container {
    this.resultLayer?.destroy();
    const layer = this.add.container(0, 0);
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, hex(C.ink), 0.35).setOrigin(0).setInteractive();
    layer.add([shade, panel(this, GAME_W / 2, GAME_H / 2, 620, height)]);
    layer.setDepth(10);
    this.resultLayer = layer;
    this.goButton.setVisible(false);
    return layer;
  }

  private showWin(stars: number, cost: number, coins: number): void {
    const layer = this.resultPanel(420);
    layer.add(label(this, GAME_W / 2, GAME_H / 2 - 150, 'Made it!', 56, C.ink));
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(GAME_W / 2 - 110 + i * 110, GAME_H / 2 - 50, i < stars ? 'star' : 'star-empty').setScale(0);
      layer.add(star);
      this.tweens.add({ targets: star, scale: i === 1 ? 1.6 : 1.3, delay: 200 + i * 220, duration: 380, ease: 'Back.easeOut' });
    }
    const next = this.level.starBudgets[stars === 1 ? 0 : 1];
    const sub = stars < 3 ? `Cost $${cost} · next star at $${next}` : `Cost $${cost} · perfect!`;
    layer.add(label(this, GAME_W / 2, GAME_H / 2 + 40, sub, 24, C.greyDark));
    if (coins > 0) layer.add(label(this, GAME_W / 2, GAME_H / 2 + 76, `+${coins} coins`, 24, C.primaryDark));
    const nxt = nextLevel(this.level.id);
    layer.add(button(this, GAME_W / 2 - 140, GAME_H / 2 + 145, 'Improve', () => this.stopSim(), { width: 220, height: 70, color: C.blue, shade: C.blueDark }));
    layer.add(
      button(this, GAME_W / 2 + 140, GAME_H / 2 + 145, nxt ? 'Next ▶' : 'Levels', async () => {
        await platform.commercialBreak();
        if (nxt) this.scene.start('play', { levelId: nxt.id });
        else this.scene.start('levels');
      }, { width: 220, height: 70, color: C.good, shade: C.goodDark }),
    );
  }

  private showLoss(reason: string): void {
    const layer = this.resultPanel(360);
    const title = reason === 'fell' ? 'Splash!' : reason === 'stuck' ? 'Stuck!' : 'Too slow!';
    const tip =
      reason === 'fell'
        ? 'Look for red beams: they broke first.'
        : reason === 'stuck'
          ? 'Is the road smooth and connected?'
          : 'The car ran out of time.';
    layer.add(label(this, GAME_W / 2, GAME_H / 2 - 110, title, 56, C.ink));
    layer.add(label(this, GAME_W / 2, GAME_H / 2 - 30, tip, 26, C.greyDark));
    layer.add(button(this, GAME_W / 2, GAME_H / 2 + 80, 'Fix it', () => this.stopSim(), { width: 260, height: 76, color: C.primary, shade: C.primaryDark }));
  }
}
