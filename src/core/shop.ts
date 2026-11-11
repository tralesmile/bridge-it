/**
 * Coin shop: cosmetic items only (they never change the physics). Coins come from new stars.
 * No real money, no random rewards: every item shows its price and you get exactly that item.
 */

export type ShopKind = 'paint' | 'deck';

export interface ShopItem {
  id: string;
  kind: ShopKind;
  name: string;
  price: number;
  /** paint: body main, light and dark colours. deck: road colour, line colour, edge colour. */
  colors: [string, string, string];
}

export const SHOP_ITEMS: ShopItem[] = [
  // Paint jobs for every vehicle. 'classic' keeps each vehicle's own colours.
  { id: 'paint-classic', kind: 'paint', name: 'Classic', price: 0, colors: ['#ff6b5c', '#ff8a7c', '#d93b30'] },
  { id: 'paint-sky', kind: 'paint', name: 'Sky', price: 40, colors: ['#4aa8ff', '#8ccaff', '#2a72c9'] },
  { id: 'paint-mint', kind: 'paint', name: 'Mint', price: 40, colors: ['#3fcf9a', '#86e8c2', '#24966c'] },
  { id: 'paint-sunny', kind: 'paint', name: 'Sunny', price: 60, colors: ['#ffc93c', '#ffe08a', '#d99a14'] },
  { id: 'paint-grape', kind: 'paint', name: 'Grape', price: 80, colors: ['#9b6bff', '#c4a6ff', '#6a3fd1'] },
  { id: 'paint-candy', kind: 'paint', name: 'Candy', price: 100, colors: ['#ff6fb5', '#ffa8d4', '#d9408a'] },
  { id: 'paint-night', kind: 'paint', name: 'Night', price: 150, colors: ['#3a3f5c', '#5d6488', '#20233a'] },
  { id: 'paint-gold', kind: 'paint', name: 'Gold', price: 300, colors: ['#e8b923', '#ffe27a', '#b88a0c'] },
  // Road decks (colour only).
  { id: 'deck-classic', kind: 'deck', name: 'Asphalt', price: 0, colors: ['#4a4458', '#ffd84a', '#2d2938'] },
  { id: 'deck-brick', kind: 'deck', name: 'Brick', price: 60, colors: ['#b5523b', '#ffe2c2', '#7d3424'] },
  { id: 'deck-forest', kind: 'deck', name: 'Forest', price: 80, colors: ['#3f7a4a', '#d8f5a2', '#24502d'] },
  { id: 'deck-ocean', kind: 'deck', name: 'Ocean', price: 100, colors: ['#2f5f9e', '#9fe3ff', '#1d3d6b'] },
  { id: 'deck-candy', kind: 'deck', name: 'Candy', price: 150, colors: ['#d94f8c', '#ffffff', '#9c2c5e'] },
];

export const DEFAULT_EQUIPPED: Record<ShopKind, string> = { paint: 'paint-classic', deck: 'deck-classic' };

export interface ShopState {
  coins: number;
  owned: string[];
  equipped: Record<ShopKind, string>;
}

export const itemById = (id: string): ShopItem | undefined => SHOP_ITEMS.find((i) => i.id === id);

export const isOwned = (state: ShopState, id: string): boolean => (itemById(id)?.price ?? 1) === 0 || state.owned.includes(id);

export type BuyResult = { ok: true; state: ShopState } | { ok: false; error: string };

/** Buys an item and puts it on. Never changes the state it is given. */
export function buy(state: ShopState, id: string): BuyResult {
  const item = itemById(id);
  if (!item) return { ok: false, error: 'Unknown item.' };
  if (isOwned(state, id)) return { ok: false, error: 'You have it already.' };
  if (state.coins < item.price) return { ok: false, error: `You need ${item.price - state.coins} more coins.` };
  return {
    ok: true,
    state: { coins: state.coins - item.price, owned: [...state.owned, id], equipped: { ...state.equipped, [item.kind]: id } },
  };
}

/** Puts on an item you own. Returns the same state if you do not own it. */
export function equip(state: ShopState, id: string): ShopState {
  const item = itemById(id);
  if (!item || !isOwned(state, id)) return state;
  return { ...state, equipped: { ...state.equipped, [item.kind]: id } };
}

/** The equipped item of a kind, falling back to the default (for old or edited saves). */
export function equipped(state: Pick<ShopState, 'equipped' | 'owned'>, kind: ShopKind): ShopItem {
  const id = state.equipped[kind];
  const item = itemById(id);
  if (item && item.kind === kind && (item.price === 0 || state.owned.includes(id))) return item;
  return itemById(DEFAULT_EQUIPPED[kind])!;
}

/** Coins you can earn in total (10 per star), so prices can be checked against it. */
export const coinsAvailable = (levelCount: number): number => levelCount * 3 * 10;
