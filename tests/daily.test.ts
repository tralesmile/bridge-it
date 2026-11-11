import { describe, expect, test } from 'vitest';
import { BridgeDesign } from '../src/core/bridge';
import { DAILY_VARIANTS, EMPTY_DAILY, dailyLevel, dateKey, dayNumber, findLevel, liveStreak, recordDailyWin, saverFree, weekOf } from '../src/core/daily';
import { build } from '../src/core/levels';
import { Simulation } from '../src/core/simulation';

describe.each(DAILY_VARIANTS.map((v, i) => [i, v] as const))('daily variant %i', (_i, v) => {
  const [level] = build(v.world, [{ ...v.spec, name: 'Daily test' }]);
  test('the solution wins with no break, and an empty bridge loses', () => {
    const sim = new Simulation(level, level.solution);
    expect(sim.runToEnd()).toBe('won');
    expect(sim.brokenCount).toBe(0);
    expect(new Simulation(level, []).runToEnd()).toBe('lost');
  });
  test('the solution can be built within the rules and budget', () => {
    const design = new BridgeDesign(level);
    for (const b of level.solution) {
      const [ax, ay] = b.a.split(',').map(Number);
      const [bx, by] = b.b.split(',').map(Number);
      expect(design.add({ x: ax, y: ay }, { x: bx, y: by }, b.material)).toEqual({ ok: true });
    }
    expect(design.cost).toBeLessThanOrEqual(level.starBudgets[1]);
  });
});

describe('daily level', () => {
  test('same date gives the same level; dates spread over many variants', () => {
    expect(dailyLevel('2026-11-11')).toEqual(dailyLevel('2026-11-11'));
    const names = new Set<string>();
    const shapes = new Set<string>();
    for (let d = 0; d < 60; d++) {
      const key = dateKey(new Date(2026, 0, 1 + d));
      const l = dailyLevel(key);
      expect(l.id).toBe(`daily-${key}`);
      names.add(l.name);
      shapes.add(`${l.gapEnd}-${l.vehicle}-${l.world}-${l.anchors.length}`);
    }
    expect(names.size).toBeGreaterThan(20);
    expect(shapes.size).toBeGreaterThan(8);
  });

  test('findLevel knows daily ids and normal ids, and rejects junk', () => {
    expect(findLevel('daily-2026-11-11')?.id).toBe('daily-2026-11-11');
    expect(findLevel('w1-1')?.id).toBe('w1-1');
    expect(findLevel('daily-junk')).toBeUndefined();
  });

  test('date helpers', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dayNumber('1970-01-02')).toBe(1);
    // 2026-11-09 is a Monday: a new week starts there.
    expect(weekOf('2026-11-08')).toBe(weekOf('2026-11-09') - 1);
    expect(weekOf('2026-11-09')).toBe(weekOf('2026-11-15'));
  });
});

describe('daily streak', () => {
  const win = (s: typeof EMPTY_DAILY, day: string) => recordDailyWin(s, day).state;

  test('next-day wins grow the streak; the same day twice does not', () => {
    let s = win(EMPTY_DAILY, '2026-11-09');
    expect(s.streak).toBe(1);
    expect(recordDailyWin(s, '2026-11-09').firstToday).toBe(false);
    s = win(s, '2026-11-10');
    s = win(s, '2026-11-11');
    expect(s.streak).toBe(3);
    expect(s.best).toBe(3);
  });

  test('one missed day uses the weekly saver once; a second miss that week resets', () => {
    let s = win(EMPTY_DAILY, '2026-11-09'); // Monday
    const r = recordDailyWin(s, '2026-11-11'); // missed Tuesday
    expect(r.usedSaver).toBe(true);
    s = r.state;
    expect(s.streak).toBe(2);
    expect(saverFree(s, '2026-11-12')).toBe(false);
    s = win(s, '2026-11-13'); // missed Thursday, saver already used this week
    expect(s.streak).toBe(1);
    expect(s.best).toBe(2);
    expect(saverFree(s, '2026-11-16')).toBe(true); // new week
  });

  test('a long gap starts again at 1', () => {
    const s = win(win(EMPTY_DAILY, '2026-11-01'), '2026-11-02');
    expect(win(s, '2026-11-10').streak).toBe(1);
  });

  test('live streak shows 0 once the streak is lost', () => {
    const s = win(EMPTY_DAILY, '2026-11-09');
    expect(liveStreak(s, '2026-11-09')).toBe(1);
    expect(liveStreak(s, '2026-11-10')).toBe(1);
    expect(liveStreak(s, '2026-11-11')).toBe(1); // saver still free
    expect(liveStreak(s, '2026-11-12')).toBe(0);
    expect(liveStreak(EMPTY_DAILY, '2026-11-12')).toBe(0);
  });
});
