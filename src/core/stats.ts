/**
 * Player stats and the "cheaper than X% of players" estimate. Pure, so it can be unit-tested.
 */
import type { PlayStats } from './achievements';
import type { LevelDef } from './types';

/**
 * Local estimate of the share of players (in %) whose bridge costs more than `cost`.
 * There is no online data yet, so it is a guess from the level's budgets:
 * the full budget is a costly bridge (5%), the 2-star budget is about average (50%),
 * the 3-star budget beats most players (85%), and 15% under it beats nearly all (99%).
 * Between those points it is linear. Always 1 to 99, never more for a dearer bridge.
 */
export function cheaperThanPercent(level: Pick<LevelDef, 'budget' | 'starBudgets'>, cost: number): number {
  const [two, three] = level.starBudgets;
  const points: [number, number][] = [
    [three * 0.85, 99],
    [three, 85],
    [Math.max(two, three + 1), 50],
    [Math.max(level.budget, two + 2), 5],
  ];
  let p: number;
  if (cost <= points[0][0]) p = 99;
  else if (cost >= points[3][0]) p = 5;
  else {
    let i = 0;
    while (cost > points[i + 1][0]) i++;
    const [c0, p0] = points[i];
    const [c1, p1] = points[i + 1];
    p = p0 + ((cost - c0) / (c1 - c0)) * (p1 - p0);
  }
  return Math.max(1, Math.min(99, Math.round(p)));
}

export interface StatsInput {
  stars: Record<string, number>;
  bestCost: Record<string, number>;
  stats: PlayStats;
  coins: number;
  achievements: number;
  achievementsTotal: number;
  dailyStreak: number;
  dailyBest: number;
  levels: Pick<LevelDef, 'id' | 'world'>[];
  worlds: { id: number; name: string }[];
}

export interface StatRow {
  label: string;
  value: string;
}

const num = (n: number): string => Math.round(n).toLocaleString('en-US');

/** Rows for the Stats screen, in display order. */
export function statRows(i: StatsInput): StatRow[] {
  const done = i.levels.filter((l) => (i.stars[l.id] ?? 0) > 0);
  const perfect = i.levels.filter((l) => (i.stars[l.id] ?? 0) >= 3).length;
  const stars = i.levels.reduce((n, l) => n + Math.min(3, i.stars[l.id] ?? 0), 0);
  const spent = done.reduce((n, l) => n + (i.bestCost[l.id] ?? 0), 0);
  const { attempts, fails, broken, hints } = i.stats;
  const wins = Math.max(0, attempts - fails);
  const rate = attempts > 0 ? `${Math.round((wins / attempts) * 100)}%` : '-';
  const worldsDone = i.worlds.filter((w) => {
    const ls = i.levels.filter((l) => l.world === w.id);
    return ls.length > 0 && ls.every((l) => (i.stars[l.id] ?? 0) > 0);
  }).length;
  return [
    { label: 'Levels done', value: `${done.length} / ${i.levels.length}` },
    { label: 'Perfect levels', value: `${perfect}` },
    { label: 'Stars', value: `${stars} / ${i.levels.length * 3}` },
    { label: 'Worlds done', value: `${worldsDone} / ${i.worlds.length}` },
    { label: 'Attempts (GO)', value: num(attempts) },
    { label: 'Wins', value: num(wins) },
    { label: 'Win rate', value: rate },
    { label: 'Fails', value: num(fails) },
    { label: 'Beams broken', value: num(broken) },
    { label: 'Hints used', value: num(hints) },
    { label: 'Best bridges cost', value: `$${num(spent)}` },
    { label: 'Coins', value: num(i.coins) },
    { label: 'Achievements', value: `${i.achievements} / ${i.achievementsTotal}` },
    { label: 'Daily streak (best)', value: `${i.dailyStreak} (${i.dailyBest})` },
  ];
}
