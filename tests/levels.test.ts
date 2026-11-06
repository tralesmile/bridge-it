import { describe, expect, test } from 'vitest';
import { BridgeDesign } from '../src/core/bridge';
import { ALL_LEVELS } from '../src/core/levels';
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
