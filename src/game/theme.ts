/** Design tokens: one place for every colour, size and font. */
export const FONT = '"Fredoka Variable", "Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';

export const C = {
  skyTop: '#7cc6ff',
  skyBottom: '#ffe2c2',
  hillFar: '#9fd39a',
  hillNear: '#6dbb6a',
  grass: '#5fb24f',
  grassLight: '#8fd36f',
  dirt: '#b77a4a',
  dirtDark: '#8e5a35',
  water: '#3fa7e0',
  waterLight: '#8fd4ff',
  ink: '#2b2140',
  white: '#ffffff',
  cream: '#fff7e8',
  primary: '#ff7a3d',
  primaryDark: '#d9572a',
  good: '#4cc35a',
  goodDark: '#2f9a3e',
  blue: '#3c8dff',
  blueDark: '#2a65c4',
  grey: '#8a90a6',
  greyDark: '#5d6378',
  gold: '#ffc93c',
  anchor: '#e8473d',
  road: '#4a4458',
  roadLine: '#ffd84a',
  wood: '#c98a4b',
  woodLight: '#e6ad6f',
  steel: '#8ea3c0',
  steelLight: '#c6d4e8',
  rope: '#b99a6b',
  ropeLight: '#e0c89a',
  piston: '#3fae9f',
  pistonLight: '#a6ebe1',
  stress: '#ff3b30',
} as const;

/** Colour string '#rrggbb' to Phaser number 0xrrggbb. */
export const hex = (c: string): number => parseInt(c.slice(1), 16);

/** Mixes two '#rrggbb' colours. t = 0 gives a, 1 gives b. */
export function mix(a: string, b: string, t: number): number {
  const pa = hex(a);
  const pb = hex(b);
  const ch = (v: number, s: number) => (v >> s) & 255;
  const lerp = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return (lerp(16) << 16) | (lerp(8) << 8) | lerp(0);
}

/** World metres to screen pixels. */
export const PX_PER_M = 48;
export const GAME_W = 1280;
export const GAME_H = 720;

/** Backdrop colours per world (index = world id - 1). World 1 uses the defaults above. */
export const WORLD_BACKGROUNDS = [
  { skyTop: C.skyTop, skyBottom: C.skyBottom, hillFar: C.hillFar, hillNear: C.hillNear },
  { skyTop: '#f2a07a', skyBottom: '#ffe3a8', hillFar: '#d49a78', hillNear: '#b8704f' },
  { skyTop: '#3fb6e0', skyBottom: '#d6f3ff', hillFar: '#5fa8b8', hillNear: '#e3c88a' },
  // River Town: soft evening sky, blue-grey far hills, green river banks.
  { skyTop: '#7fa8d8', skyBottom: '#f6e2c4', hillFar: '#8a9bb5', hillNear: '#6fae6a' },
];
