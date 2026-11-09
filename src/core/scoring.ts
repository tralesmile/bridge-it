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

/** Levels shown on one level-select page (5 columns x 3 rows). */
export const LEVELS_PER_PAGE = 15;

export function pageCount(levelCount: number): number {
  return Math.max(1, Math.ceil(levelCount / LEVELS_PER_PAGE));
}

/** Page that holds the level at `index` (0-based). */
export function pageOfIndex(index: number): number {
  return Math.floor(Math.max(0, index) / LEVELS_PER_PAGE);
}
