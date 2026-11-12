import { describe, expect, it } from 'vitest';
import { ALL_LEVELS } from '../src/core/levels';
import { Simulation } from '../src/core/simulation';
import { stressLevel, stressVehicle } from '../src/core/stress';

describe('stress test', () => {
  it('picks the next heavier vehicle', () => {
    expect(stressVehicle('car')).toBe('truck');
    expect(stressVehicle('truck')).toBe('train');
    expect(stressVehicle('train')).toBeNull();
  });

  it('keeps everything but the vehicle', () => {
    const level = ALL_LEVELS[0];
    const s = stressLevel(level)!;
    expect(s.vehicle).toBe('truck');
    expect({ ...s, vehicle: level.vehicle }).toEqual(level);
    expect(level.vehicle).toBe('car');
  });

  it('every stress run of a solution ends, the same way twice', () => {
    const results: Record<string, number> = { won: 0, lost: 0 };
    for (const level of ALL_LEVELS) {
      const s = stressLevel(level);
      if (!s) continue;
      const a = new Simulation(s, level.solution);
      const status = a.runToEnd();
      expect(status, level.id).not.toBe('running');
      expect(new Simulation(s, level.solution).runToEnd(), level.id).toBe(status);
      results[status]++;
    }
    // Some cheap bridges must hold and some must break, or the mode is no fun.
    expect(results.won).toBeGreaterThan(0);
    expect(results.lost).toBeGreaterThan(0);
  }, 120000);
});
