import { describe, expect, test } from 'vitest';
import { roadDeck, rockLegs, warrenTruss } from '../src/core/levels';
import {
  CUSTOM_MAX_ANCHORS, DEFAULT_CUSTOM, anchorProblem, cleanName, customId, customLevel, customStars, decodeLevel, encodeLevel,
  isCustomId, parseCustomId, specProblem, type CustomSpec,
} from '../src/core/custom';
import { anyLevel } from '../src/core/sandbox';
import { decodeBridge, encodeBridge } from '../src/core/share';
import { Simulation } from '../src/core/simulation';
import { costOf } from '../src/core/levels';

const rocky: CustomSpec = {
  name: 'Rocky Road',
  gap: 12,
  leftHeight: 1,
  rightHeight: -1,
  vehicle: 'truck',
  materials: ['road', 'wood', 'steel'],
  budget: 9000,
  anchors: [{ x: 4, y: -3 }, { x: 8, y: -3 }],
  authorCost: 4321,
};

describe('player levels', () => {
  test('the id holds the whole level and reads back the same', () => {
    for (const s of [DEFAULT_CUSTOM, rocky, { ...rocky, name: 'Мост 橋 Ü', vehicle: 'train' as const, materials: ['road', 'rope', 'piston', 'spring'] as CustomSpec['materials'] }]) {
      expect(specProblem(s)).toBeNull();
      const id = customId(s);
      expect(isCustomId(id)).toBe(true);
      expect(id).toMatch(/^custom-[A-Za-z0-9_-]+$/);
      expect(parseCustomId(id)).toEqual(s);
      expect(anyLevel(id)?.id).toBe(id);
    }
    expect(parseCustomId('custom-')).toBeUndefined();
    expect(parseCustomId('custom-!!!')).toBeUndefined();
    expect(parseCustomId('w1-1')).toBeUndefined();
    // A cut-off id is refused, never half read.
    const id = customId(rocky);
    expect(parseCustomId(id.slice(0, 20))).toBeUndefined();
  });

  test('bad specs are refused with a short reason', () => {
    expect(specProblem({ ...rocky, gap: 1 })).toMatch(/gap/);
    expect(specProblem({ ...rocky, gap: 30 })).toMatch(/gap/);
    expect(specProblem({ ...rocky, rightHeight: 5 })).toMatch(/height/);
    expect(specProblem({ ...rocky, materials: ['wood'] })).toMatch(/Road/);
    expect(specProblem({ ...rocky, budget: 150 })).toMatch(/money/);
    expect(specProblem({ ...rocky, budget: 2050 })).toMatch(/money/);
    expect(specProblem({ ...rocky, authorCost: 9100 })).not.toBeNull();
    expect(specProblem({ ...rocky, anchors: [{ x: 4, y: -3 }, { x: 4, y: -3 }] })).toMatch(/Two/);
    expect(specProblem({ ...rocky, anchors: [{ x: 0, y: 1 }] })).toMatch(/already/);
    expect(specProblem({ ...rocky, anchors: [{ x: 4.5, y: 0 }] })).toMatch(/grid/);
    expect(specProblem({ ...rocky, anchors: [{ x: 30, y: 0 }] })).toMatch(/far/);
    const many = Array.from({ length: CUSTOM_MAX_ANCHORS + 1 }, (_, i) => ({ x: (i % 10) + 1, y: i < 10 ? -4 : -5 }));
    expect(specProblem({ ...rocky, anchors: many })).toMatch(/most/);
    expect(anchorProblem(rocky, { x: 6, y: -5 })).toBeNull();
  });

  test('names are cleaned and short', () => {
    expect(cleanName('  My   <b>Bridge</b>!  ')).toBe('My bBridgeb!');
    expect(cleanName('')).toBe(DEFAULT_CUSTOM.name);
    expect(cleanName('x'.repeat(40))).toHaveLength(20);
    expect(specProblem({ ...rocky, name: ' Rocky' })).not.toBeNull();
  });

  test('the level: cliffs, anchors, money and stars from the maker', () => {
    const l = customLevel(rocky);
    expect(l.gapEnd - l.gapStart).toBe(12);
    expect(l.leftHeight).toBe(1);
    expect(l.rightHeight).toBe(-1);
    expect(l.anchors).toEqual(expect.arrayContaining([{ x: 0, y: 1 }, { x: 12, y: -1 }, { x: 4, y: -3 }, { x: 8, y: -3 }]));
    expect(l.budget).toBe(9000);
    expect(l.starBudgets).toEqual([6700, 4350]);
    expect(customStars({ ...rocky, authorCost: 0 })).toEqual([9000, 9000]);
    expect(customStars({ ...rocky, authorCost: 8990 })).toEqual([9000, 9000]);
    expect(new Simulation(l, []).runToEnd()).toBe('lost');
  });

  test('a real bridge crosses a player level, and bridge codes work on it', () => {
    const s: CustomSpec = { ...rocky, leftHeight: 0, rightHeight: 0, anchors: [{ x: 4, y: -2 }, { x: 8, y: -2 }], authorCost: 0 };
    const beams = [...roadDeck(0, 12), ...warrenTruss(0, 12), ...rockLegs(12, 4, 'steel')];
    const l = customLevel(s);
    expect(new Simulation(l, beams).runToEnd()).toBe('won');
    expect(costOf(beams)).toBeLessThanOrEqual(s.budget);
    const back = decodeBridge(encodeBridge(l.id, beams));
    expect(back.ok && back.levelId).toBe(l.id);
    expect(back.ok && back.beams.length).toBe(beams.length);
  }, 60000);

  test('level codes: round trip, typos, and only crossed levels', () => {
    const code = encodeLevel(rocky);
    expect(code).toMatch(/^BL1\.[A-Za-z0-9_-]+\.[0-9a-z]{3}$/);
    const back = decodeLevel(`  ${code} `);
    expect(back.ok && back.spec).toEqual(rocky);
    const typo = code.replace(/\.([A-Za-z0-9_-])/, (_, c: string) => `.${c === 'A' ? 'B' : 'A'}`);
    expect(decodeLevel(typo)).toEqual({ ok: false, error: 'The code has a typo. Please check it.' });
    expect(decodeLevel('BI1.w1-1.AAAA.abc').ok).toBe(false);
    expect(decodeLevel('hello').ok).toBe(false);
    const fresh = decodeLevel(encodeLevel({ ...rocky, authorCost: 0 }));
    expect(fresh.ok).toBe(false);
  });
});
