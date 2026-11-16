/**
 * Accessibility helpers (no Phaser, no browser): colour contrast and keyboard tool keys.
 * See docs/ACCESSIBILITY.md for the review these come from.
 */

/** Relative luminance of a '#rrggbb' colour (WCAG 2 formula). */
export function luminance(color: string): number {
  const n = parseInt(color.slice(1), 16);
  const lin = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/** WCAG contrast ratio of two '#rrggbb' colours, from 1 (same) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA for large or bold text (all game text is bold and at least 15 px on a 720 px screen). */
export const MIN_CONTRAST_LARGE = 3;

/**
 * The tool for a number key: '1' is the first tool, '2' the second, and so on.
 * Returns the index, or -1 when the key is not a number for one of `count` tools.
 */
export function toolIndexForKey(key: string, count: number): number {
  if (!/^[1-9]$/.test(key)) return -1;
  const i = Number(key) - 1;
  return i < count ? i : -1;
}
