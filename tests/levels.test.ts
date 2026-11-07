import { describe, expect, test } from 'vitest';
import { BridgeDesign } from '../src/core/bridge';
import { ALL_LEVELS, build, levelFromJson, levelToJson } from '../src/core/levels';
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
