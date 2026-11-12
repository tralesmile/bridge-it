/**
 * Daily Bridge: one level a day, made from the date, the same for every player.
 * Levels come from a fixed list of tested variants (each one has a solution that wins),
 * so a random day can never give an unsolvable level. Pure code, no clock: pass in the date key.
 */
import { beam, build, fanRopes, hangerRopes, hangers, leaf, levelById, rockLegs, rockPosts, roadDeck, warrenTruss, type LevelEntry, type LevelSpec } from './levels';

/** 'YYYY-MM-DD' for a date in the player's own time zone. */
export function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Days since 1970-01-01 for a date key. */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

/** Week number; weeks start on Monday (day 0 was a Thursday). */
export const weekOf = (key: string): number => Math.floor((dayNumber(key) + 3) / 7);

/** Small seeded random numbers (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** One daily level shape: world sets the backdrop. */
export interface DailyVariant {
  world: number;
  spec: Omit<LevelSpec, 'name'>;
}

const truss = (g: number) => [...roadDeck(0, g), ...warrenTruss(0, g)];

export const DAILY_VARIANTS: DailyVariant[] = [
  ...[6, 8].map((gap) => ({ world: 1, spec: { gap, materials: ['road', 'wood', 'steel'], solution: truss, slack: 1.4 } as LevelSpec })),
  ...[8, 12, 16].flatMap((gap) =>
    (['car', 'truck'] as const).map((vehicle) => ({ world: 1, spec: { gap, vehicle, materials: ['road', 'wood', 'steel'], extraAnchors: rockPosts(gap, 4), solution: (g: number) => [...truss(g), ...rockLegs(g, 4)], slack: 1.3 } as LevelSpec })),
  ),
  ...[12, 16, 20].map((gap) => ({ world: 2, spec: { gap, materials: ['road', 'wood', 'rope'], extraAnchors: hangers(gap, 2, 4), solution: (g: number) => [...roadDeck(0, g), ...hangerRopes(g, 2, 4)], slack: 1.3 } as LevelSpec })),
  { world: 3, spec: { gap: 12, materials: ['road', 'wood', 'rope'], extraAnchors: [{ x: 6, y: 4 }], solution: (g) => [...roadDeck(0, g), ...fanRopes(6, 4)], slack: 1.3 } },
  { world: 3, spec: { gap: 12, materials: ['road', 'wood', 'rope'], extraAnchors: [{ x: 4, y: 4 }, { x: 8, y: 4 }], solution: (g) => [...roadDeck(0, g), ...[4, 8].flatMap((m) => fanRopes(m, 4))], slack: 1.3 } },
  // Pirate rocks and a low dock.
  { world: 3, spec: { gap: 8, rightHeight: -1, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 4, y: -2 }], solution: (g) => [beam('0,0', '2,-1', 'road'), ...roadDeck(2, g, -1), beam('4,-1', '4,-2', 'wood')], slack: 1.4 } },
  { world: 3, spec: { gap: 6, materials: ['road', 'wood'], extraAnchors: [{ x: 3, y: -1 }], solution: (g) => [...roadDeck(0, g), beam('3,-1', '2,0', 'wood'), beam('3,-1', '4,0', 'wood')], slack: 1.3 } },
  { world: 3, spec: { gap: 10, materials: ['road', 'wood', 'steel'], extraAnchors: [{ x: 3, y: -2 }, { x: 7, y: -2 }], solution: (g) => [...roadDeck(0, g), ...[3, 7].flatMap((x) => [beam(`${x},-2`, `${x - 1},0`, 'wood'), beam(`${x},-2`, `${x + 1},0`, 'wood')])], slack: 1.4 } },
  // Drawbridges over a ship lane.
  { world: 4, spec: { gap: 4, materials: ['road', 'wood', 'piston'], extraAnchors: [{ x: -1, y: 0 }], shipLane: { x0: 0, x1: 4 }, solution: () => leaf(0, 1), slack: 1.3 } },
  { world: 4, spec: { gap: 8, materials: ['road', 'wood', 'piston'], extraAnchors: [{ x: -1, y: 0 }, { x: 9, y: 0 }, { x: 4, y: 0 }], shipLane: { x0: 0, x1: 8 }, solution: (g) => [...leaf(0, 1), ...leaf(g, -1)], slack: 1.25 } },
  { world: 4, spec: { gap: 8, materials: ['road', 'wood', 'piston'], extraAnchors: [{ x: 4, y: 0 }, { x: 9, y: 0 }], shipLane: { x0: 4, x1: 8 }, solution: (g) => [...roadDeck(0, 4), ...warrenTruss(0, 4), ...leaf(g, -1)], slack: 1.25 } },
];

const FIRST = ['Sunny', 'Misty', 'Windy', 'Rainy', 'Quiet', 'Golden', 'Frosty', 'Lucky', 'Sleepy', 'Happy'];
const SECOND = ['Creek', 'Gap', 'Gorge', 'Valley', 'River', 'Pass', 'Ravine', 'Brook', 'Canyon', 'Crossing'];

export const DAILY_PREFIX = 'daily-';
export const isDailyId = (id: string): boolean => id.startsWith(DAILY_PREFIX);

/** The level for a date key. Same key, same level, on every device. */
export function dailyLevel(key: string): LevelEntry {
  const r = rng(hash(key));
  const variant = DAILY_VARIANTS[Math.floor(r() * DAILY_VARIANTS.length)];
  const name = `${FIRST[Math.floor(r() * FIRST.length)]} ${SECOND[Math.floor(r() * SECOND.length)]}`;
  const [level] = build(variant.world, [{ ...variant.spec, name, tip: 'A new bridge every day. Come back tomorrow!' }]);
  return { ...level, id: `${DAILY_PREFIX}${key}`, index: 0 };
}

/** A normal level by id, or a daily level for 'daily-YYYY-MM-DD'. */
export function findLevel(id: string): LevelEntry | undefined {
  if (isDailyId(id)) {
    const key = id.slice(DAILY_PREFIX.length);
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? dailyLevel(key) : undefined;
  }
  return levelById(id);
}

export interface DailyState {
  /** Last date key with a daily win. */
  last: string | null;
  streak: number;
  best: number;
  /** Week number in which the free streak-saver was used. */
  saverWeek: number | null;
  /** Date keys with a daily win (the last CALENDAR_DAYS days only), for the calendar. */
  played: string[];
}

export const EMPTY_DAILY: DailyState = { last: null, streak: 0, best: 0, saverWeek: null, played: [] };

/** How many days the calendar shows (today and the days before). */
export const CALENDAR_DAYS = 14;

/** Date keys for the calendar, oldest first, ending with today. */
export function calendarDays(today: string, n = CALENDAR_DAYS): string[] {
  const t = dayNumber(today);
  return Array.from({ length: n }, (_, i) => keyOfDay(t - (n - 1 - i)));
}

/** Date key for a day number (inverse of dayNumber). */
export function keyOfDay(day: number): string {
  const d = new Date(day * 86400000);
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** Can this day be played from the calendar? Today and the days before it inside the calendar. */
export function canPlayDay(key: string, today: string): boolean {
  const gap = dayNumber(today) - dayNumber(key);
  return gap >= 0 && gap < CALENDAR_DAYS;
}

/**
 * Records a win on a day from the calendar. Today goes to the streak (recordDailyWin); a past
 * day only gets its tick: no streak change and no coins, so old days cannot be farmed.
 */
export function recordCalendarWin(s: DailyState, key: string, today: string): { state: DailyState; firstToday: boolean; usedSaver: boolean; past: boolean } {
  const keep = (list: string[]) => [...new Set([...list, key])].filter((k) => canPlayDay(k, today)).sort();
  if (key !== today) return { state: { ...s, played: keep(s.played) }, firstToday: false, usedSaver: false, past: true };
  const r = recordDailyWin(s, today);
  return { ...r, state: { ...r.state, played: keep(r.state.played) }, past: false };
}

/** True if this week's free streak-saver is still unused. */
export const saverFree = (s: DailyState, today: string): boolean => s.saverWeek !== weekOf(today);

/**
 * Records a daily win. Next day: streak + 1. One missed day: the weekly streak-saver keeps the
 * streak (once a week, free). Longer gap: a new streak of 1. A second win on the same day changes nothing.
 */
export function recordDailyWin(s: DailyState, today: string): { state: DailyState; firstToday: boolean; usedSaver: boolean } {
  if (s.last === today) return { state: s, firstToday: false, usedSaver: false };
  const gap = s.last ? dayNumber(today) - dayNumber(s.last) : Infinity;
  let streak = 1;
  let usedSaver = false;
  let saverWeek = s.saverWeek;
  if (gap === 1) streak = s.streak + 1;
  else if (gap === 2 && saverFree(s, today)) {
    streak = s.streak + 1;
    usedSaver = true;
    saverWeek = weekOf(today);
  }
  return { state: { ...s, last: today, streak, best: Math.max(s.best, streak), saverWeek }, firstToday: true, usedSaver };
}

/** The streak to show today: still alive if won today, yesterday, or the day before with the saver free. */
export function liveStreak(s: DailyState, today: string): number {
  if (!s.last) return 0;
  const gap = dayNumber(today) - dayNumber(s.last);
  if (gap <= 1) return s.streak;
  if (gap === 2 && saverFree(s, today)) return s.streak;
  return 0;
}

/** Coins for the first daily win of a day. */
export const DAILY_COINS = 20;
