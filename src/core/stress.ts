/**
 * Stress Test: after a level is solved, the same bridge is tried with the next heavier vehicle.
 * Just for fun: it never changes stars, coins or fail counts.
 */
import type { LevelDef, VehicleId } from './types';

const HEAVIER: Record<VehicleId, VehicleId | null> = { car: 'truck', truck: 'train', train: null };

/** The heavier vehicle for a stress test, or null when the level already uses the heaviest. */
export const stressVehicle = (v: VehicleId): VehicleId | null => HEAVIER[v];

/** The level with the heavier vehicle (same id, anchors and budget), or null if there is none. */
export function stressLevel<T extends LevelDef>(level: T): T | null {
  const v = stressVehicle(level.vehicle);
  return v ? { ...level, vehicle: v } : null;
}
