import { distance, pointOf } from './bridge';
import { ALL_LEVELS, roadDeck, warrenTruss } from './levels';
import { MATERIALS } from './materials';
import { Simulation } from './simulation';
import type { Beam, LevelDef } from './types';

export interface SimpleDesign {
  name: string;
  /** True if the design is within the level budget. */
  affordable: boolean;
  cost: number;
  won: boolean;
}

export interface DifficultyRow {
  id: string;
  name: string;
  gap: number;
  solutionCost: number;
  threeStarBudget: number;
  budget: number;
  /** Solution cost as a share of the budget (higher = tighter level). */
  tightness: number;
  designs: SimpleDesign[];
  /** Simple designs that win AND fit the budget: a sign the level is too easy. */
  cheapWins: string[];
}

export function beamsCost(beams: Beam[]): number {
  let total = 0;
  for (const b of beams) total += Math.round(distance(pointOf(b.a), pointOf(b.b)) * MATERIALS[b.material].costPerMetre);
  return total;
}

/** Plain designs a lazy player might try: bare road, road + wood truss, road + steel truss. */
export function simpleDesigns(level: LevelDef): { name: string; beams: Beam[] }[] {
  const gap = level.gapEnd - level.gapStart;
  const out = [{ name: 'road only', beams: roadDeck(level.gapStart, level.gapEnd) }];
  for (const m of ['wood', 'steel'] as const) {
    if (level.materials.includes(m)) {
      out.push({ name: `road + ${m} truss`, beams: [...roadDeck(level.gapStart, level.gapEnd), ...warrenTruss(level.gapStart, level.gapEnd, m)] });
    }
  }
  return gap > 0 ? out : [];
}

export function difficultyRow(level: LevelDef & { solution: Beam[] }): DifficultyRow {
  const designs: SimpleDesign[] = simpleDesigns(level).map((d) => {
    const cost = beamsCost(d.beams);
    return { name: d.name, cost, affordable: cost <= level.budget, won: new Simulation(level, d.beams).runToEnd() === 'won' };
  });
  const solutionCost = beamsCost(level.solution);
  return {
    id: level.id,
    name: level.name,
    gap: level.gapEnd - level.gapStart,
    solutionCost,
    threeStarBudget: level.starBudgets[1],
    budget: level.budget,
    tightness: solutionCost / level.budget,
    designs,
    cheapWins: designs.filter((d) => d.won && d.affordable).map((d) => d.name),
  };
}

export const difficultyReport = (): DifficultyRow[] => ALL_LEVELS.map(difficultyRow);

export function formatReport(rows: DifficultyRow[]): string {
  const lines = ['id      gap  cost  3star budget  tight  simple designs that win within budget'];
  for (const r of rows) {
    lines.push(
      `${r.id.padEnd(7)} ${String(r.gap).padStart(3)} ${String(r.solutionCost).padStart(5)} ${String(r.threeStarBudget).padStart(6)} ${String(r.budget).padStart(6)}  ${r.tightness.toFixed(2)}  ${r.cheapWins.join(', ') || '-'}`,
    );
  }
  return lines.join('\n');
}
