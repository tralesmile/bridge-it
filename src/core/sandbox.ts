import { build, hangers, roadDeck, rockPosts, type LevelEntry } from './levels';
import { findLevel } from './daily';
import type { MaterialId } from './materials';
import type { Point, VehicleId } from './types';

/**
 * Sandbox: build anything, with every material and no money limit. Nothing is scored or saved
 * except the bridge itself (per sandbox setup), so players can try ideas and share them as codes.
 */

export const SANDBOX_GAPS = [6, 10, 16, 24] as const;
export const SANDBOX_VEHICLES: readonly VehicleId[] = ['car', 'truck', 'train'];
export type SandboxBank = 'flat' | 'lower' | 'higher';
export const SANDBOX_BANKS: readonly SandboxBank[] = ['flat', 'lower', 'higher'];
export type SandboxHelp = 'none' | 'rocks' | 'posts' | 'both';
export const SANDBOX_HELPS: readonly SandboxHelp[] = ['none', 'rocks', 'posts', 'both'];

export interface SandboxOptions {
  gap: (typeof SANDBOX_GAPS)[number];
  vehicle: VehicleId;
  /** Height of the far bank: same, 2 m lower or 2 m higher. */
  bank: SandboxBank;
  /** Extra anchors: rocks below the road, high posts for ropes, or both. */
  help: SandboxHelp;
}

export const DEFAULT_SANDBOX: SandboxOptions = { gap: 10, vehicle: 'car', bank: 'flat', help: 'none' };

/** Every material, so the player can try anything. */
export const SANDBOX_MATERIALS: MaterialId[] = ['road', 'wood', 'steel', 'rope', 'piston', 'spring'];
/** Shown as the money: high enough that it never limits a bridge on the build area. */
export const SANDBOX_BUDGET = 99999;

export const SANDBOX_PREFIX = 'sandbox-';
export const isSandboxId = (id: string): boolean => id.startsWith(SANDBOX_PREFIX);

export const sandboxId = (o: SandboxOptions): string => `${SANDBOX_PREFIX}${o.gap}-${o.vehicle}-${o.bank}-${o.help}`;

/** Reads 'sandbox-10-car-flat-none'. Anything else gives undefined. */
export function parseSandboxId(id: string): SandboxOptions | undefined {
  if (!isSandboxId(id)) return undefined;
  const [gapText, vehicle, bank, help] = id.slice(SANDBOX_PREFIX.length).split('-');
  const gap = Number(gapText) as SandboxOptions['gap'];
  if (!SANDBOX_GAPS.includes(gap) || String(gap) !== gapText) return undefined;
  if (!SANDBOX_VEHICLES.includes(vehicle as VehicleId)) return undefined;
  if (!SANDBOX_BANKS.includes(bank as SandboxBank) || !SANDBOX_HELPS.includes(help as SandboxHelp)) return undefined;
  return { gap, vehicle: vehicle as VehicleId, bank: bank as SandboxBank, help: help as SandboxHelp };
}

const BANK_HEIGHT: Record<SandboxBank, number> = { flat: 0, lower: -2, higher: 2 };

/** The sandbox level for a setup. Same setup, same level (and the same saved bridge). */
export function sandboxLevel(o: SandboxOptions): LevelEntry {
  const rightHeight = BANK_HEIGHT[o.bank];
  // Rocks every 4 m, 2 m below the lower bank; high posts every 4 m, 4 m above the higher bank.
  const low = Math.min(0, rightHeight) - 2;
  const high = Math.max(0, rightHeight) + 4;
  const extraAnchors: Point[] = [
    ...(o.help === 'rocks' || o.help === 'both' ? rockPosts(o.gap, 4).map((p) => ({ x: p.x, y: low })) : []),
    ...(o.help === 'posts' || o.help === 'both' ? hangers(o.gap, 4, high) : []),
  ];
  const [level] = build(1, [
    {
      name: 'Sandbox',
      gap: o.gap,
      rightHeight,
      vehicle: o.vehicle,
      materials: SANDBOX_MATERIALS,
      extraAnchors,
      solution: (g) => roadDeck(0, g),
      tip: 'Sandbox: build anything. No money limit, no stars.',
    },
  ]);
  return { ...level, id: sandboxId(o), index: 0, budget: SANDBOX_BUDGET, starBudgets: [SANDBOX_BUDGET, SANDBOX_BUDGET], solution: [] };
}

/** A level by id: world levels, the daily bridge, or a sandbox setup. */
export function anyLevel(id: string): LevelEntry | undefined {
  const o = parseSandboxId(id);
  return o ? sandboxLevel(o) : findLevel(id);
}
