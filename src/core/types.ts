import type { MaterialId } from './materials';

/** A point in world space. x grows right, y grows UP (physics convention). */
export interface Point {
  x: number;
  y: number;
}

export type VehicleId = 'car' | 'truck' | 'train';

export interface LevelDef {
  id: string;
  world: number;
  index: number;
  name: string;
  /** The gap to cross: left cliff ends at gapStart, right cliff begins at gapEnd. */
  gapStart: number;
  gapEnd: number;
  /** Ground height of each cliff top. */
  leftHeight: number;
  rightHeight: number;
  /** Metres from the right cliff edge to the finish flag. Default 4. */
  goalDistance?: number;
  /** Fixed anchor points the bridge can attach to. */
  anchors: Point[];
  /** Total money available to build. */
  budget: number;
  /** Spend at or under these to earn the 2nd and 3rd star. */
  starBudgets: [number, number];
  vehicle: VehicleId;
  materials: MaterialId[];
  /** Short tip shown at level start. */
  tip?: string;
  /** Ship lanes: no node and no beam may be built with x between x0 and x1 of any lane (drawbridge levels). */
  shipLanes?: ShipLane[];
}

export interface Beam {
  a: string;
  b: string;
  material: MaterialId;
}

export type SimStatus = 'running' | 'won' | 'lost';
export type LossReason = 'fell' | 'timeout' | 'stuck' | 'collapse' | 'flipped';

export interface ShipLane {
  x0: number;
  x1: number;
}
