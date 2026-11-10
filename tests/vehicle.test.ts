import { describe, expect, test } from 'vitest';
import { build, roadDeck, warrenTruss } from '../src/core/levels';
import { Simulation } from '../src/core/simulation';
import type { Beam } from '../src/core/types';

/** A 4 m gap with a steel leg in the middle; the deck stays flat and steps down onto a lower right cliff. */
function dropRun(vehicle: 'car' | 'truck', drop: number) {
  const solution = (): Beam[] => [
    ...roadDeck(0, 4),
    { a: '2,0', b: '2,-3', material: 'steel' },
    { a: '4,0', b: `4,${-drop}`, material: 'steel' },
  ];
  const [level] = build(9, [{ name: 'drop', gap: 4, vehicle, rightHeight: -drop, extraAnchors: [{ x: 2, y: -3 }], materials: ['road', 'wood', 'steel'], solution, slack: 5 }]);
  const sim = new Simulation(level, level.solution);
  return { status: sim.runToEnd(), reason: sim.lossReason };
}

describe('vehicle drops', () => {
  for (const vehicle of ['car', 'truck'] as const) {
    test(`${vehicle} survives a 1 m drop onto a lower cliff`, () => {
      expect(dropRun(vehicle, 1).status).toBe('won');
    });
    test(`${vehicle} that tips over on a 2 m drop loses as flipped`, () => {
      expect(dropRun(vehicle, 2)).toEqual({ status: 'lost', reason: 'flipped' });
    });
  }

  test('truck drives down a ramp from a raised start cliff (steel leg at the ramp foot)', () => {
    // The ramp foot carries the whole truck as it levels out: a wood leg there snaps, steel holds.
    const [level] = build(9, [{
      name: 'ramp', gap: 8, vehicle: 'truck', leftHeight: 1, extraAnchors: [{ x: 2, y: -2 }, { x: 4, y: -2 }, { x: 6, y: -2 }], materials: ['road', 'wood', 'steel'],
      solution: (g) => [{ a: '0,1', b: '2,0', material: 'road' }, ...roadDeck(2, g), ...[2, 4, 6].map((x): Beam => ({ a: `${x},0`, b: `${x},-2`, material: 'steel' }))],
      slack: 5,
    }]);
    const sim = new Simulation(level, level.solution);
    expect([sim.runToEnd(), sim.lossReason, sim.brokenCount]).toEqual(['won', null, 0]);
  });

  test.each(['car', 'truck'] as const)('%s drives down a 1 m slope at the end of a flat bridge', (vehicle) => {
    // Motors used to brake at full torque downhill, which pitched the vehicle onto its nose.
    const [level] = build(9, [{
      name: 'slope', gap: 8, vehicle, rightHeight: -1, extraAnchors: [{ x: 4, y: -2 }], materials: ['road', 'wood', 'steel'],
      solution: () => [...roadDeck(0, 6), ...warrenTruss(0, 4, 'steel'), ...warrenTruss(4, 6, 'steel'), { a: '4,0', b: '4,-2', material: 'steel' }, { a: '6,0', b: '8,-1', material: 'road' }, { a: '6,0', b: '8,-3', material: 'steel' }],
      slack: 5,
    }]);
    const sim = new Simulation(level, level.solution);
    expect([sim.runToEnd(), sim.lossReason]).toEqual(['won', null]);
  });
});
