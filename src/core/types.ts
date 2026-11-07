import type { MaterialId } from './materials';

/** A point in world space. x grows right, y grows UP (physics convention). */
export interface Point {
  x: number;
  y: number;
}

export type VehicleId = 'car' | 'truck';

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
}

export interface Beam {
  a: string;
  b: string;
  material: MaterialId;
}

export type SimStatus = 'running' | 'won' | 'lost';
export type LossReason = 'fell' | 'timeout' | 'stuck' | 'collapse';
