import { describe, expect, test } from 'vitest';
import { ACHIEVEMENTS, EMPTY_STATS, isDone, newAchievements, type AchievementInput } from '../src/core/achievements';
import { ALL_LEVELS } from '../src/core/levels';
import { SHOP_ITEMS } from '../src/core/shop';

const empty: AchievementInput = { stars: {}, bestCost: {}, owned: [], stats: { ...EMPTY_STATS }, levels: ALL_LEVELS };
const byId = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!;

describe('achievements', () => {
  test('there are 24 with unique ids, and none is done on a new save', () => {
    expect(ACHIEVEMENTS).toHaveLength(24);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(24);
    expect(newAchievements(empty, [])).toEqual([]);
    for (const a of ACHIEVEMENTS) expect(a.text.length).toBeLessThan(50);
  });

  test('every achievement can be done with a full save', () => {
    const stars = Object.fromEntries(ALL_LEVELS.map((l) => [l.id, 3]));
    const bestCost = Object.fromEntries(ALL_LEVELS.map((l) => [l.id, 1]));
    const full: AchievementInput = { stars, bestCost, owned: SHOP_ITEMS.filter((s) => s.price > 0).map((s) => s.id), stats: { attempts: 50, fails: 1, broken: 100, hints: 1 }, levels: ALL_LEVELS, held: ALL_LEVELS.slice(0, 10).map((l) => l.id), dailyBest: 7 };
    expect(newAchievements(full, [])).toHaveLength(24);
  });

  test('first win, world done and perfect world', () => {
    const farm = ALL_LEVELS.filter((l) => l.world === 1);
    const one = { ...empty, stars: { 'w1-1': 2 } };
    expect(newAchievements(one, [])).toEqual(['first-win']);
    const allFarm = { ...empty, stars: Object.fromEntries(farm.map((l) => [l.id, 1])) };
    expect(isDone(byId('world-1'), allFarm)).toBe(true);
    expect(isDone(byId('perfect-1'), allFarm)).toBe(false);
    expect(byId('perfect-1').progress(allFarm)).toEqual([0, farm.length]);
  });

  test('already earned ones are not reported again', () => {
    const one = { ...empty, stars: { 'w1-1': 3 } };
    expect(newAchievements(one, ['first-win'])).toEqual(['three-stars']);
  });

  test('counters, truck and cheap win', () => {
    expect(byId('attempts-50').progress({ ...empty, stats: { ...EMPTY_STATS, attempts: 7 } })).toEqual([7, 50]);
    const truck = ALL_LEVELS.find((l) => l.vehicle === 'truck')!;
    expect(isDone(byId('truck'), { ...empty, stars: { [truck.id]: 1 } })).toBe(true);
    const l = ALL_LEVELS[0];
    expect(isDone(byId('cheap'), { ...empty, bestCost: { [l.id]: l.budget / 2 } })).toBe(true);
    expect(isDone(byId('cheap'), { ...empty, bestCost: { [l.id]: l.budget / 2 + 1 } })).toBe(false);
  });

  test('stress test and daily streak', () => {
    const ids = ALL_LEVELS.slice(0, 10).map((l) => l.id);
    expect(newAchievements({ ...empty, held: ids.slice(0, 1) }, [])).toEqual(['stress-1']);
    expect(byId('stress-10').progress({ ...empty, held: ids.slice(0, 4) })).toEqual([4, 10]);
    expect(isDone(byId('stress-10'), { ...empty, held: ids })).toBe(true);
    // Unknown ids (old or removed levels) do not count.
    expect(byId('stress-1').progress({ ...empty, held: ['nope'] })).toEqual([0, 1]);
    expect(newAchievements({ ...empty, dailyBest: 3 }, [])).toEqual(['daily-1']);
    expect(byId('daily-7').progress({ ...empty, dailyBest: 3 })).toEqual([3, 7]);
    expect(isDone(byId('daily-7'), { ...empty, dailyBest: 9 })).toBe(true);
  });
});
