/**
 * Real-money purchases in the app (Google Play and App Store, through RevenueCat).
 * One-time purchases only: no subscriptions, no loot boxes, nothing random.
 * Prices come from the store in the player's own currency; the fallback is shown only if the store
 * gives no price.
 */

export type ProductId = 'remove_ads' | 'supporter_pack';

/** RevenueCat entitlement ids (set up the same way in the RevenueCat dashboard). */
export type EntitlementId = 'no_ads' | 'supporter';

export interface Product {
  id: ProductId;
  entitlement: EntitlementId;
  name: string;
  /** Short lines for the card. */
  lines: string[];
  fallbackPrice: string;
}

export const SUPPORTER_COINS = 300;

export const PRODUCTS: readonly Product[] = [
  { id: 'remove_ads', entitlement: 'no_ads', name: 'Remove ads', lines: ['No ad breaks between levels.', 'Hints without ads.'], fallbackPrice: '$3.99' },
  {
    id: 'supporter_pack',
    entitlement: 'supporter',
    name: 'Supporter pack',
    lines: ['Everything in Remove ads,', `plus ${SUPPORTER_COINS} coins and the`, 'Rose Gold paint. Thank you!'],
    fallbackPrice: '$9.99',
  },
];

/** What the player owns, kept in the save so a phone with no network still knows. */
export interface PurchaseState {
  noAds: boolean;
  supporter: boolean;
  /** The supporter coins were given (only once per save). */
  supporterCoins: boolean;
}

export const EMPTY_PURCHASES: PurchaseState = { noAds: false, supporter: false, supporterCoins: false };

/** The parts of what the store tells us that we need: the active entitlement ids. */
export function ownedFrom(activeEntitlements: readonly string[]): { noAds: boolean; supporter: boolean } {
  const supporter = activeEntitlements.includes('supporter');
  return { supporter, noAds: supporter || activeEntitlements.includes('no_ads') };
}

/**
 * Applies fresh store data to the saved state. A refund takes the entitlement away (ads come back),
 * but coins already given stay: we never take coins from a player.
 * Returns the new state and the coins to add now.
 */
export function applyOwned(state: PurchaseState, owned: { noAds: boolean; supporter: boolean }): { state: PurchaseState; coins: number } {
  const coins = owned.supporter && !state.supporterCoins ? SUPPORTER_COINS : 0;
  return { state: { noAds: owned.noAds, supporter: owned.supporter, supporterCoins: state.supporterCoins || coins > 0 }, coins };
}

export function owns(state: PurchaseState, id: ProductId): boolean {
  return id === 'remove_ads' ? state.noAds : state.supporter;
}

export function sanitizePurchases(raw: unknown): PurchaseState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof PurchaseState, unknown>>;
  return { noAds: r.noAds === true, supporter: r.supporter === true, supporterCoins: r.supporterCoins === true };
}
