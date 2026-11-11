/**
 * Achievements: 20 goals checked from the save data. Pure, so it can be unit-tested.
 * An achievement stays unlocked once earned (the save keeps the list).
 */
import { SHOP_ITEMS } from './shop';
import type { LevelDef } from './types';

export interface PlayStats {
  /** Attempts started (GO pressed). */
  attempts: number;
  fails: number;
  /** Beams broken over all attempts. */
  broken: number;
  hints: number;
}

export const EMPTY_STATS: PlayStats = { attempts: 0, fails: 0, broken: 0, hints: 0 };

export interface AchievementInput {
  stars: Record<string, number>;
  bestCost: Record<string, number>;
  owned: string[];
  stats: PlayStats;
  levels: LevelDef[];
}

export interface Achievement {
  id: string;
  name: string;
  text: string;
  /** Progress as [done, needed]; unlocked when done >= needed. */
  progress: (i: AchievementInput) => [number, number];
}

const count = <T>(items: T[], ok: (t: T) => boolean): number => items.reduce((n, t) => n + (ok(t) ? 1 : 0), 0);
const worldLevels = (i: AchievementInput, world: number) => i.levels.filter((l) => l.world === world);
const totalStars = (i: AchievementInput) => i.levels.reduce((n, l) => n + (i.stars[l.id] ?? 0), 0);

function finishWorld(world: number, name: string): Achievement {
  return {
    id: `world-${world}`,
    name: `${name} done`,
    text: `Cross every level in ${name}.`,
    progress: (i) => {
      const ls = worldLevels(i, world);
      return [count(ls, (l) => (i.stars[l.id] ?? 0) > 0), ls.length];
    },
  };
}

function perfectWorld(world: number, name: string): Achievement {
  return {
    id: `perfect-${world}`,
    name: `Perfect ${name}`,
    text: `Get 3 stars on every level in ${name}.`,
    progress: (i) => {
      const ls = worldLevels(i, world);
      return [count(ls, (l) => (i.stars[l.id] ?? 0) >= 3), ls.length];
    },
  };
}

const WORLD_NAMES: [number, string][] = [[1, 'Farm Valley'], [2, 'Canyon Rails'], [3, 'Pirate Bay'], [4, 'River Town']];
const paints = SHOP_ITEMS.filter((s) => s.kind === 'paint' && s.price > 0).map((s) => s.id);
const wonWith = (i: AchievementInput, vehicle: string) => count(i.levels, (l) => l.vehicle === vehicle && (i.stars[l.id] ?? 0) > 0);

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-win', name: 'First Crossing', text: 'Get a vehicle to the flag.', progress: (i) => [Math.min(1, count(i.levels, (l) => (i.stars[l.id] ?? 0) > 0)), 1] },
  { id: 'first-fail', name: 'Oops!', text: 'Watch a bridge fall down.', progress: (i) => [Math.min(1, i.stats.fails), 1] },
  { id: 'three-stars', name: 'Star Pupil', text: 'Get 3 stars on a level.', progress: (i) => [Math.min(1, count(i.levels, (l) => (i.stars[l.id] ?? 0) >= 3)), 1] },
  { id: 'hint', name: 'Bright Idea', text: 'Use a hint.', progress: (i) => [Math.min(1, i.stats.hints), 1] },
  { id: 'truck', name: 'Heavy Duty', text: 'Get the truck across.', progress: (i) => [Math.min(1, wonWith(i, 'truck')), 1] },
  { id: 'cheap', name: 'Penny Pincher', text: 'Win a level using half of the money or less.', progress: (i) => [Math.min(1, count(i.levels, (l) => i.bestCost[l.id] !== undefined && i.bestCost[l.id] <= l.budget / 2)), 1] },
  ...WORLD_NAMES.map(([w, n]) => finishWorld(w, n)),
  { id: 'stars-50', name: 'Star Collector', text: 'Collect 50 stars.', progress: (i) => [Math.min(50, totalStars(i)), 50] },
  { id: 'stars-150', name: 'Star Hoarder', text: 'Collect 150 stars.', progress: (i) => [Math.min(150, totalStars(i)), 150] },
  ...WORLD_NAMES.map(([w, n]) => perfectWorld(w, n)),
  { id: 'attempts-50', name: 'Never Give Up', text: 'Press GO 50 times.', progress: (i) => [Math.min(50, i.stats.attempts), 50] },
  { id: 'broken-100', name: 'Demolition Crew', text: 'Break 100 beams.', progress: (i) => [Math.min(100, i.stats.broken), 100] },
  { id: 'shop', name: 'New Look', text: 'Buy something in the shop.', progress: (i) => [Math.min(1, i.owned.length), 1] },
  { id: 'all-paints', name: 'Paint Box', text: 'Own every paint.', progress: (i) => [count(paints, (p) => i.owned.includes(p)), paints.length] },
];

export const isDone = (a: Achievement, i: AchievementInput): boolean => {
  const [done, need] = a.progress(i);
  return done >= need;
};

/** Ids that are done now but not in `already` (in list order). */
export function newAchievements(i: AchievementInput, already: string[]): string[] {
  return ACHIEVEMENTS.filter((a) => !already.includes(a.id) && isDone(a, i)).map((a) => a.id);
}
