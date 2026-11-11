/** Building materials. Units: metres, newtons, in-game dollars. */
export type MaterialId = 'road' | 'wood' | 'steel' | 'rope' | 'piston' | 'spring';

export interface Material {
  id: MaterialId;
  name: string;
  /** Longest beam allowed, in metres. */
  maxLength: number;
  /** Cost per metre in in-game dollars. */
  costPerMetre: number;
  /** Force in newtons a joint can take before it snaps. */
  strength: number;
  /** Mass per metre in kilograms. */
  massPerMetre: number;
  /** True if vehicles drive on it. */
  isRoad: boolean;
  /** True if it only pulls: it goes slack when pushed. */
  tensionOnly?: boolean;
  /** Hydraulic: grows by this fraction of its length while the attempt runs. */
  extends?: number;
  /** Spring: pushes and pulls back to its built length with this stiffness (N per m) and damping (N per m/s). Never snaps. */
  spring?: { stiffness: number; damping: number };
}

export const MATERIALS: Record<MaterialId, Material> = {
  road: { id: 'road', name: 'Road', maxLength: 2.25, costPerMetre: 200, strength: 16000, massPerMetre: 25, isRoad: true },
  wood: { id: 'wood', name: 'Wood', maxLength: 2.25, costPerMetre: 100, strength: 12000, massPerMetre: 10, isRoad: false },
  steel: { id: 'steel', name: 'Steel', maxLength: 3.2, costPerMetre: 300, strength: 30000, massPerMetre: 25, isRoad: false },
  rope: { id: 'rope', name: 'Rope', maxLength: 4.5, costPerMetre: 60, strength: 7000, massPerMetre: 2, isRoad: false, tensionOnly: true },
  piston: { id: 'piston', name: 'Piston', maxLength: 3.2, costPerMetre: 350, strength: 24000, massPerMetre: 15, isRoad: false, extends: 0.5 },
  spring: { id: 'spring', name: 'Spring', maxLength: 2.25, costPerMetre: 150, strength: Infinity, massPerMetre: 6, isRoad: false, spring: { stiffness: 24000, damping: 120 } },
};

export const MATERIAL_ORDER: MaterialId[] = ['road', 'wood', 'steel', 'rope', 'piston', 'spring'];
