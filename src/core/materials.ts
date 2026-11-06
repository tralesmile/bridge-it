/** Building materials. Units: metres, newtons, in-game dollars. */
export type MaterialId = 'road' | 'wood' | 'steel';

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
}

export const MATERIALS: Record<MaterialId, Material> = {
  road: { id: 'road', name: 'Road', maxLength: 2.25, costPerMetre: 200, strength: 16000, massPerMetre: 25, isRoad: true },
  wood: { id: 'wood', name: 'Wood', maxLength: 2.25, costPerMetre: 100, strength: 12000, massPerMetre: 10, isRoad: false },
  steel: { id: 'steel', name: 'Steel', maxLength: 3.2, costPerMetre: 300, strength: 30000, massPerMetre: 25, isRoad: false },
};

export const MATERIAL_ORDER: MaterialId[] = ['road', 'wood', 'steel'];
