import { BUILD_MARGIN_X, BUILD_MAX_Y, BUILD_MIN_Y, keyOf } from './bridge';
import { checksum, fromB64, toB64 } from './codec';
import { build, roadDeck, type LevelEntry } from './levels';
import { MATERIAL_ORDER, type MaterialId } from './materials';
import type { Point, VehicleId } from './types';

/**
 * Player-made levels. A level is small enough to live in its id ("custom-<data>"), so the same
 * id always gives the same level: the saved bridge, bridge codes and the level code all work
 * without a server. The author must cross their own level before the code can be shared; the
 * author's cost sets the 3-star budget.
 */

export const CUSTOM_PREFIX = 'custom-';
export const LEVEL_CODE_PREFIX = 'BL1';
const VERSION = 1;
const OFFSET = 64;

export const CUSTOM_GAP = { min: 2, max: 24 } as const;
export const CUSTOM_HEIGHT = { min: -4, max: 4 } as const;
export const CUSTOM_BUDGET = { min: 200, max: 50000, step: 100 } as const;
export const CUSTOM_MAX_ANCHORS = 16;
export const CUSTOM_NAME_MAX = 20;
export const CUSTOM_VEHICLES: readonly VehicleId[] = ['car', 'truck', 'train'];
/** How many levels "My levels" keeps. */
export const MY_LEVELS_MAX = 12;

export interface CustomSpec {
  name: string;
  gap: number;
  leftHeight: number;
  rightHeight: number;
  vehicle: VehicleId;
  /** Materials the player may use; road is always one of them. */
  materials: MaterialId[];
  budget: number;
  /** Extra anchors (rocks, posts) besides the four on the cliff edges. */
  anchors: Point[];
  /** What the author's winning bridge cost; 0 while the level is not crossed yet. */
  authorCost: number;
}

export const DEFAULT_CUSTOM: CustomSpec = {
  name: 'My Level',
  gap: 8,
  leftHeight: 0,
  rightHeight: 0,
  vehicle: 'car',
  materials: ['road', 'wood'],
  budget: 4000,
  anchors: [],
  authorCost: 0,
};

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** Letters (any language), digits, spaces and a few signs; at most 20 characters. */
export function cleanName(name: string): string {
  const kept = [...name.replace(/[^\p{L}\p{N} '!?&-]/gu, '').replace(/\s+/g, ' ').trim()].slice(0, CUSTOM_NAME_MAX).join('');
  return kept.trim() || DEFAULT_CUSTOM.name;
}

/** A name for a new level that no other level in the list has: "My Level", "My Level 2", ... */
export function freshName(taken: readonly string[]): string {
  const used = new Set(taken);
  if (!used.has(DEFAULT_CUSTOM.name)) return DEFAULT_CUSTOM.name;
  for (let i = 2; ; i++) if (!used.has(`${DEFAULT_CUSTOM.name} ${i}`)) return `${DEFAULT_CUSTOM.name} ${i}`;
}

/** The four anchors every level has on the cliff edges. */
export const baseAnchors = (s: Pick<CustomSpec, 'gap' | 'leftHeight' | 'rightHeight'>): Point[] => [
  { x: 0, y: s.leftHeight },
  { x: s.gap, y: s.rightHeight },
  { x: 0, y: s.leftHeight - 2 },
  { x: s.gap, y: s.rightHeight - 2 },
];

/** Where an extra anchor may go: on the build grid, inside the build area, not on a base anchor. */
export function anchorProblem(s: Pick<CustomSpec, 'gap' | 'leftHeight' | 'rightHeight'>, p: Point): string | null {
  if (!isInt(p.x) || !isInt(p.y)) return 'Anchors sit on the grid.';
  if (p.x < -BUILD_MARGIN_X || p.x > s.gap + BUILD_MARGIN_X || p.y < BUILD_MIN_Y || p.y > BUILD_MAX_Y) return 'Too far out.';
  if (baseAnchors(s).some((a) => a.x === p.x && a.y === p.y)) return 'There is an anchor here already.';
  return null;
}

/** Checks a spec. Returns an error text for the player, or null when it is fine. */
export function specProblem(s: CustomSpec): string | null {
  if (!isInt(s.gap) || s.gap < CUSTOM_GAP.min || s.gap > CUSTOM_GAP.max) return `The gap must be ${CUSTOM_GAP.min} to ${CUSTOM_GAP.max} m.`;
  for (const h of [s.leftHeight, s.rightHeight]) {
    if (!isInt(h) || h < CUSTOM_HEIGHT.min || h > CUSTOM_HEIGHT.max) return `Cliff heights must be ${CUSTOM_HEIGHT.min} to ${CUSTOM_HEIGHT.max} m.`;
  }
  if (!CUSTOM_VEHICLES.includes(s.vehicle)) return 'Unknown vehicle.';
  if (!s.materials.includes('road')) return 'Road must be one of the materials.';
  if (!s.materials.every((m) => MATERIAL_ORDER.includes(m)) || new Set(s.materials).size !== s.materials.length) return 'Unknown material.';
  if (!isInt(s.budget) || s.budget < CUSTOM_BUDGET.min || s.budget > CUSTOM_BUDGET.max || s.budget % CUSTOM_BUDGET.step !== 0) {
    return `The money must be $${CUSTOM_BUDGET.min} to $${CUSTOM_BUDGET.max}.`;
  }
  if (s.anchors.length > CUSTOM_MAX_ANCHORS) return `At most ${CUSTOM_MAX_ANCHORS} extra anchors.`;
  const seen = new Set<string>();
  for (const p of s.anchors) {
    const bad = anchorProblem(s, p);
    if (bad) return bad;
    if (seen.has(keyOf(p))) return 'Two anchors in one place.';
    seen.add(keyOf(p));
  }
  if (!isInt(s.authorCost) || s.authorCost < 0 || s.authorCost > s.budget) return 'The test cost is wrong.';
  if (cleanName(s.name) !== s.name) return 'Please use a shorter name with letters and numbers.';
  return null;
}

/** Bytes: version, gap, heights, vehicle, material bits, budget/100 (2), author cost (3), anchors, then the name. */
function toBytes(s: CustomSpec): number[] {
  const mask = s.materials.reduce((m, id) => m | (1 << MATERIAL_ORDER.indexOf(id)), 0);
  const b100 = s.budget / 100;
  const bytes = [VERSION, s.gap, s.leftHeight + OFFSET, s.rightHeight + OFFSET, CUSTOM_VEHICLES.indexOf(s.vehicle), mask, b100 >> 8, b100 & 255];
  bytes.push((s.authorCost >> 16) & 255, (s.authorCost >> 8) & 255, s.authorCost & 255, s.anchors.length);
  for (const p of s.anchors) bytes.push(p.x + OFFSET, p.y + OFFSET);
  bytes.push(...new TextEncoder().encode(s.name));
  return bytes;
}

function fromBytes(bytes: number[]): CustomSpec | null {
  if (bytes.length < 12 || bytes[0] !== VERSION) return null;
  const count = bytes[11];
  if (bytes.length < 12 + count * 2) return null;
  const anchors: Point[] = [];
  for (let i = 0; i < count; i++) anchors.push({ x: bytes[12 + i * 2] - OFFSET, y: bytes[13 + i * 2] - OFFSET });
  let name: string;
  try {
    name = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes.slice(12 + count * 2)));
  } catch {
    return null;
  }
  const vehicle = CUSTOM_VEHICLES[bytes[4]];
  const materials = MATERIAL_ORDER.filter((_, i) => bytes[5] & (1 << i));
  if (!vehicle || bytes[5] >= 1 << MATERIAL_ORDER.length) return null;
  const spec: CustomSpec = {
    name,
    gap: bytes[1],
    leftHeight: bytes[2] - OFFSET,
    rightHeight: bytes[3] - OFFSET,
    vehicle,
    materials,
    budget: ((bytes[6] << 8) | bytes[7]) * 100,
    anchors,
    authorCost: (bytes[8] << 16) | (bytes[9] << 8) | bytes[10],
  };
  return specProblem(spec) ? null : spec;
}

export const isCustomId = (id: string): boolean => id.startsWith(CUSTOM_PREFIX);

/** The level id for a spec (the spec is inside it). */
export const customId = (s: CustomSpec): string => `${CUSTOM_PREFIX}${toB64(toBytes(s))}`;

export function parseCustomId(id: string): CustomSpec | undefined {
  if (!isCustomId(id)) return undefined;
  const bytes = fromB64(id.slice(CUSTOM_PREFIX.length));
  return (bytes && fromBytes(bytes)) || undefined;
}

const roundUp = (v: number, step: number): number => Math.ceil(v / step) * step;

/** Star budgets from the author's cost: 3 stars at the author's cost, 2 stars halfway to the full money. */
export function customStars(s: CustomSpec): [number, number] {
  if (s.authorCost <= 0) return [s.budget, s.budget];
  const three = Math.min(s.budget, roundUp(s.authorCost, 50));
  const two = Math.min(s.budget, Math.max(three, roundUp((three + s.budget) / 2, 50)));
  return [two, three];
}

/** The playable level for a spec. The same spec always gives the same level. */
export function customLevel(s: CustomSpec): LevelEntry {
  const extra = s.anchors.filter((p) => !baseAnchors(s).some((a) => a.x === p.x && a.y === p.y));
  const [level] = build(1, [
    {
      name: s.name,
      gap: s.gap,
      leftHeight: s.leftHeight,
      rightHeight: s.rightHeight,
      vehicle: s.vehicle,
      materials: MATERIAL_ORDER.filter((m) => s.materials.includes(m)),
      extraAnchors: extra,
      solution: (g) => roadDeck(0, g),
      tip: s.authorCost > 0 ? 'A player made this level. Can you cross it?' : 'Your level: build a bridge that crosses it.',
    },
  ]);
  return { ...level, id: customId(s), index: 0, budget: s.budget, starBudgets: customStars(s), solution: [] };
}

/** "BL1.<data>.<check>": a level code to share. Only for levels the author has crossed. */
export function encodeLevel(s: CustomSpec): string {
  const body = `${LEVEL_CODE_PREFIX}.${customId(s).slice(CUSTOM_PREFIX.length)}`;
  return `${body}.${checksum(body)}`;
}

export type LevelCodeResult = { ok: true; spec: CustomSpec } | { ok: false; error: string };

export function decodeLevel(code: string): LevelCodeResult {
  const parts = code.trim().split('.');
  if (parts.length !== 3 || parts[0] !== LEVEL_CODE_PREFIX) return { ok: false, error: 'This is not a Bridge It! level code.' };
  if (checksum(`${parts[0]}.${parts[1]}`) !== parts[2]) return { ok: false, error: 'The code has a typo. Please check it.' };
  const spec = parseCustomId(`${CUSTOM_PREFIX}${parts[1]}`);
  if (!spec) return { ok: false, error: 'The code is damaged.' };
  if (spec.authorCost <= 0) return { ok: false, error: 'This level was never crossed by its maker.' };
  return { ok: true, spec };
}

/** How many friends' levels keep their stars (newest first, so the save stays small). */
export const FRIEND_STARS_MAX = 40;

/** Best stars on a friend's level (a `custom-` id from a level code). */
export interface FriendStars {
  id: string;
  stars: 1 | 2 | 3;
}

/** The best stars kept for a friend's level, or 0. */
export const friendStarsOf = (list: readonly FriendStars[], id: string): number => list.find((f) => f.id === id)?.stars ?? 0;

/** Adds a win: keeps the best stars, moves the level to the front, and drops the oldest past `max`. */
export function addFriendStars(list: readonly FriendStars[], id: string, stars: number, max = FRIEND_STARS_MAX): FriendStars[] {
  const s = Math.max(1, Math.min(3, Math.round(stars))) as 1 | 2 | 3;
  const best = Math.max(s, friendStarsOf(list, id)) as 1 | 2 | 3;
  return [{ id, stars: best }, ...list.filter((f) => f.id !== id)].slice(0, max);
}

/** Reads the list from a save: only real level ids, stars 1 to 3, no repeats, at most `max`. */
export function readFriendStars(raw: unknown, max = FRIEND_STARS_MAX): FriendStars[] {
  if (!Array.isArray(raw)) return [];
  const out: FriendStars[] = [];
  for (const f of raw) {
    if (out.length >= max) break;
    if (!f || typeof f !== 'object') continue;
    const { id, stars } = f as Partial<FriendStars>;
    if (typeof id !== 'string' || !isCustomId(id) || parseCustomId(id) === undefined) continue;
    if (stars !== 1 && stars !== 2 && stars !== 3) continue;
    if (out.some((o) => o.id === id)) continue;
    out.push({ id, stars });
  }
  return out;
}
