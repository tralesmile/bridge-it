import { MATERIALS, type MaterialId } from './materials';
import type { Beam, LevelDef, Point } from './types';

/** Grid step in metres. All player nodes snap to this grid. */
export const GRID = 1;

/** Build area limits relative to the level gap. */
export const BUILD_MARGIN_X = 3;
export const BUILD_MIN_Y = -6;
export const BUILD_MAX_Y = 6;

export const keyOf = (p: Point): string => `${round(p.x)},${round(p.y)}`;

export const pointOf = (key: string): Point => {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
};

const round = (v: number): number => Math.round(v * 1000) / 1000;

export const snap = (p: Point): Point => ({
  x: Math.round(p.x / GRID) * GRID,
  y: Math.round(p.y / GRID) * GRID,
});

export const distance = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y);

const beamId = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

export type AddResult =
  | { ok: true }
  | { ok: false; reason: 'same-point' | 'in-ground' | 'too-long' | 'duplicate' | 'out-of-area' | 'in-lane' | 'material-locked' | 'over-budget' };

/**
 * The player's bridge design: a set of beams between points.
 * Pure data, no physics, so it is easy to test, save and undo.
 */
export class BridgeDesign {
  private beams = new Map<string, Beam>();
  private history: Beam[][] = [];

  constructor(private readonly level: LevelDef, initial: Beam[] = []) {
    for (const beam of initial) this.beams.set(beamId(beam.a, beam.b), { ...beam });
  }

  /**
   * Loads a saved design, dropping beams that break the level rules (a level may change between versions).
   * Starts with an empty undo history.
   */
  static restore(level: LevelDef, saved: Beam[]): BridgeDesign {
    const d = new BridgeDesign(level);
    for (const beam of saved) {
      if (!beam || typeof beam.a !== 'string' || typeof beam.b !== 'string' || !(beam.material in MATERIALS)) continue;
      d.add(pointOf(beam.a), pointOf(beam.b), beam.material);
    }
    d.history = [];
    return d;
  }

  get list(): Beam[] {
    return [...this.beams.values()];
  }

  get anchorKeys(): Set<string> {
    return new Set(this.level.anchors.map(keyOf));
  }

  /** Every point that beams touch, plus all anchors. */
  get nodeKeys(): Set<string> {
    const keys = this.anchorKeys;
    for (const beam of this.beams.values()) {
      keys.add(beam.a);
      keys.add(beam.b);
    }
    return keys;
  }

  isAnchor(key: string): boolean {
    return this.anchorKeys.has(key);
  }

  inBuildArea(p: Point): boolean {
    return (
      p.x >= this.level.gapStart - BUILD_MARGIN_X &&
      p.x <= this.level.gapEnd + BUILD_MARGIN_X &&
      p.y >= BUILD_MIN_Y &&
      p.y <= BUILD_MAX_Y
    );
  }

  /** True if a beam from a to b would touch the inside of one of the level's ship lanes. */
  crossesLane(a: Point, b: Point): boolean {
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    return (this.level.shipLanes ?? []).some((lane) => lo < lane.x1 && hi > lane.x0);
  }

  /** True if p is buried inside a cliff (anchors on the cliff face are fine). */
  insideTerrain(p: Point): boolean {
    if (this.isAnchor(keyOf(p))) return false;
    const { gapStart, gapEnd, leftHeight, rightHeight } = this.level;
    return (p.x <= gapStart && p.y < leftHeight) || (p.x >= gapEnd && p.y < rightHeight);
  }

  static beamCost(beam: Beam): number {
    const length = distance(pointOf(beam.a), pointOf(beam.b));
    return Math.round(length * MATERIALS[beam.material].costPerMetre);
  }

  get cost(): number {
    let total = 0;
    for (const beam of this.beams.values()) total += BridgeDesign.beamCost(beam);
    return total;
  }

  canAdd(a: Point, b: Point, material: MaterialId): AddResult {
    const ka = keyOf(a);
    const kb = keyOf(b);
    if (ka === kb) return { ok: false, reason: 'same-point' };
    if (!this.level.materials.includes(material)) return { ok: false, reason: 'material-locked' };
    if (!this.inBuildArea(a) || !this.inBuildArea(b)) return { ok: false, reason: 'out-of-area' };
    if (this.insideTerrain(a) || this.insideTerrain(b)) return { ok: false, reason: 'in-ground' };
    if (this.crossesLane(a, b)) return { ok: false, reason: 'in-lane' };
    if (distance(a, b) > MATERIALS[material].maxLength + 1e-6) return { ok: false, reason: 'too-long' };
    const existing = this.beams.get(beamId(ka, kb));
    if (existing && existing.material === material) return { ok: false, reason: 'duplicate' };
    const extra = BridgeDesign.beamCost({ a: ka, b: kb, material }) - (existing ? BridgeDesign.beamCost(existing) : 0);
    if (this.cost + extra > this.level.budget) return { ok: false, reason: 'over-budget' };
    return { ok: true };
  }

  /** Adds a beam (replacing any beam between the same two points). */
  add(a: Point, b: Point, material: MaterialId): AddResult {
    const check = this.canAdd(a, b, material);
    if (!check.ok) return check;
    this.snapshot();
    const ka = keyOf(a);
    const kb = keyOf(b);
    this.beams.set(beamId(ka, kb), { a: ka, b: kb, material });
    return check;
  }

  /** Removes the beam closest to point p, if within maxDist. Returns true if removed. */
  removeNear(p: Point, maxDist = 0.4): boolean {
    let best: string | null = null;
    let bestDist = maxDist;
    for (const [id, beam] of this.beams) {
      const d = distanceToSegment(p, pointOf(beam.a), pointOf(beam.b));
      if (d < bestDist) {
        bestDist = d;
        best = id;
      }
    }
    if (best === null) return false;
    this.snapshot();
    this.beams.delete(best);
    return true;
  }

  clear(): void {
    if (this.beams.size === 0) return;
    this.snapshot();
    this.beams.clear();
  }

  undo(): boolean {
    const previous = this.history.pop();
    if (!previous) return false;
    this.beams.clear();
    for (const beam of previous) this.beams.set(beamId(beam.a, beam.b), beam);
    return true;
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  private snapshot(): void {
    this.history.push(this.list.map((b) => ({ ...b })));
    if (this.history.length > 200) this.history.shift();
  }
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}
