import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, EMPTY_STATS } from '../src/core/achievements';
import { ALL_LEVELS, WORLDS } from '../src/core/levels';
import { starsFor } from '../src/core/scoring';
import { cheaperThanPercent, statRows } from '../src/core/stats';

describe('cheaperThanPercent', () => {
  const level = { budget: 1000, starBudgets: [800, 600] as [number, number] };

  it('hits the anchor points', () => {
    expect(cheaperThanPercent(level, 1000)).toBe(5);
    expect(cheaperThanPercent(level, 800)).toBe(50);
    expect(cheaperThanPercent(level, 600)).toBe(85);
    expect(cheaperThanPercent(level, 510)).toBe(99);
    expect(cheaperThanPercent(level, 0)).toBe(99);
    expect(cheaperThanPercent(level, 5000)).toBe(5);
  });

  it('never goes up for a dearer bridge, and stays 1 to 99', () => {
    for (const l of ALL_LEVELS) {
      let last = 100;
      for (let c = 0; c <= l.budget * 1.2; c += Math.max(1, Math.round(l.budget / 200))) {
        const p = cheaperThanPercent(l, c);
        expect(p).toBeGreaterThanOrEqual(1);
        expect(p).toBeLessThanOrEqual(99);
        expect(p).toBeLessThanOrEqual(last);
        last = p;
      }
    }
  });

  it('a 3-star win always beats more players than a 2-star win', () => {
    for (const l of ALL_LEVELS) {
      const [two, three] = l.starBudgets;
      expect(starsFor(l, three)).toBe(3);
      expect(cheaperThanPercent(l, three)).toBeGreaterThan(cheaperThanPercent(l, two));
    }
  });

  it('copes with equal star budgets', () => {
    const flat = { budget: 500, starBudgets: [500, 500] as [number, number] };
    for (const c of [0, 400, 499, 500, 501, 600]) {
      const p = cheaperThanPercent(flat, c);
      expect(Number.isFinite(p)).toBe(true);
    }
  });
});

describe('statRows', () => {
  const base = {
    stars: {},
    bestCost: {},
    stats: { ...EMPTY_STATS },
    coins: 0,
    achievements: 0,
    achievementsTotal: ACHIEVEMENTS.length,
    dailyStreak: 0,
    dailyBest: 0,
    levels: ALL_LEVELS,
    worlds: WORLDS,
  };
  const value = (rows: { label: string; value: string }[], label: string) => rows.find((r) => r.label === label)?.value;

  it('shows a fresh save without NaN', () => {
    const rows = statRows(base);
    expect(rows.length).toBeGreaterThan(10);
    for (const r of rows) expect(r.value).not.toMatch(/NaN|undefined/);
    expect(value(rows, 'Win rate')).toBe('-');
    expect(value(rows, 'Levels done')).toBe(`0 / ${ALL_LEVELS.length}`);
  });

  it('counts levels, stars, worlds, wins and cost', () => {
    const w1 = WORLDS[0].levels;
    const stars: Record<string, number> = {};
    const bestCost: Record<string, number> = {};
    for (const l of w1) {
      stars[l.id] = 3;
      bestCost[l.id] = 100;
    }
    stars['not-a-level'] = 3;
    const rows = statRows({ ...base, stars, bestCost, stats: { attempts: 40, fails: 10, broken: 1234, hints: 2 }, coins: 1500, dailyStreak: 2, dailyBest: 5 });
    expect(value(rows, 'Levels done')).toBe(`${w1.length} / ${ALL_LEVELS.length}`);
    expect(value(rows, 'Perfect levels')).toBe(`${w1.length}`);
    expect(value(rows, 'Stars')).toBe(`${w1.length * 3} / ${ALL_LEVELS.length * 3}`);
    expect(value(rows, 'Worlds done')).toBe(`1 / ${WORLDS.length}`);
    expect(value(rows, 'Wins')).toBe('30');
    expect(value(rows, 'Win rate')).toBe('75%');
    expect(value(rows, 'Beams broken')).toBe('1,234');
    expect(value(rows, 'Best bridges cost')).toBe(`$${(w1.length * 100).toLocaleString('en-US')}`);
    expect(value(rows, 'Coins')).toBe('1,500');
    expect(value(rows, 'Daily streak (best)')).toBe('2 (5)');
  });
});
