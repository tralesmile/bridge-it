import { describe, expect, it } from 'vitest';
import { MIN_CONTRAST_LARGE, contrastRatio, luminance, toolIndexForKey } from '../src/core/a11y';
import { C, outlineOf, shadeOf } from '../src/game/theme';
import { SHOP_ITEMS } from '../src/core/shop';

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBeCloseTo(1);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
    expect(contrastRatio('#ffffff', '#777777')).toBe(contrastRatio('#777777', '#ffffff'));
  });

  it('white button labels have a dark enough outline on every button colour', () => {
    const shades = [C.primaryDark, C.goodDark, C.blueDark, C.greyDark, '#7d6642', '#2a7a6f', '#b03b72', '#a8302a'];
    // Tool buttons use the shade of the equipped paint.
    for (const item of SHOP_ITEMS) for (const c of item.colors ?? []) if (/^#[0-9a-f]{6}$/i.test(c)) shades.push(shadeOf(c));
    for (const sh of shades) expect(contrastRatio(C.white, outlineOf(sh)), sh).toBeGreaterThanOrEqual(4.5);
  });

  it('ink text on gold and cream panels is readable', () => {
    for (const bg of [C.gold, C.cream, C.white]) expect(contrastRatio(C.ink, bg)).toBeGreaterThanOrEqual(MIN_CONTRAST_LARGE);
  });
});

describe('tool keys', () => {
  it('1 to 9 pick the tools in order', () => {
    expect(toolIndexForKey('1', 4)).toBe(0);
    expect(toolIndexForKey('4', 4)).toBe(3);
    expect(toolIndexForKey('5', 4)).toBe(-1);
    expect(toolIndexForKey('0', 4)).toBe(-1);
    expect(toolIndexForKey('a', 4)).toBe(-1);
    expect(toolIndexForKey('12', 20)).toBe(-1);
  });
});
