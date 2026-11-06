import { describe, expect, test } from 'vitest';
import { BridgeDesign, distanceToSegment, keyOf, snap } from '../src/core/bridge';
import { levelById } from '../src/core/levels';
import { isUnlocked, starsFor } from '../src/core/scoring';
import { Simulation } from '../src/core/simulation';
import { sanitize } from '../src/game/save';

const level = levelById('w1-3')!;

describe('BridgeDesign', () => {
  test('rejects beams that are too long, duplicated, buried or off the map', () => {
    const d = new BridgeDesign(level);
    expect(d.add({ x: 0, y: 0 }, { x: 3, y: 0 }, 'road')).toEqual({ ok: false, reason: 'too-long' });
    expect(d.add({ x: 0, y: 0 }, { x: 0, y: 0 }, 'road')).toEqual({ ok: false, reason: 'same-point' });
    expect(d.add({ x: 0, y: 0 }, { x: 2, y: 0 }, 'road')).toEqual({ ok: true });
    expect(d.add({ x: 2, y: 0 }, { x: 0, y: 0 }, 'road')).toEqual({ ok: false, reason: 'duplicate' });
    expect(d.add({ x: 0, y: 0 }, { x: -1, y: -1 }, 'wood')).toEqual({ ok: false, reason: 'in-ground' });
    expect(d.add({ x: 2, y: 0 }, { x: 2, y: 9 }, 'wood').ok).toBe(false);
    expect(d.add({ x: 2, y: 0 }, { x: 3, y: 1 }, 'steel')).toEqual({ ok: false, reason: 'material-locked' });
  });

  test('replacing a beam with another material swaps it', () => {
    const d = new BridgeDesign(levelById('w1-7')!);
    d.add({ x: 0, y: 0 }, { x: 1, y: 1 }, 'wood');
    d.add({ x: 1, y: 1 }, { x: 0, y: 0 }, 'steel');
    expect(d.list).toHaveLength(1);
    expect(d.list[0].material).toBe('steel');
  });

  test('respects the budget', () => {
    const tight = { ...level, budget: 500 };
    const d = new BridgeDesign(tight);
    expect(d.add({ x: 0, y: 0 }, { x: 2, y: 0 }, 'road').ok).toBe(true);
    expect(d.add({ x: 2, y: 0 }, { x: 4, y: 0 }, 'road')).toEqual({ ok: false, reason: 'over-budget' });
  });

  test('undo restores the previous design, and erase removes the nearest beam', () => {
    const d = new BridgeDesign(level);
    d.add({ x: 0, y: 0 }, { x: 2, y: 0 }, 'road');
    d.add({ x: 2, y: 0 }, { x: 4, y: 0 }, 'road');
    expect(d.removeNear({ x: 3, y: 0.1 })).toBe(true);
    expect(d.list).toHaveLength(1);
    expect(d.undo()).toBe(true);
    expect(d.list).toHaveLength(2);
    expect(d.removeNear({ x: 9, y: 9 })).toBe(false);
  });

  test('snap and keys are stable', () => {
    expect(snap({ x: 1.4, y: -0.6 })).toEqual({ x: 1, y: -1 });
    expect(keyOf({ x: 1, y: -0 })).toBe(keyOf({ x: 1, y: 0 }).replace('-0', '0'));
    expect(distanceToSegment({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(1);
  });
});

describe('simulation', () => {
  test('is deterministic: the same design gives the same result and time', () => {
    const a = new Simulation(level, level.solution);
    const b = new Simulation(level, level.solution);
    a.runToEnd();
    b.runToEnd();
    expect(a.status).toBe(b.status);
    expect(a.time).toBe(b.time);
    expect(a.vehicle.x).toBe(b.vehicle.x);
  });

  test('a long road with no triangles collapses', () => {
    const sim = new Simulation(level, level.solution.filter((beam) => beam.material === 'road'));
    expect(sim.runToEnd()).toBe('lost');
    expect(sim.brokenCount).toBeGreaterThan(0);
  });
});

describe('scoring', () => {
  test('stars follow the star budgets', () => {
    const [two, three] = level.starBudgets;
    expect(starsFor(level, three)).toBe(3);
    expect(starsFor(level, two)).toBe(2);
    expect(starsFor(level, two + 1)).toBe(1);
  });

  test('levels unlock in order', () => {
    const ids = ['a', 'b', 'c'];
    expect(isUnlocked(ids, {}, 'a')).toBe(true);
    expect(isUnlocked(ids, {}, 'b')).toBe(false);
    expect(isUnlocked(ids, { a: 1 }, 'b')).toBe(true);
    expect(isUnlocked(ids, { a: 1 }, 'zzz')).toBe(false);
  });
});

describe('save data', () => {
  test('survives corrupted or hostile saves', () => {
    expect(sanitize(null).coins).toBe(0);
    expect(sanitize('junk').stars).toEqual({});
    const s = sanitize({ stars: { a: 99, b: 'x', c: -2 }, coins: -5, designs: { a: [{ a: '0,0', b: '2,0', material: 'road' }, { a: 1, b: 2, material: 'lava' }] }, settings: { sound: false } });
    expect(s.stars).toEqual({ a: 3, c: 0 });
    expect(s.coins).toBe(0);
    expect(s.designs.a).toHaveLength(1);
    expect(s.settings.sound).toBe(false);
  });
});
