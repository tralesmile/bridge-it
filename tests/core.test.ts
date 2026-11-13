import { describe, expect, test } from 'vitest';
import { BridgeDesign, distanceToSegment, keyOf, snap } from '../src/core/bridge';
import { levelById } from '../src/core/levels';
import { LEVELS_PER_PAGE, isUnlocked, pageCount, pageOfIndex, starsFor } from '../src/core/scoring';
import { Simulation } from '../src/core/simulation';
import { SaveStore, sanitize } from '../src/game/save';
import { LOOSE_DESIGNS_MAX, MY_LEVELS_MAX, customId, staleCustomDesigns, type CustomSpec } from '../src/core/custom';

const level = levelById('w1-3')!;

describe('BridgeDesign', () => {
  test('rejects beams that are too long, duplicated, buried or off the map', () => {
    const d = new BridgeDesign(level);
    expect(d.add({ x: 0, y: 0 }, { x: 3, y: 0 }, 'road')).toEqual({ ok: false, reason: 'too-long' });
    expect(d.add({ x: 0, y: 0 }, { x: 0, y: 0 }, 'road')).toEqual({ ok: false, reason: 'same-point' });
    expect(d.add({ x: 0, y: 0 }, { x: 2, y: 0 }, 'road')).toEqual({ ok: true });
    expect(d.add({ x: 2, y: 0 }, { x: 0, y: 0 }, 'road')).toEqual({ ok: false, reason: 'duplicate' });
    expect(d.add({ x: 0, y: 0 }, { x: -1, y: -1 }, 'wood')).toEqual({ ok: false, reason: 'in-ground' });
    expect(d.add({ x: 2, y: 0 }, { x: 2, y: 9 }, 'wood').ok).toBe(false);
    expect(d.add({ x: 2, y: 0 }, { x: 3, y: 1 }, 'steel')).toEqual({ ok: false, reason: 'material-locked' });
  });

  test('replacing a beam with another material swaps it', () => {
    const d = new BridgeDesign(levelById('w1-7')!);
    d.add({ x: 0, y: 0 }, { x: 1, y: 1 }, 'wood');
    d.add({ x: 1, y: 1 }, { x: 0, y: 0 }, 'steel');
    expect(d.list).toHaveLength(1);
    expect(d.list[0].material).toBe('steel');
  });

  test('restore drops saved beams that break the level rules', () => {
    const d = BridgeDesign.restore({ ...level, budget: 500 }, [
      { a: '0,0', b: '2,0', material: 'road' },
      { a: '0,0', b: '-1,-1', material: 'wood' },
      { a: '2,0', b: '4,0', material: 'road' },
      { a: '0,0', b: '1,1', material: 'nope' as never },
    ]);
    expect(d.list).toEqual([{ a: '0,0', b: '2,0', material: 'road' }]);
    expect(d.canUndo).toBe(false);
  });

  test('respects the budget', () => {
    const tight = { ...level, budget: 500 };
    const d = new BridgeDesign(tight);
    expect(d.add({ x: 0, y: 0 }, { x: 2, y: 0 }, 'road').ok).toBe(true);
    expect(d.add({ x: 2, y: 0 }, { x: 4, y: 0 }, 'road')).toEqual({ ok: false, reason: 'over-budget' });
  });

  test('undo restores the previous design, and erase removes the nearest beam', () => {
    const d = new BridgeDesign(level);
    d.add({ x: 0, y: 0 }, { x: 2, y: 0 }, 'road');
    d.add({ x: 2, y: 0 }, { x: 4, y: 0 }, 'road');
    expect(d.removeNear({ x: 3, y: 0.1 })).toBe(true);
    expect(d.list).toHaveLength(1);
    expect(d.undo()).toBe(true);
    expect(d.list).toHaveLength(2);
    expect(d.removeNear({ x: 9, y: 9 })).toBe(false);
  });

  test('snap and keys are stable', () => {
    expect(snap({ x: 1.4, y: -0.6 })).toEqual({ x: 1, y: -1 });
    expect(keyOf({ x: 1, y: -0 })).toBe(keyOf({ x: 1, y: 0 }).replace('-0', '0'));
    expect(distanceToSegment({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(1);
  });
});

describe('simulation', () => {
  test('is deterministic: the same design gives the same result and time', () => {
    const a = new Simulation(level, level.solution);
    const b = new Simulation(level, level.solution);
    a.runToEnd();
    b.runToEnd();
    expect(a.status).toBe(b.status);
    expect(a.time).toBe(b.time);
    expect(a.vehicle.x).toBe(b.vehicle.x);
  });

  test('a long road with no triangles collapses', () => {
    const sim = new Simulation(level, level.solution.filter((beam) => beam.material === 'road'));
    expect(sim.runToEnd()).toBe('lost');
    expect(sim.brokenCount).toBeGreaterThan(0);
  });
});

describe('scoring', () => {
  test('stars follow the star budgets', () => {
    const [two, three] = level.starBudgets;
    expect(starsFor(level, three)).toBe(3);
    expect(starsFor(level, two)).toBe(2);
    expect(starsFor(level, two + 1)).toBe(1);
  });

  test('levels unlock in order', () => {
    const ids = ['a', 'b', 'c'];
    expect(isUnlocked(ids, {}, 'a')).toBe(true);
    expect(isUnlocked(ids, {}, 'b')).toBe(false);
    expect(isUnlocked(ids, { a: 1 }, 'b')).toBe(true);
    expect(isUnlocked(ids, { a: 1 }, 'zzz')).toBe(false);
  });
});

describe('save data', () => {
  test('survives corrupted or hostile saves', () => {
    expect(sanitize(null).coins).toBe(0);
    expect(sanitize('junk').stars).toEqual({});
    const s = sanitize({ stars: { a: 99, b: 'x', c: -2 }, coins: -5, designs: { a: [{ a: '0,0', b: '2,0', material: 'road' }, { a: 1, b: 2, material: 'lava' }] }, settings: { sound: false, reducedMotion: true, shake: false } });
    expect(s.stars).toEqual({ a: 3, c: 0 });
    expect(s.coins).toBe(0);
    expect(s.designs.a).toHaveLength(1);
    expect(s.settings.sound).toBe(false);
    expect(s.settings.reducedMotion).toBe(true);
    expect(s.settings.shake).toBe(false);
    expect(s.held).toEqual([]);
    expect(sanitize({ held: ['w1-1', 'w1-1', 'nope', 7] }).held).toEqual(['w1-1']);
    expect(s.sandboxWins).toEqual([]);
    // The editor draft is checked field by field; a bad one starts fresh, a too high best cost is dropped.
    expect(s.editor.levels).toHaveLength(1);
    expect(s.editor.levels[0].best).toBe(0);
    const draft = { name: 'Hop', gap: 6, leftHeight: 1, rightHeight: 0, vehicle: 'car', materials: ['road', 'wood'], budget: 3000, anchors: [{ x: 3, y: -2 }], authorCost: 0 };
    // Old saves (one level) become a list of one.
    expect(sanitize({ editor: { draft, best: 1200 } }).editor).toEqual({ levels: [{ draft, best: 1200 }], current: 0 });
    expect(sanitize({ editor: { draft, best: 99999 } }).editor.levels[0].best).toBe(0);
    expect(sanitize({ editor: { draft: { ...draft, gap: 99 }, best: 5 } }).editor.levels[0].draft.gap).toBe(8);
    expect(sanitize({ editor: { draft: { ...draft, anchors: 'x' } } }).editor.levels[0].draft.anchors).toEqual([]);
    // The list: bad levels are dropped, the open level stays in range, an empty list gets one fresh level.
    const list = sanitize({ editor: { levels: [{ draft, best: 900 }, { draft: { ...draft, gap: 99 } }, 'x', { draft: { ...draft, name: 'Two' }, best: 0 }], current: 7 } }).editor;
    expect(list.levels.map((l) => l.draft.name)).toEqual(['Hop', 'Two']);
    expect(list.current).toBe(1);
    expect(sanitize({ editor: { levels: [], current: 0 } }).editor.levels).toHaveLength(1);
    expect(sanitize({ editor: { levels: Array.from({ length: 30 }, () => ({ draft, best: 0 })), current: 0 } }).editor.levels).toHaveLength(MY_LEVELS_MAX);
    expect(sanitize({ sandboxWins: ['sandbox-6-car-flat-none', 'sandbox-6-car-flat-none', 'sandbox-7-car-flat-none', 'w1-1', 3] }).sandboxWins).toEqual(['sandbox-6-car-flat-none']);
  });

  test('a save that got the supporter coins also owns the supporter paint (old saves from before it existed)', () => {
    expect(sanitize({ purchases: { supporter: true, supporterCoins: true }, owned: ['paint-sky'] }).owned).toEqual(['paint-sky', 'paint-rosegold']);
    // Refunded later: coins and paint stay.
    expect(sanitize({ purchases: { supporter: false, supporterCoins: true } }).owned).toEqual(['paint-rosegold']);
    expect(sanitize({ purchases: { noAds: true } }).owned).toEqual([]);
  });

  test('keeps only known shop items and falls back for bad equipped ids', () => {
    const fresh = sanitize({});
    expect(fresh.owned).toEqual([]);
    expect(fresh.equipped).toEqual({ paint: 'paint-classic', deck: 'deck-classic', frame: 'frame-classic', ride: 'ride-classic' });
    const s = sanitize({ owned: ['paint-sky', 'paint-sky', 'lava', 7], equipped: { paint: 'paint-sky', deck: 42 } });
    expect(s.owned).toEqual(['paint-sky']);
    expect(s.equipped).toEqual({ paint: 'paint-sky', deck: 'deck-classic', frame: 'frame-classic', ride: 'ride-classic' });
  });
});

describe('Simulation watchdog', () => {
  test('a NaN body ends the attempt as a collapse', () => {
    const sim = new Simulation(level, []);
    sim.step();
    (sim as any).chassis.setPosition({ x: NaN, y: 0 });
    sim.step();
    expect(sim.status).toBe('lost');
    expect(sim.lossReason).toBe('collapse');
  });
});

describe('level select paging', () => {
  test('counts pages and finds the page of a level', () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(LEVELS_PER_PAGE)).toBe(1);
    expect(pageCount(LEVELS_PER_PAGE + 1)).toBe(2);
    expect(pageOfIndex(LEVELS_PER_PAGE - 1)).toBe(0);
    expect(pageOfIndex(LEVELS_PER_PAGE)).toBe(1);
    expect(pageOfIndex(-1)).toBe(0);
  });
});

describe('beams between two anchors', () => {
  test('wood, steel, rope or piston from anchor to anchor does not crash the attempt', () => {
    const l = levelById('w1-1')!;
    for (const material of ['wood', 'steel', 'rope', 'piston'] as const) {
      const sim = new Simulation(l, [...l.solution, { a: '0,0', b: '0,-2', material }]);
      expect(sim.runToEnd(), material).toBe('won');
    }
  });
});

describe('My levels (editor list)', () => {
  const friend: CustomSpec = { name: 'Rocky', gap: 10, leftHeight: 0, rightHeight: 1, vehicle: 'truck', materials: ['road', 'wood', 'steel'], budget: 8000, anchors: [{ x: 5, y: -3 }], authorCost: 3150 };

  test('new levels get their own names, open at once and keep their own bridge', () => {
    const s = new SaveStore();
    const first = s.draftId;
    s.data.designs[first] = [{ a: '0,0', b: '1,0', material: 'road' }];
    expect(s.addEditorLevel()).toBe(true);
    expect(s.data.editor.levels.map((l) => l.draft.name)).toEqual(['My Level', 'My Level 2']);
    expect(s.data.editor.current).toBe(1);
    // Same spec but another name: another id, so the first bridge is not shared.
    expect(s.draftId).not.toBe(first);
    s.recordDraftWin(1500);
    expect(s.editorSlot.best).toBe(1500);
    s.openEditorLevel(0);
    expect(s.editorSlot.best).toBe(0);
    expect(s.data.designs[s.draftId]).toHaveLength(1);
    s.openEditorLevel(5);
    expect(s.data.editor.current).toBe(0);
  });

  test('the list is capped, and the last level cannot be deleted', () => {
    const s = new SaveStore();
    while (s.data.editor.levels.length < MY_LEVELS_MAX) expect(s.addEditorLevel()).toBe(true);
    expect(s.addEditorLevel()).toBe(false);
    expect(s.addEditorLevel(friend)).toBe(false);
    while (s.data.editor.levels.length > 1) expect(s.deleteEditorLevel(0)).toBe(true);
    expect(s.deleteEditorLevel(0)).toBe(false);
  });

  test('deleting keeps the open level open and removes only its own bridge', () => {
    const s = new SaveStore();
    s.addEditorLevel();
    s.addEditorLevel();
    const ids = s.data.editor.levels.map((l) => customId({ ...l.draft, authorCost: 0 }));
    for (const id of ids) s.data.designs[id] = [{ a: '0,0', b: '1,0', material: 'road' }];
    s.openEditorLevel(2);
    expect(s.deleteEditorLevel(0)).toBe(true);
    expect(s.editorSlot.draft.name).toBe('My Level 3');
    expect(s.data.designs[ids[0]]).toBeUndefined();
    expect(s.data.designs[ids[1]]).toBeDefined();
    expect(s.deleteEditorLevel(1)).toBe(true); // the open one: the one before it opens
    expect(s.editorSlot.draft.name).toBe('My Level 2');
  });

  test('a copy of a friend\'s level must be crossed again and brings your bridge along', () => {
    const s = new SaveStore();
    s.data.designs[customId(friend)] = [{ a: '0,0', b: '1,0', material: 'road' }];
    expect(s.addEditorLevel(friend)).toBe(true);
    expect(s.editorSlot).toEqual({ draft: { ...friend, authorCost: 0 }, best: 0 });
    expect(s.data.designs[s.draftId]).toEqual([{ a: '0,0', b: '1,0', material: 'road' }]);
    // Two identical copies share a bridge; deleting one keeps it for the other.
    s.addEditorLevel(friend);
    expect(s.deleteEditorLevel(2)).toBe(true);
    expect(s.data.designs[s.draftId]).toBeDefined();
  });

  test('a changed level moves its bridge but leaves a shared one in place', () => {
    const s = new SaveStore();
    s.addEditorLevel(friend);
    s.addEditorLevel(friend);
    const id = s.draftId;
    s.data.designs[id] = [{ a: '0,0', b: '1,0', material: 'road' }];
    s.setDraft({ ...s.editorSlot.draft, gap: 11 });
    expect(s.data.designs[s.draftId]).toHaveLength(1);
    expect(s.data.designs[id]).toHaveLength(1);
  });
  test("a friend's level keeps its best stars and nothing else", () => {
    const s = new SaveStore();
    const id = customId({ ...friend, authorCost: 900 });
    const coins = s.data.coins;
    expect(s.recordFriendWin(id, 2)).toBe(0);
    expect(s.recordFriendWin(id, 1)).toBe(2);
    expect(s.recordFriendWin(id, 3)).toBe(2);
    expect(s.data.friendStars).toEqual([{ id, stars: 3 }]);
    expect(s.data.coins).toBe(coins);
    expect(s.data.stars).toEqual({});
    expect(sanitize(JSON.parse(JSON.stringify(s.data))).friendStars).toEqual([{ id, stars: 3 }]);
    expect(sanitize({ friendStars: [{ id: 'level-1', stars: 3 }] }).friendStars).toEqual([]);
  });

  test("old bridges of friends' levels are dropped; My levels, starred levels and world levels stay", () => {
    const road = [{ a: '0,0', b: '1,0', material: 'road' as const }];
    const friendId = (gap: number) => customId({ ...friend, gap, authorCost: 900 });
    expect(staleCustomDesigns(['w1-1', 'custom-a', 'custom-b', 'custom-c'], new Set(['custom-a']), 1)).toEqual(['custom-b']);
    const s = new SaveStore();
    s.saveDesign('w1-1', road);
    s.saveDesign(s.draftId, road);
    const starred = friendId(2);
    s.saveDesign(starred, road);
    s.recordFriendWin(starred, 2);
    const played = Array.from({ length: LOOSE_DESIGNS_MAX + 2 }, (_, i) => friendId(3 + i));
    for (const id of played) s.saveDesign(id, road);
    // Playing an old one again makes it new, so it stays.
    s.saveDesign(played[0], road);
    for (const id of [s.draftId, starred, 'w1-1', played[0], ...played.slice(2)]) expect(s.data.designs[id]).toBeDefined();
    expect(s.data.designs[played[1]]).toBeUndefined();
    // The open level, the starred one, the one just played and the newest 20 others.
    expect(Object.keys(s.data.designs).filter((k) => k.startsWith('custom-'))).toHaveLength(LOOSE_DESIGNS_MAX + 3);
  });
});
