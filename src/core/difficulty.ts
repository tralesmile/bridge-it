import { BridgeDesign, distance, pointOf } from './bridge';
import { ALL_LEVELS, DRAFT_LEVELS, roadDeck, warrenTruss } from './levels';
import { MATERIALS } from './materials';
import { Simulation } from './simulation';
import type { Beam, LevelDef } from './types';

export interface SimpleDesign {
  name: string;
  /** True if the design can be built: within the level budget and the build rules (e.g. ship lanes). */
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
    const buildable = BridgeDesign.restore(level, d.beams).list.length === d.beams.length;
    return { name: d.name, cost, affordable: cost <= level.budget && buildable, won: new Simulation(level, d.beams).runToEnd() === 'won' };
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

/** Cheaper material to try in place of each material (only same-kind swaps: a road stays a road). */
const CHEAPER: Partial<Record<Beam['material'], Beam['material'][]>> = { steel: ['wood', 'rope'], wood: ['rope'] };

/** True if the design can be built in the level and wins with no beam broken. */
function cleanWin(level: LevelDef, beams: Beam[]): boolean {
  if (beamsCost(beams) > level.budget) return false;
  if (BridgeDesign.restore(level, beams).list.length !== beams.length) return false;
  const sim = new Simulation(level, beams);
  return sim.runToEnd() === 'won' && sim.brokenCount === 0;
}

/**
 * Min-cost search (greedy): starting from the stored solution, drop beams and swap to cheaper
 * materials while the bridge still wins with no breaks. Most expensive beams are tried first.
 * It finds a local minimum, not the true cheapest bridge, so it can only show that a budget is loose.
 */
export function trimSolution(level: LevelDef & { solution: Beam[] }, maxPasses = 2): Beam[] {
  let best = level.solution.map((b) => ({ ...b }));
  if (!cleanWin(level, best)) return best;
  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;
    const order = [...best].sort((a, b) => beamsCost([b]) - beamsCost([a]));
    for (const beam of order) {
      const i = best.indexOf(beam);
      if (i < 0) continue;
      const without = best.filter((_, j) => j !== i);
      if (cleanWin(level, without)) {
        best = without;
        improved = true;
        continue;
      }
      for (const m of CHEAPER[beam.material] ?? []) {
        if (!level.materials.includes(m)) continue;
        const swapped = best.map((b, j) => (j === i ? { ...b, material: m } : b));
        if (cleanWin(level, swapped)) {
          best = swapped;
          improved = true;
          break;
        }
      }
    }
    if (!improved) break;
  }
  return best;
}

export interface TrimRow {
  id: string;
  solutionCost: number;
  trimmedCost: number;
  threeStarBudget: number;
  /** Trimmed cost as a share of the 3-star budget. Well under 1 means 3 stars are easy to get. */
  ratio: number;
}

export function trimRow(level: LevelDef & { solution: Beam[] }): TrimRow {
  const trimmedCost = beamsCost(trimSolution(level));
  return { id: level.id, solutionCost: beamsCost(level.solution), trimmedCost, threeStarBudget: level.starBudgets[1], ratio: trimmedCost / level.starBudgets[1] };
}

/** Every level, then the draft levels (so new worlds are checked before they ship). */
export const difficultyReport = (): DifficultyRow[] => [...ALL_LEVELS, ...DRAFT_LEVELS].map(difficultyRow);

export function formatReport(rows: DifficultyRow[]): string {
  const lines = ['id      gap  cost  3star budget  tight  simple designs that win within budget'];
  for (const r of rows) {
    lines.push(
      `${r.id.padEnd(7)} ${String(r.gap).padStart(3)} ${String(r.solutionCost).padStart(5)} ${String(r.threeStarBudget).padStart(6)} ${String(r.budget).padStart(6)}  ${r.tightness.toFixed(2)}  ${r.cheapWins.join(', ') || '-'}`,
    );
  }
  return lines.join('\n');
}

export function formatTrimReport(rows: TrimRow[]): string {
  const lines = ['id      solution trimmed  3star  ratio  (ratio under 0.85: the 3-star budget may be too loose)'];
  for (const r of rows) {
    lines.push(`${r.id.padEnd(7)} ${String(r.solutionCost).padStart(8)} ${String(r.trimmedCost).padStart(7)} ${String(r.threeStarBudget).padStart(6)}  ${r.ratio.toFixed(2)}${r.ratio < 0.85 ? '  LOOSE' : ''}`);
  }
  return lines.join('\n');
}
