import { describe, expect, test } from 'vitest';
import { BridgeDesign } from '../src/core/bridge';
import { MATERIAL_ORDER, MATERIALS } from '../src/core/materials';
import { Simulation } from '../src/core/simulation';
import type { Beam, LevelDef } from '../src/core/types';

const level: LevelDef = {
  id: 't', world: 9, index: 1, name: 'Spring test', gapStart: 0, gapEnd: 4, leftHeight: 0, rightHeight: 0,
  anchors: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: -2 }], budget: 100000, starBudgets: [1, 1], vehicle: 'car',
  materials: ['road', 'wood', 'spring'],
};
const b = (a: string, c: string, material: Beam['material']): Beam => ({ a, b: c, material });

describe('spring', () => {
  test('is a material that never snaps', () => {
    expect(MATERIALS.spring.spring).toBeDefined();
    expect(MATERIALS.spring.strength).toBe(Infinity);
    expect(new BridgeDesign(level).canAdd({ x: 2, y: 0 }, { x: 2, y: -2 }, 'spring')).toEqual({ ok: true });
  });

  test('a weight on a spring bounces, then settles a little below its built length', () => {
    // A free node with a wood stub hangs on a spring post from the rock: it sinks, swings back up, and settles.
    const sim = new Simulation({ ...level, anchors: [...level.anchors, { x: 3, y: -2 }] }, [b('2,0', '2,-2', 'spring'), b('2,0', '3,0', 'wood'), b('3,0', '3,-2', 'spring')]);
    const ys: number[] = [];
    for (let i = 0; i < 600; i++) {
      sim.step();
      ys.push(sim.beamStates[0].a.y);
    }
    const low = Math.min(...ys.slice(0, 120));
    expect(low).toBeLessThan(0);
    // It came back up after the first dip (a bounce), not a slow creep.
    const lowAt = ys.indexOf(low);
    expect(Math.max(...ys.slice(lowAt, lowAt + 120))).toBeGreaterThan(low + 0.005);
    const end = ys[ys.length - 1];
    expect(end).toBeLessThan(0);
    expect(end).toBeGreaterThan(-0.2);
    expect(sim.brokenCount).toBe(0);
  });

  test('a road on spring posts carries the car without breaking a spring', () => {
    const design = [b('0,0', '2,0', 'road'), b('2,0', '4,0', 'road'), b('2,0', '2,-2', 'spring')];
    const sim = new Simulation(level, design);
    expect(sim.runToEnd()).toBe('won');
    expect(sim.events.filter((e) => e.type === 'break' && e.material === 'spring')).toHaveLength(0);
  });

  test('spring is added last to the share code material list, so old codes keep their materials', () => {
    expect(MATERIAL_ORDER).toEqual(['road', 'wood', 'steel', 'rope', 'piston', 'spring']);
  });
});
