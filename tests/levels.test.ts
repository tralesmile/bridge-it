import { describe, expect, test } from 'vitest';
import { BridgeDesign } from '../src/core/bridge';
import type { Beam } from '../src/core/types';
import { ALL_LEVELS, build, levelFromJson, levelToJson, roadDeck } from '../src/core/levels';
import { MATERIALS } from '../src/core/materials';
import { Simulation } from '../src/core/simulation';

describe.each(ALL_LEVELS.map((l) => [l.id, l] as const))('level %s', (_id, level) => {
  test('the known solution crosses', () => {
    const sim = new Simulation(level, level.solution);
    expect(sim.runToEnd()).toBe('won');
  });

  test('an empty bridge fails', () => {
    const sim = new Simulation(level, []);
    expect(sim.runToEnd()).toBe('lost');
  });

  test('the solution can be built within the rules', () => {
    const design = new BridgeDesign(level);
    for (const beam of level.solution) {
      const [ax, ay] = beam.a.split(',').map(Number);
      const [bx, by] = beam.b.split(',').map(Number);
      const result = design.add({ x: ax, y: ay }, { x: bx, y: by }, beam.material);
      expect(result, `${beam.a} -> ${beam.b}`).toEqual({ ok: true });
    }
    expect(design.cost).toBeLessThanOrEqual(level.starBudgets[1]);
  });

  test('star budgets are ordered', () => {
    const [two, three] = level.starBudgets;
    expect(three).toBeLessThanOrEqual(two);
    expect(two).toBeLessThanOrEqual(level.budget);
  });

  test('only uses allowed materials', () => {
    for (const beam of level.solution) expect(level.materials).toContain(beam.material);
    for (const m of level.materials) expect(MATERIALS[m]).toBeDefined();
  });
});

test('level ids are unique', () => {
  const ids = ALL_LEVELS.map((l) => l.id);
  expect(new Set(ids).size).toBe(ids.length);
});

describe('level format: uneven cliffs and goal distance', () => {
  const [level] = build(9, [
    { name: 'Uphill', gap: 4, rightHeight: 1, goalDistance: 6, materials: ['road', 'wood'], solution: () => [] },
  ]);
  test('fields reach the level definition', () => {
    expect(level.rightHeight).toBe(1);
    expect(level.goalDistance).toBe(6);
    expect(level.anchors).toContainEqual({ x: 4, y: 1 });
  });
  test('an empty bridge still loses', () => {
    expect(new Simulation(level, []).runToEnd()).toBe('lost');
  });
});

describe('level JSON', () => {
  test.each(ALL_LEVELS.map((l) => [l.id, l] as const))('level %s survives export and import', (_id, level) => {
    const result = levelFromJson(levelToJson(level));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.level).toEqual(JSON.parse(JSON.stringify(level)));
      expect(new Simulation(result.level, result.level.solution).runToEnd()).toBe('won');
    }
  });
  test('bad input gives a short error', () => {
    expect(levelFromJson('{nope')).toEqual({ ok: false, error: 'This is not valid JSON.' });
    expect(levelFromJson('{}').ok).toBe(false);
    const bad = { ...JSON.parse(levelToJson(ALL_LEVELS[0])), materials: ['gold'] };
    expect(levelFromJson(JSON.stringify(bad))).toEqual({ ok: false, error: 'Unknown material.' });
  });
});

describe('rope material', () => {
  const k = (x: number, y: number): string => `${x},${y}`;
  /** Wood posts and top chord with rope X braces: ropes only work because they pull. */
  const ropeTruss = (g: number): Beam[] => {
    const beams: Beam[] = [];
    for (let x = 0; x <= g; x += 2) beams.push({ a: k(x, 0), b: k(x, 2), material: 'wood' });
    for (let x = 0; x < g; x += 2) {
      beams.push({ a: k(x, 2), b: k(x + 2, 2), material: 'wood' });
      beams.push({ a: k(x, 2), b: k(x + 2, 0), material: 'rope' }, { a: k(x, 0), b: k(x + 2, 2), material: 'rope' });
    }
    return beams;
  };
  const level = build(9, [{ name: 'Rope test', gap: 8, materials: ['road', 'wood', 'rope'], solution: (g) => [...roadDeck(0, g), ...ropeTruss(g)] }])[0];

  test('a truss braced with rope X crosses', () => {
    expect(new Simulation(level, level.solution).runToEnd()).toBe('won');
  });

  test('ropes cannot hold up a bridge by pushing: the same braces without posts lose', () => {
    const noPosts = level.solution.filter((b) => !(b.material === 'wood' && b.a.split(',')[0] === b.b.split(',')[0]));
    expect(new Simulation(level, noPosts).runToEnd()).toBe('lost');
  });

  test('a rope can be built up to 4.5 m and not longer', () => {
    const design = new BridgeDesign(level);
    expect(design.add({ x: 0, y: 0 }, { x: 4, y: 0 }, 'rope')).toEqual({ ok: true });
    expect(design.canAdd({ x: 0, y: 0 }, { x: 6, y: 0 }, 'rope')).toEqual({ ok: false, reason: 'too-long' });
  });
});

describe('piston material', () => {
  const level = build(9, [{ name: 'Piston test', gap: 6, materials: ['road', 'wood', 'piston'], extraAnchors: [{ x: 2, y: -2 }], solution: () => roadDeck(0, 6), slack: 3 }])[0];
  const design: Beam[] = [
    { a: '0,0', b: '2,0', material: 'road' },
    { a: '2,-2', b: '2,0', material: 'piston' },
  ];

  test('a piston grows by half its length while the attempt runs', () => {
    const sim = new Simulation(level, design);
    const length = (): number => {
      const s = sim.beamStates.find((b) => b.beam.material === 'piston')!;
      return Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
    };
    expect(length()).toBeCloseTo(2, 1);
    while (sim.time < 3) sim.step();
    expect(length()).toBeGreaterThan(2.7);
    expect(length()).toBeLessThan(3.3);
  });

  test('a piston can be built up to 3.2 m and not longer', () => {
    const d = new BridgeDesign(level);
    expect(d.add({ x: 2, y: -2 }, { x: 2, y: 1 }, 'piston')).toEqual({ ok: true });
    expect(d.canAdd({ x: 2, y: -2 }, { x: 2, y: 2 }, 'piston')).toEqual({ ok: false, reason: 'too-long' });
  });
});
