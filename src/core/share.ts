import { BridgeDesign, keyOf, pointOf } from './bridge';
import { anyLevel } from './sandbox';
import { MATERIAL_ORDER } from './materials';
import type { Beam } from './types';

/**
 * Share codes: "BI1.<levelId>.<data>.<check>".
 * data is base64url of 5 bytes per beam: ax, ay, bx, by (coordinate + 64), material index.
 * Only whole-number points are supported (the build grid is 1 m).
 */
const OFFSET = 64;
const PREFIX = 'BI1';

const toB64 = (bytes: number[]): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64 = (text: string): number[] | null => {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return [...bin].map((c) => c.charCodeAt(0));
  } catch {
    return null;
  }
};

/** Small checksum so typos in a pasted code are caught. */
const checksum = (text: string): string => {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 46656;
  return h.toString(36).padStart(3, '0');
};

export function encodeBridge(levelId: string, beams: Beam[]): string {
  const bytes: number[] = [];
  for (const beam of beams) {
    const a = pointOf(beam.a);
    const b = pointOf(beam.b);
    bytes.push(a.x + OFFSET, a.y + OFFSET, b.x + OFFSET, b.y + OFFSET, MATERIAL_ORDER.indexOf(beam.material));
  }
  const body = `${PREFIX}.${levelId}.${toB64(bytes)}`;
  return `${body}.${checksum(body)}`;
}

export type DecodeResult = { ok: true; levelId: string; beams: Beam[] } | { ok: false; error: string };

/** Reads a share code and checks every beam against the level rules. */
export function decodeBridge(code: string): DecodeResult {
  const text = code.trim();
  const parts = text.split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX) return { ok: false, error: 'This code is not a Bridge It! code.' };
  const check = parts[parts.length - 1];
  const body = parts.slice(0, -1).join('.');
  if (checksum(body) !== check) return { ok: false, error: 'The code has a typo. Please check it.' };
  const data = parts[2];
  const levelId = parts[1];
  const level = anyLevel(levelId);
  if (!level) return { ok: false, error: 'This level does not exist.' };
  const bytes = fromB64(data);
  if (!bytes || bytes.length % 5 !== 0) return { ok: false, error: 'The code is damaged.' };
  const design = new BridgeDesign(level);
  const beams: Beam[] = [];
  for (let i = 0; i < bytes.length; i += 5) {
    const material = MATERIAL_ORDER[bytes[i + 4]];
    if (!material) return { ok: false, error: 'The code uses an unknown material.' };
    const a = { x: bytes[i] - OFFSET, y: bytes[i + 1] - OFFSET };
    const b = { x: bytes[i + 2] - OFFSET, y: bytes[i + 3] - OFFSET };
    const result = design.add(a, b, material);
    if (!result.ok) return { ok: false, error: `The bridge does not fit this level (${result.reason}).` };
    beams.push({ a: keyOf(a), b: keyOf(b), material });
  }
  return { ok: true, levelId, beams };
}
