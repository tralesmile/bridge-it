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

/** Warren truss with wood diagonals and a steel top chord (cheap way to carry a truck). */
export function steelTopTruss(x0: number, x1: number, y = 0, h = 1): Beam[] {
  return warrenTruss(x0, x1, 'wood', y, h).map((b) => (b.a.endsWith(`,${y + h}`) && b.b.endsWith(`,${y + h}`) ? { ...b, material: 'steel' } : b));
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
  { name: 'Hay Truck', gap: 6, vehicle: 'truck', materials: ['road', 'wood', 'steel'], solution: (g) => [...roadDeck(0, g), ...steelTopTruss(0, g)], tip: 'Heavy truck! Wood alone breaks. Steel is strong but expensive: use a little.', slack: 1.4 },
  { name: 'Big Valley', gap: 10, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }, { x: 6, y: -2 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), { a: '4,0', b: '4,-2', material: 'wood' }, { a: '6,0', b: '6,-2', material: 'wood' }], slack: 1.25 },
  { name: 'High Cliff', gap: 16, leftHeight: 1, goalDistance: 5, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }, { x: 8, y: -2 }, { x: 12, y: -2 }], solution: (g) => [{ a: '0,1', b: '2,0', material: 'road' }, ...roadDeck(2, g), ...warrenTruss(2, g), { a: '4,0', b: '4,-2', material: 'wood' }, { a: '8,0', b: '8,-2', material: 'wood' }, { a: '12,0', b: '12,-2', material: 'wood' }], slack: 1.25, tip: 'You start on a high cliff. Use the rocks below for support.' },
  { name: 'Long Haul', gap: 12, vehicle: 'truck', materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }, { x: 8, y: -2 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), { a: '4,0', b: '4,-2', material: 'wood' }, { a: '8,0', b: '8,-2', material: 'wood' }], slack: 1.3, tip: 'A truck on a long bridge. Rocks help a lot.' },
  { name: 'Little Brook', gap: 6, materials: ['road', 'wood'], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g)], slack: 1.25, tip: 'A short gap, but money is tight. Build only what you need.' },
  { name: 'Two Rocks', gap: 12, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }, { x: 8, y: -2 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), { a: '4,0', b: '4,-2', material: 'wood' }, { a: '8,0', b: '8,-2', material: 'wood' }], slack: 1.2, tip: 'Use both rocks. Less wood means more stars.' },
  { name: 'Heavy Load', gap: 8, vehicle: 'truck', materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, 4), ...warrenTruss(4, g), { a: '4,0', b: '4,-2', material: 'wood' }], slack: 1.3, tip: 'Too heavy for wood alone. Stand the bridge on the rock.' },
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

/** Rocks below the deck every `step` metres, and wood or steel legs down to them (for trucks). */
const rockPosts = (gap: number, step: number): Point[] => {
  const pts: Point[] = [];
  for (let x = step; x < gap; x += step) pts.push({ x, y: -2 });
  return pts;
};
const rockLegs = (gap: number, step: number, material: MaterialId = 'wood'): Beam[] =>
  rockPosts(gap, step).map((p) => ({ a: `${p.x},0`, b: `${p.x},-2`, material }));

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
  { name: 'Freight Rails', gap: 12, vehicle: 'truck', materials: ['road', 'wood', 'steel', 'rope'], extraAnchors: rockPosts(12, 4), solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), ...rockLegs(g, 4)], slack: 1.3, tip: 'Trucks snap ropes. Use a truss and rocks.' },
  { name: 'Ore Train', gap: 16, vehicle: 'truck', materials: ['road', 'wood', 'steel', 'rope'], extraAnchors: rockPosts(16, 4), solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), ...rockLegs(g, 4)], slack: 1.25 },
  { name: 'Iron Bridge', gap: 20, vehicle: 'truck', materials: ['road', 'wood', 'steel', 'rope'], extraAnchors: rockPosts(20, 4), solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), ...rockLegs(g, 4)], slack: 1.25 },
  { name: 'Tall Rocks', gap: 24, vehicle: 'truck', materials: ['road', 'wood', 'steel', 'rope'], extraAnchors: rockPosts(24, 6), solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), ...rockLegs(g, 6, 'steel')], slack: 1.25, tip: 'Rocks far apart need strong steel legs.' },
  { name: 'Little Train', gap: 12, vehicle: 'train', materials: ['road', 'wood', 'steel', 'rope'], extraAnchors: rockPosts(12, 4), solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), ...rockLegs(g, 4, 'steel')], slack: 1.3, tip: 'A long, heavy train. Steel legs on the rocks hold it.' },
  { name: 'Canyon Finale', gap: 32, goalDistance: 5, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(32, 4, 4), solution: (g) => [...roadDeck(0, g), ...hangerRopes(g, 4, 4)], slack: 1.25, tip: 'The longest bridge yet. Ropes only pull, so hang the road.' },
];

/**
 * World 3 Pirate Bay, still being made: tested like other levels, opened by id, not shown in menus.
 * Moves into WORLDS when it has 15 levels.
 */
const beam = (a: string, b: string, material: MaterialId): Beam => ({ a, b, material });
/** Three ropes from a mast top at (x, h) down to the deck at x-2, x and x+2. */
const fanRopes = (x: number, h: number): Beam[] => [x - 2, x, x + 2].map((d) => beam(`${x},${h}`, `${d},0`, 'rope'));

const PIRATE: LevelSpec[] = [
  { name: 'Low Dock', gap: 8, rightHeight: -1, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }], solution: (g) => [{ a: '0,0', b: '2,-1', material: 'road' }, ...roadDeck(2, g, -1), { a: '4,-1', b: '4,-2', material: 'wood' }, { a: '0,-2', b: '2,-1', material: 'wood' }, { a: '4,-2', b: '6,-1', material: 'wood' }], slack: 1.3, tip: 'The far dock is lower. A gentle slope down is fine.' },
  { name: 'Ramp Foot', gap: 8, vehicle: 'truck', leftHeight: 1, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 2, y: -2 }, { x: 4, y: -2 }, { x: 6, y: -2 }], solution: (g) => [{ a: '0,1', b: '2,0', material: 'road' }, ...roadDeck(2, g), { a: '2,0', b: '2,-2', material: 'steel' }, { a: '4,0', b: '4,-2', material: 'wood' }, { a: '6,0', b: '6,-2', material: 'wood' }], slack: 1.3, tip: 'The bottom of the ramp carries the whole truck. Make it strong.' },
  { name: 'Plank Walk', gap: 6, materials: ['road', 'wood'], extraAnchors: [{ x: 3, y: -1 }], solution: (g) => [...roadDeck(0, g), beam('3,-1', '2,0', 'wood'), beam('3,-1', '4,0', 'wood')], slack: 1.3, tip: 'One small rock. Two short planks from it are enough.' },
  { name: "Crow's Nest", gap: 12, materials: ['road', 'wood', 'rope'], extraAnchors: [{ x: 4, y: 4 }, { x: 8, y: 4 }], solution: (g) => [...roadDeck(0, g), ...[4, 8].flatMap((m) => fanRopes(m, 4))], slack: 1.3, tip: 'Two masts. Hang the road with ropes in a fan.' },
  { name: 'Gangplank', gap: 6, leftHeight: 2, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 2, y: -2 }, { x: 4, y: -2 }], solution: () => [beam('0,2', '2,1', 'road'), beam('2,1', '4,0', 'road'), beam('4,0', '6,0', 'road'), beam('2,1', '2,-2', 'steel')], slack: 1.3, tip: 'Walk down from the high ship. Keep the slope gentle.' },
  { name: 'Tide Pools', gap: 10, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 3, y: -2 }, { x: 7, y: -2 }], solution: (g) => [...roadDeck(0, g), ...[3, 7].flatMap((x) => [beam(`${x},-2`, `${x - 1},0`, 'wood'), beam(`${x},-2`, `${x + 1},0`, 'wood')]), ...[0, 4, 8].flatMap((x) => warrenTruss(x, x + 2))], slack: 1.3, tip: 'The rocks are between the road joints. Lean planks on them.' },
  { name: 'Rum Barrels', gap: 8, vehicle: 'truck', rightHeight: -1, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -3 }], solution: (g) => [beam('0,0', '2,-1', 'road'), ...roadDeck(2, g, -1), beam('4,-1', '4,-3', 'wood'), beam('0,-2', '2,-1', 'wood'), beam('4,-3', '2,-1', 'steel'), beam('4,-3', '6,-1', 'steel')], slack: 1.3, tip: 'A heavy truck goes down to the low dock. Spread the load from the rock.' },
  { name: 'Shipwreck', gap: 12, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -3 }, { x: 8, y: -1 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, g), beam('8,0', '8,-1', 'wood')], slack: 1.3, tip: 'Not every rock is worth using.' },
  { name: 'Treasure Island', gap: 16, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 7, y: -1 }, { x: 9, y: -1 }], solution: (g) => [...roadDeck(0, g), ...warrenTruss(0, 6), ...warrenTruss(10, g), ...[7, 9].flatMap((x) => [beam(`${x},-1`, `${x - 1},0`, 'wood'), beam(`${x},-1`, `${x + 1},0`, 'wood')])], slack: 1.25, tip: 'Rest the middle on the island. Trusses for the rest.' },
  { name: 'Rope Ladder', gap: 16, materials: ['road', 'wood', 'rope'], extraAnchors: [{ x: 4, y: 4 }, { x: 8, y: 4 }, { x: 12, y: 4 }], solution: (g) => [...roadDeck(0, g), ...[4, 8, 12].flatMap((m) => [beam(`${m},4`, `${m - 2},0`, 'rope'), beam(`${m},4`, `${m + 2},0`, 'rope')])], slack: 1.3, tip: 'Three masts. Two ropes each can be enough.' },
  { name: 'Cannon Cart', gap: 12, vehicle: 'truck', rightHeight: -1, materials: ['road', 'wood', 'steel', 'rope'], extraAnchors: [{ x: 4, y: -2 }, { x: 8, y: -3 }], solution: () => [...roadDeck(0, 8), beam('8,0', '10,-1', 'road'), beam('10,-1', '12,-1', 'road'), ...warrenTruss(0, 4), ...warrenTruss(4, 8), beam('4,0', '4,-2', 'wood'), beam('8,0', '8,-3', 'steel'), beam('8,-3', '10,-1', 'steel')], slack: 1.3, tip: 'A heavy cannon cart. Ropes will snap: use rocks and steel.' },
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

/** Worlds still being made (see PIRATE). Not in menus or progress. */
export const DRAFT_WORLDS = [{ id: 3, name: 'Pirate Bay', levels: build(3, PIRATE) }];
export const DRAFT_LEVELS: LevelEntry[] = DRAFT_WORLDS.flatMap((w) => w.levels);

export function levelById(id: string): LevelEntry | undefined {
  return ALL_LEVELS.find((l) => l.id === id) ?? DRAFT_LEVELS.find((l) => l.id === id);
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
  if (l.vehicle !== 'car' && l.vehicle !== 'truck' && l.vehicle !== 'train') return { ok: false, error: 'Unknown vehicle.' };
  if (!Array.isArray(l.materials) || !l.materials.every((m) => m in MATERIALS)) return { ok: false, error: 'Unknown material.' };
  if (!Array.isArray(l.solution) || !l.solution.every((b) => b && typeof b.a === 'string' && typeof b.b === 'string' && b.material in MATERIALS)) {
    return { ok: false, error: '"solution" must be a list of beams.' };
  }
  return { ok: true, level: l as LevelEntry };
}
