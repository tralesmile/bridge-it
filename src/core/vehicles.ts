import type { VehicleId } from './types';

export interface VehicleDef {
  id: VehicleId;
  name: string;
  /** Chassis half sizes in metres. */
  halfWidth: number;
  halfHeight: number;
  chassisMass: number;
  wheelRadius: number;
  wheelMass: number;
  /** Wheel x offsets from the chassis centre. */
  wheelOffsets: number[];
  /** Wheel speed in radians per second (negative = drives right). */
  motorSpeed: number;
  motorTorque: number;
}

export const VEHICLES: Record<VehicleId, VehicleDef> = {
  car: {
    id: 'car',
    name: 'Moo Car',
    halfWidth: 0.85,
    halfHeight: 0.28,
    chassisMass: 260,
    wheelRadius: 0.32,
    wheelMass: 20,
    wheelOffsets: [-0.55, 0.55],
    motorSpeed: -9,
    motorTorque: 900,
  },
  truck: {
    id: 'truck',
    name: 'Hay Truck',
    halfWidth: 1.3,
    halfHeight: 0.4,
    chassisMass: 900,
    wheelRadius: 0.38,
    wheelMass: 40,
    wheelOffsets: [-0.9, 0, 0.9],
    motorSpeed: -6,
    motorTorque: 3500,
  },
};
