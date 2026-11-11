import { describe, expect, test } from 'vitest';
import { BridgeDesign } from '../src/core/bridge';
import { levelById, levelFromJson, levelToJson } from '../src/core/levels';
import { PISTON_START, PISTON_TIME, Simulation } from '../src/core/simulation';

const level = (id: string) => {
  const l = levelById(id);
  if (!l) throw new Error(id);
  return l;
};

describe('ship lane', () => {
  test('no node and no beam may be built inside or across the lane', () => {
    const d = new BridgeDesign(level('w4-1'));
    expect(d.canAdd({ x: 0, y: 0 }, { x: 2, y: 0 }, 'road')).toEqual({ ok: false, reason: 'in-lane' });
    expect(d.canAdd({ x: 2, y: 3 }, { x: 2, y: 4 }, 'wood')).toEqual({ ok: false, reason: 'in-lane' });
    // A beam over the lane with both ends outside it is blocked too.
    expect(d.crossesLane({ x: 0, y: 4 }, { x: 4, y: 4 })).toBe(true);
    expect(d.crossesLane({ x: -2, y: 4 }, { x: 0, y: 4 })).toBe(false);
    // Standing up on the cliff edge is fine.
    expect(d.canAdd({ x: 0, y: 0 }, { x: 0, y: 2 }, 'road')).toEqual({ ok: true });
  });

  test('a partial lane leaves the rest of the gap free (Lock Gate)', () => {
    const d = new BridgeDesign(level('w4-3'));
    expect(d.canAdd({ x: 0, y: 0 }, { x: 2, y: 0 }, 'road')).toEqual({ ok: true });
    expect(d.canAdd({ x: 4, y: 0 }, { x: 6, y: 0 }, 'road')).toEqual({ ok: false, reason: 'in-lane' });
  });

  test('a level can have two lanes (Two Canals); the gap between them is free', () => {
    const d = new BridgeDesign(level('w4-13'));
    expect(level('w4-13').shipLanes).toHaveLength(2);
    expect(d.canAdd({ x: 0, y: 0 }, { x: 2, y: 0 }, 'road')).toEqual({ ok: false, reason: 'in-lane' });
    expect(d.canAdd({ x: 4, y: 0 }, { x: 6, y: 0 }, 'road')).toEqual({ ok: true });
    expect(d.canAdd({ x: 8, y: 0 }, { x: 10, y: 0 }, 'road')).toEqual({ ok: false, reason: 'in-lane' });
    expect(d.crossesLane({ x: 6, y: 1 }, { x: 10, y: 1 })).toBe(true);
  });

  test('level JSON with one old "shipLane" still loads as a lane list', () => {
    const json = JSON.parse(levelToJson(level('w4-1')));
    json.shipLane = json.shipLanes[0];
    delete json.shipLanes;
    const r = levelFromJson(JSON.stringify(json));
    expect(r.ok && r.level.shipLanes).toEqual([{ x0: 0, x1: 4 }]);
    expect(levelFromJson(JSON.stringify({ ...json, shipLane: { x0: 1 } })).ok).toBe(false);
  });
});

describe('drawbridge', () => {
  test('the leaf swings down and locks onto the far cliff, then the car crosses', () => {
    const l = level('w4-1');
    const sim = new Simulation(l, l.solution);
    expect(sim.runToEnd()).toBe('won');
    const latches = sim.events.filter((e) => e.type === 'latch');
    expect(latches).toHaveLength(1);
    expect(latches[0].at).toEqual({ x: 4, y: 0 });
  });

  test('both leaves lock onto the middle pier', () => {
    const l = level('w4-2');
    const sim = new Simulation(l, l.solution);
    expect(sim.runToEnd()).toBe('won');
    expect(sim.events.filter((e) => e.type === 'latch').map((e) => e.at)).toEqual([{ x: 4, y: 0 }, { x: 4, y: 0 }]);
  });

  test.each(['w4-1', 'w4-2', 'w4-3', 'w4-4', 'w4-5', 'w4-6', 'w4-7', 'w4-8', 'w4-9', 'w4-10', 'w4-11', 'w4-12', 'w4-13', 'w4-14', 'w4-15'])('%s: the same leaf without its piston loses (no lock from a leaf that swung round)', (id) => {
    const l = level(id);
    const sim = new Simulation(l, l.solution.filter((b) => b.material !== 'piston'));
    expect(sim.runToEnd()).toBe('lost');
    expect(sim.events.some((e) => e.type === 'latch')).toBe(false);
  });

  test('a truck breaks the open leaf even in steel; closing the top triangle holds it (Heavy Leaf)', () => {
    const l = level('w4-4');
    expect(new Simulation(l, l.solution).runToEnd()).toBe('won');
    // The Drawbridge leaf with steel braces, no closing brace.
    const open = level('w4-1').solution.map((b) => (b.material === 'wood' ? { ...b, material: 'steel' as const } : b));
    expect(new Simulation(l, open).runToEnd()).toBe('lost');
  });

  test('a leaf with no piston that falls over and swings round never locks on', () => {
    for (const id of ['w4-4', 'w4-6', 'w4-7']) {
      const l = level(id);
      const sim = new Simulation(l, l.solution.filter((b) => b.material !== 'piston'));
      sim.runToEnd();
      expect(sim.events.some((e) => e.type === 'latch'), id).toBe(false);
    }
  });

  test('Market Canal: the fixed roads need their rock legs', () => {
    const l = level('w4-5');
    expect(new Simulation(l, l.solution.filter((b) => !b.b.endsWith(',-2'))).runToEnd()).toBe('lost');
  });

  test('Toll Bridge: the light Lock Gate leaf breaks under the truck', () => {
    expect(new Simulation(level('w4-8'), level('w4-3').solution).runToEnd()).toBe('lost');
  });

  test('Grain Barges: the light Two Canals bridge breaks under the truck', () => {
    expect(new Simulation(level('w4-14'), level('w4-13').solution).runToEnd()).toBe('lost');
  });

  test('River Finale: both leaves lock onto the piers, and the long middle needs its rock legs', () => {
    const l = level('w4-15');
    const sim = new Simulation(l, l.solution);
    expect(sim.runToEnd()).toBe('won');
    expect(sim.events.filter((e) => e.type === 'latch').map((e) => e.at)).toEqual(expect.arrayContaining([{ x: 4, y: 0 }, { x: 16, y: 0 }]));
    expect(new Simulation(l, l.solution.filter((b) => !b.b.endsWith(',-2'))).runToEnd()).toBe('lost');
  });

  test('Rope Market, Long Wharf and Harbour Mast: the fixed road needs its ropes', () => {
    for (const id of ['w4-9', 'w4-11', 'w4-12']) {
      const l = level(id);
      expect(new Simulation(l, l.solution.filter((b) => b.material !== 'rope')).runToEnd(), id).toBe('lost');
    }
  });

  test('Ferry Train: two light leaves break under the train', () => {
    expect(new Simulation(level('w4-10'), level('w4-2').solution).runToEnd()).toBe('lost');
  });

  test('the vehicle waits with its brakes on until the leaf has locked', () => {
    const l = level('w4-1');
    const sim = new Simulation(l, l.solution);
    const startX = sim.vehicle.x;
    while (sim.time < PISTON_START + 0.5) sim.step();
    expect(Math.abs(sim.vehicle.x - startX)).toBeLessThan(0.05);
    while (!sim.events.some((e) => e.type === 'latch')) sim.step();
    expect(sim.time).toBeLessThan(PISTON_START + PISTON_TIME + 0.01);
    const lockedAt = sim.time;
    while (sim.time < lockedAt + 1) sim.step();
    expect(sim.vehicle.x - startX).toBeGreaterThan(1);
  });

  test('levels without pistons never lock road ends onto anchors', () => {
    for (const id of ['w1-2', 'w1-6', 'w3-1']) {
      const l = level(id);
      const sim = new Simulation(l, l.solution);
      sim.runToEnd();
      expect(sim.events.some((e) => e.type === 'latch'), id).toBe(false);
    }
  });
});
