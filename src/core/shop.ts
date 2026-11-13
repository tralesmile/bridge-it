/**
 * Coin shop: cosmetic items only (they never change the physics). Coins come from new stars.
 * No real money, no random rewards: every item shows its price and you get exactly that item.
 */

export type ShopKind = 'paint' | 'deck' | 'frame' | 'ride';

export interface ShopItem {
  id: string;
  kind: ShopKind;
  name: string;
  price: number;
  /**
   * paint: body main, light and dark colours. deck: road colour, line colour, edge colour.
   * frame: wood, wood light, steel, steel light (wood stays warm and steel stays cool, so the two always look different).
   * ride: the small car's body shape (car levels only); colours are its trim. Same size and weight, so physics never change.
   */
  colors: string[];
  /** Only for players who bought the Supporter pack (a thank-you; never sold for coins). */
  supporter?: true;
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
  { id: 'paint-rosegold', kind: 'paint', name: 'Rose Gold', price: 0, supporter: true, colors: ['#f59a86', '#ffd3c4', '#c8664f'] },
  // Road decks (colour only).
  { id: 'deck-classic', kind: 'deck', name: 'Asphalt', price: 0, colors: ['#4a4458', '#ffd84a', '#2d2938'] },
  { id: 'deck-brick', kind: 'deck', name: 'Brick', price: 60, colors: ['#b5523b', '#ffe2c2', '#7d3424'] },
  { id: 'deck-forest', kind: 'deck', name: 'Forest', price: 80, colors: ['#3f7a4a', '#d8f5a2', '#24502d'] },
  { id: 'deck-ocean', kind: 'deck', name: 'Ocean', price: 100, colors: ['#2f5f9e', '#9fe3ff', '#1d3d6b'] },
  { id: 'deck-candy', kind: 'deck', name: 'Candy', price: 150, colors: ['#d94f8c', '#ffffff', '#9c2c5e'] },
  // Beam skins for wood and steel (colour only).
  { id: 'frame-classic', kind: 'frame', name: 'Natural', price: 0, colors: ['#c98a4b', '#e6ad6f', '#8ea3c0', '#c6d4e8'] },
  { id: 'frame-birch', kind: 'frame', name: 'Birch', price: 60, colors: ['#d2a866', '#f1d9a8', '#7f93b3', '#bccbe2'] },
  { id: 'frame-cherry', kind: 'frame', name: 'Cherry', price: 80, colors: ['#a5523a', '#d3805f', '#9aa6b8', '#d5dce6'] },
  { id: 'frame-painted', kind: 'frame', name: 'Painted', price: 100, colors: ['#e0703a', '#ffa772', '#3f8fd6', '#95c8f5'] },
  { id: 'frame-chrome', kind: 'frame', name: 'Chrome', price: 150, colors: ['#b8834f', '#dcac78', '#b9c3cf', '#f4f8fc'] },
  // Body shapes for the small car (it takes the paint too). Looks only: the car is just as big and heavy.
  { id: 'ride-classic', kind: 'ride', name: 'Moo Car', price: 0, colors: ['#bfe8ff', '#fff4b0'] },
  { id: 'ride-camper', kind: 'ride', name: 'Camper', price: 90, colors: ['#fff6e8', '#7fd3ff'] },
  { id: 'ride-icecream', kind: 'ride', name: 'Ice Cream', price: 120, colors: ['#fff6e8', '#ff6fb5'] },
];

export const DEFAULT_EQUIPPED: Record<ShopKind, string> = { paint: 'paint-classic', deck: 'deck-classic', frame: 'frame-classic', ride: 'ride-classic' };

/** Texture base key for each car body shape. */
export const RIDE_TEXTURE: Record<string, string> = { 'ride-classic': 'car', 'ride-camper': 'camper', 'ride-icecream': 'icecream' };

/**
 * Texture key for a vehicle with the shop items in use: 'car', 'car-paint-sky', 'icecream-paint-gold', 'truck-paint-mint'.
 * Body shapes only change the small car.
 */
export function vehicleTextureKey(state: Pick<ShopState, 'equipped' | 'owned'>, vehicle: 'car' | 'truck' | 'train'): string {
  const base = vehicle === 'car' ? RIDE_TEXTURE[equipped(state, 'ride').id] ?? 'car' : vehicle;
  const paint = equipped(state, 'paint').id;
  return paint === 'paint-classic' ? base : `${base}-${paint}`;
}

export interface ShopState {
  coins: number;
  owned: string[];
  equipped: Record<ShopKind, string>;
}

export const itemById = (id: string): ShopItem | undefined => SHOP_ITEMS.find((i) => i.id === id);

export const isOwned = (state: Pick<ShopState, 'owned'>, id: string): boolean => {
  const item = itemById(id);
  if (!item) return false;
  return (item.price === 0 && !item.supporter) || state.owned.includes(id);
};

/** Thank-you items for Supporter pack buyers. */
export const SUPPORTER_ITEMS: readonly string[] = SHOP_ITEMS.filter((i) => i.supporter).map((i) => i.id);

/** Adds the supporter items to the owned list (kept for good, like the supporter coins). */
export function grantSupporterItems(owned: readonly string[]): string[] {
  return [...owned, ...SUPPORTER_ITEMS.filter((id) => !owned.includes(id))];
}

export type BuyResult = { ok: true; state: ShopState } | { ok: false; error: string };

/** Buys an item and puts it on. Never changes the state it is given. */
export function buy(state: ShopState, id: string): BuyResult {
  const item = itemById(id);
  if (!item) return { ok: false, error: 'Unknown item.' };
  if (isOwned(state, id)) return { ok: false, error: 'You have it already.' };
  if (item.supporter) return { ok: false, error: 'Only in the Supporter pack.' };
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
  if (item && item.kind === kind && isOwned(state, id)) return item;
  return itemById(DEFAULT_EQUIPPED[kind])!;
}

/** Coins you can earn in total (10 per star), so prices can be checked against it. */
export const coinsAvailable = (levelCount: number): number => levelCount * 3 * 10;
