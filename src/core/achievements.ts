/**
 * Achievements: 29 goals checked from the save data. Pure, so it can be unit-tested.
 * An achievement stays unlocked once earned (the save keeps the list).
 */
import { parseSandboxId } from './sandbox';
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
  /** Level ids whose stress test held (optional for old callers). */
  held?: string[];
  /** Best daily bridge streak. */
  dailyBest?: number;
  /** Sandbox setup ids that a vehicle crossed (optional for old callers). */
  sandboxWins?: string[];
  /** How many of the player's own levels (My levels) they crossed. */
  madeCrossed?: number;
  /** How many friends' levels (from level codes) they crossed. */
  friendsCrossed?: number;
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
const heldCount = (i: AchievementInput) => count(i.levels, (l) => (i.held ?? []).includes(l.id));
const sandboxSetups = (i: AchievementInput) => [...new Set(i.sandboxWins ?? [])].map(parseSandboxId).filter((o) => o !== undefined);
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
  { id: 'stress-1', name: 'Built Tough', text: 'Pass a stress test.', progress: (i) => [Math.min(1, heldCount(i)), 1] },
  { id: 'stress-10', name: 'Over-Engineered', text: 'Pass the stress test on 10 levels.', progress: (i) => [Math.min(10, heldCount(i)), 10] },
  { id: 'daily-1', name: 'Daily Builder', text: 'Win a Daily Bridge.', progress: (i) => [Math.min(1, i.dailyBest ?? 0), 1] },
  { id: 'daily-7', name: 'Week of Bridges', text: 'Reach a 7 day Daily Bridge streak.', progress: (i) => [Math.min(7, i.dailyBest ?? 0), 7] },
  { id: 'sandbox-5', name: 'Tinkerer', text: 'Win 5 different sandbox setups.', progress: (i) => [Math.min(5, sandboxSetups(i).length), 5] },
  { id: 'sandbox-train', name: 'Mad Engineer', text: 'Get the train over 24 m in the sandbox.', progress: (i) => [Math.min(1, count(sandboxSetups(i), (o) => o.vehicle === 'train' && o.gap === 24)), 1] },
  { id: 'maker', name: 'Level Maker', text: 'Cross a level you made.', progress: (i) => [Math.min(1, i.madeCrossed ?? 0), 1] },
  { id: 'maker-5', name: 'Level Designer', text: 'Cross 5 levels you made.', progress: (i) => [Math.min(5, i.madeCrossed ?? 0), 5] },
  { id: 'friend-level', name: 'Good Friend', text: "Cross a friend's level.", progress: (i) => [Math.min(1, i.friendsCrossed ?? 0), 1] },
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

/** The Trophies screen shows 30 cards a page (6 columns, 5 rows). */
export const TROPHY_PAGE = 30;

/** How many pages `count` cards need, at least 1. */
export const pageCount = (count: number, perPage = TROPHY_PAGE): number => Math.max(1, Math.ceil(count / Math.max(1, perPage)));

/** The cards on one page; a page out of range is clamped. */
export function pageItems<T>(items: readonly T[], page: number, perPage = TROPHY_PAGE): { page: number; pages: number; items: T[] } {
  const per = Math.max(1, perPage);
  const pages = pageCount(items.length, per);
  const p = Math.min(pages - 1, Math.max(0, Math.floor(Number.isFinite(page) ? page : 0)));
  return { page: p, pages, items: items.slice(p * per, p * per + per) };
}
