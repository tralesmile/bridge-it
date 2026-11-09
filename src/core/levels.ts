import { MATERIALS, type MaterialId } from './materials';
import type { Beam, LevelDef, Point, VehicleId } from './types';

/** Helpers that write common bridge shapes. Used for level solutions (hints) and tests. */
const k = (x: number, y: number): string => `${x},${y}`;

export function roadDeck(x0: number, x1: number, y = 0): Beam[] {
  const beams: Beam[] = [];
  for (let x = x0; x < x1; x += 2) beams.push({ a: k(x, y), b: k(Math.min(x + 2, x1), y), material: 'road' });
  return beams;
}

/** A Warren truss above the deck: triangles 2 m wide, 1 m tall. */
export function warrenTruss(x0: number, x1: number, material: MaterialId = 'wood', y = 0, h = 1): Beam[] {
  const beams: Beam[] = [];
  for (let x = x0; x < x1; x += 2) {
    beams.push({ a: k(x, y), b: k(x + 1, y + h), material }, { a: k(x + 1, y + h), b: k(x + 2, y), material });
    if (x + 2 < x1) beams.push({ a: k(x + 1, y + h), b: k(x + 3, y + h), material });
  }
  return beams;
}

export interface LevelEntry extends LevelDef {
  /** A known working design. Shown as the hint, and checked by tests. */
  solution: Beam[];
}

export interface LevelSpec {
  name: string;
  gap: number;
  extraAnchors?: Point[];
  vehicle?: VehicleId;
  /** Cliff top heights (default 0) and flag distance (default 4). */
  leftHeight?: number;
  rightHeight?: number;
  goalDistance?: number;
  materials?: MaterialId[];
  solution: (gap: number) => Beam[];
  /** Budget as a multiple of the solution cost. */
  slack?: number;
  tip?: string;
}

const FARM: LevelSpec[] = [
  { name: 'First Crossing', gap: 2, materials: ['road'], solution: (g) => roadDeck(0, g), slack: 1.5, tip: 'Drag from a red anchor to draw a road.' },
  { name: 'Stepping Stone', gap: 4, materials: ['road', 'wood'], extraAnchors: [{ x: 2, y: -2 }], solution: (g) => [...roadDeck(0, g), { a: '2,0', b: '2,-2', material: 'wood' }], tip: 'Long roads sag. Prop them up with wood.' },
  { name: 'Triangle Power', gap: 4, materials: ['road', 'wood'], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g)], tip: 'Triangles never bend. Squares do.' },
  { name: 'Three Hops', gap: 6, materials: ['road', 'wood'], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g)] },
  { name: 'Wide River', gap: 8, materials: ['road', 'wood'], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g)], slack: 1.3 },
  { name: 'Rock Pillar', gap: 8, materials: ['road', 'wood'], extraAnchors: [{ x: 4, y: -2 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, 4), ...warrenTruss(4, g), { a: '4,0', b: '4,-2', material: 'wood' }], tip: 'Use the rock to split one long bridge into two short ones.' },
  { name: 'Hay Truck', gap: 4, vehicle: 'truck', materials: ['road', 'wood', 'steel'], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g, 'steel')], tip: 'Heavy truck! Steel is strong but expensive.' },
  { name: 'Big Valley', gap: 10, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }, { x: 6, y: -2 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), { a: '4,0', b: '4,-2', material: 'wood' }, { a: '6,0', b: '6,-2', material: 'wood' }], slack: 1.25 },
  { name: 'High Cliff', gap: 16, leftHeight: 1, goalDistance: 5, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }, { x: 8, y: -2 }, { x: 12, y: -2 }], solution: (g) => [{ a: '0,1', b: '2,0', material: 'road' }, ...roadDeck(2, g), ...warrenTruss(2, g), { a: '4,0', b: '4,-2', material: 'wood' }, { a: '8,0', b: '8,-2', material: 'wood' }, { a: '12,0', b: '12,-2', material: 'wood' }], slack: 1.25, tip: 'You start on a high cliff. Use the rocks below for support.' },
  { name: 'Long Haul', gap: 12, vehicle: 'truck', materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }, { x: 8, y: -2 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), { a: '4,0', b: '4,-2', material: 'wood' }, { a: '8,0', b: '8,-2', material: 'wood' }], slack: 1.3, tip: 'A truck on a long bridge. Rocks help a lot.' },
  { name: 'Little Brook', gap: 6, materials: ['road', 'wood'], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g)], slack: 1.25, tip: 'A short gap, but money is tight. Build only what you need.' },
  { name: 'Two Rocks', gap: 12, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }, { x: 8, y: -2 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), { a: '4,0', b: '4,-2', material: 'wood' }, { a: '8,0', b: '8,-2', material: 'wood' }], slack: 1.2, tip: 'Use both rocks. Less wood means more stars.' },
  { name: 'Heavy Load', gap: 8, vehicle: 'truck', materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g, 'steel'), { a: '4,0', b: '4,-2', material: 'wood' }], slack: 1.3 },
  { name: 'Deep Gorge', gap: 14, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }, { x: 8, y: -2 }, { x: 10, y: -2 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), { a: '4,0', b: '4,-2', material: 'wood' }, { a: '8,0', b: '8,-2', material: 'wood' }, { a: '10,0', b: '10,-2', material: 'wood' }], slack: 1.25 },
  { name: 'Farm Finale', gap: 16, vehicle: 'truck', goalDistance: 5, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }, { x: 8, y: -2 }, { x: 12, y: -2 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), { a: '4,0', b: '4,-2', material: 'wood' }, { a: '8,0', b: '8,-2', material: 'wood' }, { a: '12,0', b: '12,-2', material: 'wood' }], slack: 1.3, tip: 'The big one. A heavy truck on a wide gap.' },
];

/** Rope hangers from high anchors (pylons) holding up a plain road deck. Cars only: a truck snaps them. */
const hangers = (gap: number, step: number, y: number): Point[] => {
  const pts: Point[] = [];
  for (let x = step; x < gap; x += step) pts.push({ x, y });
  return pts;
};
const hangerRopes = (gap: number, step: number, y: number): Beam[] =>
  hangers(gap, step, y).map((p) => ({ a: `${p.x},0`, b: `${p.x},${p.y}`, material: 'rope' as const }));

const CANYON: LevelSpec[] = [
  { name: 'Hanging Bridge', gap: 8, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(8, 2, 3), solution: (g) => [...roadDeck(0, g), ...hangerRopes(g, 2, 3)], tip: 'Ropes pull but never push. Hang the road from the high posts.' },
  { name: 'Rope Hangers', gap: 12, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(12, 2, 3), solution: (g) => [...roadDeck(0, g), ...hangerRopes(g, 2, 3)], slack: 1.3 },
  { name: 'Tall Posts', gap: 16, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(16, 2, 4), solution: (g) => [...roadDeck(0, g), ...hangerRopes(g, 2, 4)], slack: 1.3, tip: 'Ropes are cheap. Roads are not.' },
  { name: 'Canyon Mouth', gap: 14, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(14, 2, 4), solution: (g) => [...roadDeck(0, g), ...hangerRopes(g, 2, 4)], slack: 1.2 },
  { name: 'Rail Gorge', gap: 20, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(20, 2, 4), solution: (g) => [...roadDeck(0, g), ...hangerRopes(g, 2, 4)], slack: 1.25, tip: 'A very wide canyon. Hang it all.' },
  { name: 'Sparse Posts', gap: 12, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(12, 6, 4), solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), ...hangerRopes(g, 6, 4)], slack: 1.3, tip: 'Only one post. A truss and one rope can share the work.' },
  { name: 'Long Cable', gap: 16, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(16, 6, 4), solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), ...hangerRopes(g, 6, 4)], slack: 1.3 },
  { name: 'Grand Canyon', gap: 28, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(28, 4, 4), solution: (g) => [...roadDeck(0, g), ...hangerRopes(g, 4, 4)], slack: 1.25, tip: 'Very wide. The screen zooms out to fit it.' },
  { name: 'Skyline Span', gap: 24, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(24, 2, 4), solution: (g) => [...roadDeck(0, g), ...hangerRopes(g, 2, 4)], slack: 1.3 },
  { name: 'Canyon Finale', gap: 32, goalDistance: 5, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(32, 4, 4), solution: (g) => [...roadDeck(0, g), ...hangerRopes(g, 4, 4)], slack: 1.25, tip: 'The longest bridge yet. Ropes only pull, so hang the road.' },
];

const roundUp = (v: number, step: number): number => Math.ceil(v / step) * step;

function costOf(beams: Beam[]): number {
  let total = 0;
  for (const beam of beams) {
    const [ax, ay] = beam.a.split(',').map(Number);
    const [bx, by] = beam.b.split(',').map(Number);
    total += Math.round(Math.hypot(bx - ax, by - ay) * MATERIALS[beam.material].costPerMetre);
  }
  return total;
}

export function build(world: number, specs: LevelSpec[]): LevelEntry[] {
  return specs.map((spec, i) => {
    const solution = spec.solution(spec.gap);
    const solutionCost = costOf(solution);
    const lh = spec.leftHeight ?? 0;
    const rh = spec.rightHeight ?? 0;
    const three = roundUp(solutionCost, 50);
    return {
      id: `w${world}-${i + 1}`,
      world,
      index: i + 1,
      name: spec.name,
      gapStart: 0,
      gapEnd: spec.gap,
      leftHeight: spec.leftHeight ?? 0,
      rightHeight: spec.rightHeight ?? 0,
      goalDistance: spec.goalDistance,
      anchors: [{ x: 0, y: lh }, { x: spec.gap, y: rh }, { x: 0, y: lh - 2 }, { x: spec.gap, y: rh - 2 }, ...(spec.extraAnchors ?? [])],
      budget: roundUp(solutionCost * (spec.slack ?? 1.6), 100),
      starBudgets: [roundUp(three * 1.2, 50), three],
      vehicle: spec.vehicle ?? 'car',
      materials: spec.materials ?? ['road', 'wood'],
      tip: spec.tip,
      solution,
    };
  });
}

export const WORLDS = [
  { id: 1, name: 'Farm Valley', levels: build(1, FARM) },
  { id: 2, name: 'Canyon Rails', levels: build(2, CANYON) },
];

export const ALL_LEVELS: LevelEntry[] = WORLDS.flatMap((w) => w.levels);

export function levelById(id: string): LevelEntry | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}

export function nextLevel(id: string): LevelEntry | undefined {
  const i = ALL_LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? ALL_LEVELS[i + 1] : undefined;
}

/** Plain JSON text of a level (id, rules and solution). Used by the level editor and share codes. */
export function levelToJson(level: LevelEntry): string {
  return JSON.stringify(level, null, 2);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isPoint = (v: unknown): v is Point => !!v && isNum((v as Point).x) && isNum((v as Point).y);

/**
 * Reads level JSON. Returns the level, or an error text. Checks shape only;
 * whether the solution wins is checked by the simulation (tests do this for built-in levels).
 */
export function levelFromJson(text: string): { ok: true; level: LevelEntry } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This is not valid JSON.' };
  }
  const l = raw as Partial<LevelEntry> | null;
  if (!l || typeof l !== 'object') return { ok: false, error: 'A level must be an object.' };
  if (typeof l.id !== 'string' || typeof l.name !== 'string') return { ok: false, error: 'Missing id or name.' };
  for (const key of ['world', 'index', 'gapStart', 'gapEnd', 'leftHeight', 'rightHeight', 'budget'] as const) {
    if (!isNum(l[key])) return { ok: false, error: `"${key}" must be a number.` };
  }
  if (l.gapEnd! <= l.gapStart!) return { ok: false, error: 'The gap must be wider than 0.' };
  if (l.goalDistance !== undefined && !isNum(l.goalDistance)) return { ok: false, error: '"goalDistance" must be a number.' };
  if (!Array.isArray(l.anchors) || !l.anchors.every(isPoint)) return { ok: false, error: '"anchors" must be a list of points.' };
  if (!Array.isArray(l.starBudgets) || l.starBudgets.length !== 2 || !l.starBudgets.every(isNum)) return { ok: false, error: '"starBudgets" must have 2 numbers.' };
  if (l.vehicle !== 'car' && l.vehicle !== 'truck') return { ok: false, error: 'Unknown vehicle.' };
  if (!Array.isArray(l.materials) || !l.materials.every((m) => m in MATERIALS)) return { ok: false, error: 'Unknown material.' };
  if (!Array.isArray(l.solution) || !l.solution.every((b) => b && typeof b.a === 'string' && typeof b.b === 'string' && b.material in MATERIALS)) {
    return { ok: false, error: '"solution" must be a list of beams.' };
  }
  return { ok: true, level: l as LevelEntry };
}
