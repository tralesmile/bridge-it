import { expect, test } from 'vitest';
import { difficultyReport, formatReport } from '../src/core/difficulty';
import { ALL_LEVELS, DRAFT_LEVELS } from '../src/core/levels';

test('difficulty report covers every level and the stored solution fits the budget', () => {
  const rows = difficultyReport();
  expect(rows).toHaveLength(ALL_LEVELS.length + DRAFT_LEVELS.length);
  for (const r of rows) {
    expect(r.solutionCost, r.id).toBeLessThanOrEqual(r.budget);
    expect(r.tightness, r.id).toBeGreaterThan(0.3);
    expect(r.tightness, r.id).toBeLessThanOrEqual(1);
  }
  expect(formatReport(rows).split('\n')).toHaveLength(rows.length + 1);
}, 30000);

test('the first level is the only one a bare road can win without any truss idea', () => {
  const bare = difficultyReport().filter((r) => r.cheapWins.includes('road only'));
  expect(bare.map((r) => r.id)).toEqual(['w1-1']);
}, 30000);

test('min-cost search keeps a winning bridge and never costs more than the solution', async () => {
  const { trimSolution, beamsCost } = await import('../src/core/difficulty');
  const { Simulation } = await import('../src/core/simulation');
  for (const id of ['w1-3', 'w1-7']) {
    const level = ALL_LEVELS.find((l) => l.id === id)!;
    const trimmed = trimSolution(level, 1);
    expect(beamsCost(trimmed), id).toBeLessThanOrEqual(beamsCost(level.solution));
    const sim = new Simulation(level, trimmed);
    expect(sim.runToEnd(), id).toBe('won');
    expect(sim.brokenCount, id).toBe(0);
  }
}, 60000);
