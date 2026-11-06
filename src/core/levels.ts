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

interface LevelSpec {
  name: string;
  gap: number;
  extraAnchors?: Point[];
  vehicle?: VehicleId;
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

function build(world: number, specs: LevelSpec[]): LevelEntry[] {
  return specs.map((spec, i) => {
    const solution = spec.solution(spec.gap);
    const solutionCost = costOf(solution);
    const three = roundUp(solutionCost, 50);
    return {
      id: `w${world}-${i + 1}`,
      world,
      index: i + 1,
      name: spec.name,
      gapStart: 0,
      gapEnd: spec.gap,
      leftHeight: 0,
      rightHeight: 0,
      anchors: [{ x: 0, y: 0 }, { x: spec.gap, y: 0 }, { x: 0, y: -2 }, { x: spec.gap, y: -2 }, ...(spec.extraAnchors ?? [])],
      budget: roundUp(solutionCost * (spec.slack ?? 1.6), 100),
      starBudgets: [roundUp(three * 1.2, 50), three],
      vehicle: spec.vehicle ?? 'car',
      materials: spec.materials ?? ['road', 'wood'],
      tip: spec.tip,
      solution,
    };
  });
}

export const WORLDS = [{ id: 1, name: 'Farm Valley', levels: build(1, FARM) }];

export const ALL_LEVELS: LevelEntry[] = WORLDS.flatMap((w) => w.levels);

export function levelById(id: string): LevelEntry | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}

export function nextLevel(id: string): LevelEntry | undefined {
  const i = ALL_LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? ALL_LEVELS[i + 1] : undefined;
}
