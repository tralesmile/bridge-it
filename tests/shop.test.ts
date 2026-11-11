import { describe, expect, test } from 'vitest';
import { ALL_LEVELS } from '../src/core/levels';
import { DEFAULT_EQUIPPED, SHOP_ITEMS, buy, coinsAvailable, equip, equipped, isOwned, type ShopState } from '../src/core/shop';

const start: ShopState = { coins: 100, owned: [], equipped: { ...DEFAULT_EQUIPPED } };

describe('shop', () => {
  test('item ids are unique and every kind has one free default', () => {
    expect(new Set(SHOP_ITEMS.map((i) => i.id)).size).toBe(SHOP_ITEMS.length);
    for (const [kind, id] of Object.entries(DEFAULT_EQUIPPED)) {
      const item = SHOP_ITEMS.find((i) => i.id === id)!;
      expect(item.kind).toBe(kind);
      expect(item.price).toBe(0);
    }
    for (const i of SHOP_ITEMS) for (const c of i.colors) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('everything can be bought with the coins from all stars', () => {
    const total = SHOP_ITEMS.reduce((s, i) => s + i.price, 0);
    expect(total).toBeLessThan(coinsAvailable(ALL_LEVELS.length));
  });

  test('buying takes the price, adds the item and puts it on', () => {
    const r = buy(start, 'paint-sky');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.coins).toBe(60);
    expect(r.state.owned).toEqual(['paint-sky']);
    expect(r.state.equipped.paint).toBe('paint-sky');
    expect(start.coins).toBe(100); // not changed
  });

  test('cannot buy without enough coins, twice, or an unknown item', () => {
    expect(buy({ ...start, coins: 10 }, 'paint-sky')).toEqual({ ok: false, error: 'You need 30 more coins.' });
    const r = buy(start, 'paint-sky');
    if (!r.ok) throw new Error('buy failed');
    expect(buy(r.state, 'paint-sky').ok).toBe(false);
    expect(buy(start, 'paint-classic').ok).toBe(false); // free items are owned already
    expect(buy(start, 'nope').ok).toBe(false);
  });

  test('equip only works for owned items', () => {
    expect(equip(start, 'paint-gold')).toBe(start);
    const r = buy(start, 'deck-brick');
    if (!r.ok) throw new Error('buy failed');
    const back = equip(r.state, 'deck-classic');
    expect(back.equipped.deck).toBe('deck-classic');
    expect(isOwned(back, 'deck-brick')).toBe(true);
  });

  test('equipped falls back to the default for a bad save', () => {
    expect(equipped({ owned: [], equipped: { paint: 'paint-gold', deck: 'junk' } }, 'paint').id).toBe('paint-classic');
    expect(equipped({ owned: [], equipped: { paint: 'deck-brick', deck: 'junk' } }, 'deck').id).toBe('deck-classic');
    expect(equipped({ owned: ['paint-gold'], equipped: { paint: 'paint-gold', deck: 'deck-classic' } }, 'paint').id).toBe('paint-gold');
  });
});
