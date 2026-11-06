import type { LevelDef } from './types';

/** 1 star for crossing, 2 at or under the first star budget, 3 at or under the second. */
export function starsFor(level: LevelDef, cost: number): 1 | 2 | 3 {
  if (cost <= level.starBudgets[1]) return 3;
  if (cost <= level.starBudgets[0]) return 2;
  return 1;
}

/** A level is open if it is the first one or the previous level has at least one star. */
export function isUnlocked(levelIds: string[], stars: Record<string, number>, id: string): boolean {
  const i = levelIds.indexOf(id);
  if (i <= 0) return i === 0;
  return (stars[levelIds[i - 1]] ?? 0) > 0;
}
