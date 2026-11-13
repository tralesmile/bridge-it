import { describe, expect, test } from 'vitest';
import { leaf, roadDeck, rockLegs, warrenTruss } from '../src/core/levels';
import {
  CUSTOM_MAX_ANCHORS, DEFAULT_CUSTOM, anchorProblem, cleanName, freshName, customId, customLevel, customStars, decodeLevel, encodeLevel,
  isCustomId, parseCustomId, specProblem, laneProblem, inLane, CUSTOM_GOAL, CUSTOM_MAX_LANES, type CustomSpec, FRIEND_STARS_MAX, addFriendStars, friendStarsOf, readFriendStars,
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

  test('a new level gets a name no other level has', () => {
    expect(freshName([])).toBe('My Level');
    expect(freshName(['My Level'])).toBe('My Level 2');
    expect(freshName(['My Level', 'My Level 2', 'My Level 4'])).toBe('My Level 3');
    expect(cleanName(freshName(Array.from({ length: 11 }, (_, i) => (i === 0 ? 'My Level' : `My Level ${i + 1}`))))).toBe('My Level 12');
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

describe('ship lanes and the flag in player levels', () => {
  const canal: CustomSpec = { ...DEFAULT_CUSTOM, name: 'Canal', gap: 4, materials: ['road', 'wood', 'piston'], anchors: [{ x: -1, y: 0 }], lanes: [0] };

  test('levels without lanes keep their old id', () => {
    expect(customId({ ...rocky, goal: CUSTOM_GOAL.default, lanes: [] })).toBe(customId(rocky));
    expect(customId({ ...rocky, goal: 6 })).not.toBe(customId(rocky));
  });

  test('lanes and the flag read back from the id and the level code', () => {
    for (const s of [canal, { ...rocky, goal: 6 }, { ...rocky, gap: 12, lanes: [0, 4, 8], goal: 2, anchors: [{ x: 4, y: -3 }] }]) {
      expect(specProblem(s)).toBeNull();
      const back = parseCustomId(customId(s));
      expect(back && customId(back)).toBe(customId(s));
      expect(back?.lanes ?? []).toEqual(s.lanes ?? []);
      expect(back?.goal ?? CUSTOM_GOAL.default).toBe(s.goal ?? CUSTOM_GOAL.default);
      const code = decodeLevel(encodeLevel({ ...s, authorCost: 500 }));
      expect(code.ok && code.spec.lanes).toEqual(s.lanes ?? (s.goal !== undefined ? [] : undefined));
    }
  });

  test('lane rules', () => {
    expect(laneProblem(rocky, 0)).toBeNull();
    expect(laneProblem(rocky, 8)).toBeNull();
    expect(laneProblem(rocky, 9)).toMatch(/fit/);
    expect(laneProblem(rocky, -1)).toMatch(/fit/);
    expect(laneProblem({ ...rocky, lanes: [2] }, 4)).toMatch(/overlap/);
    expect(laneProblem({ ...rocky, lanes: [2] }, 6)).toBeNull();
    expect(specProblem({ ...rocky, lanes: [4, 0] })).toMatch(/order/);
    expect(specProblem({ ...rocky, gap: 16, lanes: [0, 4, 8, 12], anchors: [] })).toMatch(new RegExp(`${CUSTOM_MAX_LANES}`));
    expect(specProblem({ ...rocky, goal: 1 })).toMatch(/flag/);
    expect(specProblem({ ...rocky, goal: 9 })).toMatch(/flag/);
    // Rocks may sit on a lane edge (a pier) but not where ships sail.
    expect(inLane({ lanes: [4] }, 4)).toBe(false);
    expect(inLane({ lanes: [4] }, 5)).toBe(true);
    expect(anchorProblem({ ...rocky, lanes: [4] }, { x: 6, y: -3 })).toMatch(/Ships/);
    expect(anchorProblem({ ...rocky, lanes: [4] }, { x: 8, y: -3 })).toBeNull();
  });

  test('the level has the lanes and the flag; a drawbridge crosses it, nothing does not', () => {
    const l = customLevel({ ...canal, goal: 6 });
    expect(l.shipLanes).toEqual([{ x0: 0, x1: 4 }]);
    expect(l.goalDistance).toBe(6);
    expect(customLevel(rocky).shipLanes).toBeUndefined();
    expect(customLevel(rocky).goalDistance).toBe(4);
    expect(new Simulation(l, leaf(0, 1)).runToEnd()).toBe('won');
    expect(new Simulation(l, []).runToEnd()).toBe('lost');
  }, 60000);
});

describe("stars on friends' levels", () => {
  const a = customId({ ...rocky, authorCost: 4321 });
  const b = customId({ ...DEFAULT_CUSTOM, authorCost: 800 });
  test('keeps the best stars and moves the newest win to the front', () => {
    let list = addFriendStars([], a, 2);
    expect(friendStarsOf(list, a)).toBe(2);
    list = addFriendStars(list, b, 1);
    expect(list.map((f) => f.id)).toEqual([b, a]);
    list = addFriendStars(list, a, 1);
    expect(list).toEqual([{ id: a, stars: 2 }, { id: b, stars: 1 }]);
    list = addFriendStars(list, b, 3);
    expect(friendStarsOf(list, b)).toBe(3);
    expect(friendStarsOf(list, 'custom-nope')).toBe(0);
  });
  test('drops the oldest level past the cap', () => {
    const ids = Array.from({ length: FRIEND_STARS_MAX + 5 }, (_, i) => customId({ ...DEFAULT_CUSTOM, budget: 1000 + i * 100 }));
    let list: ReturnType<typeof addFriendStars> = [];
    for (const id of ids) list = addFriendStars(list, id, 3);
    expect(list).toHaveLength(FRIEND_STARS_MAX);
    expect(list[0].id).toBe(ids[ids.length - 1]);
    expect(friendStarsOf(list, ids[0])).toBe(0);
  });
  test('reading a save drops bad entries', () => {
    expect(readFriendStars('x')).toEqual([]);
    const raw = [{ id: a, stars: 3 }, { id: a, stars: 1 }, { id: 'custom-!!', stars: 2 }, { id: 'level-1', stars: 2 }, { id: b, stars: 4 }, null, { id: b, stars: 1 }];
    expect(readFriendStars(raw)).toEqual([{ id: a, stars: 3 }, { id: b, stars: 1 }]);
    expect(readFriendStars(Array.from({ length: 60 }, () => ({ id: a, stars: 2 })))).toHaveLength(1);
  });
});
