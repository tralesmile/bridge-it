import { expect, test } from 'vitest';
import { difficultyReport, formatReport } from '../src/core/difficulty';
import { ALL_LEVELS } from '../src/core/levels';

test('difficulty report covers every level and the stored solution fits the budget', () => {
  const rows = difficultyReport();
  expect(rows).toHaveLength(ALL_LEVELS.length);
  for (const r of rows) {
    expect(r.solutionCost, r.id).toBeLessThanOrEqual(r.budget);
    expect(r.tightness, r.id).toBeGreaterThan(0.3);
    expect(r.tightness, r.id).toBeLessThanOrEqual(1);
  }
  expect(formatReport(rows).split('\n')).toHaveLength(rows.length + 1);
});

test('the first level is the only one a bare road can win without any truss idea', () => {
  const bare = difficultyReport().filter((r) => r.cheapWins.includes('road only'));
  expect(bare.map((r) => r.id)).toEqual(['w1-1']);
});
