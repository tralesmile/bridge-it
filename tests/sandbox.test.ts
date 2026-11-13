import { describe, expect, test } from 'vitest';
import { BridgeDesign } from '../src/core/bridge';
import { beam, rockLegs, roadDeck, warrenTruss } from '../src/core/levels';
import {
  DEFAULT_SANDBOX, SANDBOX_BANKS, SANDBOX_BUDGET, SANDBOX_GAPS, SANDBOX_HELPS, SANDBOX_MATERIALS, SANDBOX_VEHICLES,
  anyLevel, isSandboxId, parseSandboxId, sandboxId, sandboxLevel, type SandboxOptions,
} from '../src/core/sandbox';
import { decodeBridge, encodeBridge } from '../src/core/share';
import { Simulation } from '../src/core/simulation';
import { BUILD_MAX_Y, BUILD_MIN_Y } from '../src/core/bridge';

const all: SandboxOptions[] = SANDBOX_GAPS.flatMap((gap) =>
  SANDBOX_VEHICLES.flatMap((vehicle) => SANDBOX_BANKS.flatMap((bank) => SANDBOX_HELPS.map((help) => ({ gap, vehicle, bank, help })))),
);

describe('sandbox', () => {
  test('ids round-trip, and bad ids are refused', () => {
    expect(all).toHaveLength(4 * 3 * 3 * 4);
    for (const o of all) expect(parseSandboxId(sandboxId(o))).toEqual(o);
    for (const bad of ['sandbox-', 'sandbox-7-car-flat-none', 'sandbox-10-bus-flat-none', 'sandbox-10-car-up-none', 'sandbox-10-car-flat-lots', 'sandbox-010-car-flat-none', 'w1-1'])
      expect(parseSandboxId(bad), bad).toBeUndefined();
    expect(isSandboxId(sandboxId(DEFAULT_SANDBOX))).toBe(true);
  });

  test('every setup is a valid level: all materials, no money limit, anchors inside the build area, empty bridge loses', () => {
    for (const o of all) {
      const level = sandboxLevel(o);
      expect(level.id).toBe(sandboxId(o));
      expect(level.vehicle).toBe(o.vehicle);
      expect(level.materials).toEqual(SANDBOX_MATERIALS);
      expect(level.budget).toBe(SANDBOX_BUDGET);
      expect(level.solution).toEqual([]);
      for (const a of level.anchors) {
        expect(a.y).toBeGreaterThanOrEqual(BUILD_MIN_Y);
        expect(a.y).toBeLessThanOrEqual(BUILD_MAX_Y);
      }
      expect(new Set(level.anchors.map((a) => `${a.x},${a.y}`)).size).toBe(level.anchors.length);
    }
    for (const o of all.filter((x) => x.vehicle === 'car' && x.help === 'none')) expect(new Simulation(sandboxLevel(o), []).runToEnd()).toBe('lost');
  }, 60000);

  test('anyLevel finds world levels, daily levels and sandbox setups', () => {
    expect(anyLevel('w1-1')?.name).toBe('First Crossing');
    expect(anyLevel('daily-2026-11-13')?.id).toBe('daily-2026-11-13');
    expect(anyLevel('sandbox-16-truck-lower-rocks')?.rightHeight).toBe(-2);
    expect(anyLevel('sandbox-junk')).toBeUndefined();
  });

  test('real bridges cross: a truss for the car, a ramp down, and a truck on rocks', () => {
    const truss = sandboxLevel({ gap: 6, vehicle: 'car', bank: 'flat', help: 'none' });
    expect(new Simulation(truss, [...roadDeck(0, 6), ...warrenTruss(0, 6)]).runToEnd()).toBe('won');
    const down = sandboxLevel({ gap: 6, vehicle: 'car', bank: 'lower', help: 'rocks' });
    expect(down.anchors).toContainEqual({ x: 4, y: -4 });
    const ramp = [beam('0,0', '2,-1', 'road'), beam('2,-1', '4,-2', 'road'), beam('4,-2', '6,-2', 'road'), beam('2,-1', '0,-2', 'wood'), beam('4,-2', '4,-4', 'steel')];
    expect(new Simulation(down, ramp).runToEnd()).toBe('won');
    const rocks = sandboxLevel({ gap: 16, vehicle: 'truck', bank: 'flat', help: 'rocks' });
    expect(new Simulation(rocks, [...roadDeck(0, 16), ...warrenTruss(0, 16), ...rockLegs(16, 4, 'steel')]).runToEnd()).toBe('won');
  }, 60000);

  test('sandbox bridges can be shared as codes', () => {
    const level = sandboxLevel({ gap: 6, vehicle: 'car', bank: 'flat', help: 'none' });
    const beams = [...roadDeck(0, 6), ...warrenTruss(0, 6)];
    const code = encodeBridge(level.id, beams);
    const back = decodeBridge(code);
    expect(back.ok && back.levelId).toBe(level.id);
    expect(back.ok && back.beams.length).toBe(beams.length);
    // The design rules still apply (a beam must start on an anchor or the bridge).
    expect(new BridgeDesign(level, beams).list.length).toBe(beams.length);
  });
});
