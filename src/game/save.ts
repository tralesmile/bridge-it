import { ACHIEVEMENTS, EMPTY_STATS, newAchievements, type AchievementInput, type PlayStats } from '../core/achievements';
import { isLang, type Lang } from '../core/i18n';
import { DAILY_COINS, EMPTY_DAILY, canPlayDay, dateKey, isDailyId, recordCalendarWin, type DailyState } from '../core/daily';
import { ALL_LEVELS } from '../core/levels';
import { parseSandboxId } from '../core/sandbox';
import { DEFAULT_CUSTOM, MY_LEVELS_MAX, addFriendStars, isCustomId, staleCustomDesigns, copyName, customId, freshName, friendStarsOf, parseCustomId, readFriendStars, specProblem, type CustomSpec, type FriendStars } from '../core/custom';
import { DEFAULT_EQUIPPED, SHOP_ITEMS, buy, equip, grantSupporterItems, type ShopKind, type ShopState } from '../core/shop';
import { EMPTY_PURCHASES, applyOwned, sanitizePurchases, type PurchaseState } from '../core/purchases';
import type { Beam } from '../core/types';

const KEY = 'bridgeit.save';
const VERSION = 1;

/** One of the player's levels, and the cheapest bridge that crossed it (0 = not crossed yet). */
export interface EditorSlot {
  draft: CustomSpec;
  best: number;
}

const freshSlot = (name: string = DEFAULT_CUSTOM.name): EditorSlot => ({ draft: { ...DEFAULT_CUSTOM, name, anchors: [], materials: [...DEFAULT_CUSTOM.materials] }, best: 0 });

/** The test id of a level (its id without the maker's cost). */
const slotId = (slot: EditorSlot): string => customId({ ...slot.draft, authorCost: 0 });

/** Reads one saved level through its id, which checks every field. Bad data gives undefined. */
function readSlot(raw: unknown): EditorSlot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const e = raw as Partial<EditorSlot>;
  const d = e.draft && typeof e.draft === 'object' ? (e.draft as CustomSpec) : null;
  let ok: CustomSpec | undefined;
  try {
    ok = d && Array.isArray(d.anchors) && Array.isArray(d.materials) && specProblem(d) === null ? parseCustomId(customId(d)) : undefined;
  } catch {
    ok = undefined;
  }
  if (!ok) return undefined;
  return { draft: { ...ok, authorCost: 0 }, best: typeof e.best === 'number' && Number.isInteger(e.best) && e.best > 0 && e.best <= ok.budget ? e.best : 0 };
}

export interface SaveData {
  version: number;
  stars: Record<string, number>;
  bestCost: Record<string, number>;
  designs: Record<string, Beam[]>;
  coins: number;
  fails: Record<string, number>;
  /** Shop items bought (ids), and the item worn for each kind. */
  owned: string[];
  equipped: Record<ShopKind, string>;
  /** Achievement ids earned (kept even if a later change makes one harder). */
  achievements: string[];
  stats: PlayStats;
  daily: DailyState;
  /** Level ids whose stress test held (the heavier vehicle crossed). */
  held: string[];
  /** Sandbox setup ids that a vehicle crossed (for achievements; nothing else is scored). */
  sandboxWins: string[];
  /** "My levels": the player's levels (at least one) and the one open in the editor. */
  editor: { levels: EditorSlot[]; current: number };
  /** Best stars on friends' levels, newest first (capped, see FRIEND_STARS_MAX). */
  friendStars: FriendStars[];
  /** Real-money purchases as last seen from the store (the store's answer always wins). */
  purchases: PurchaseState;
  /** `lang` is missing until the player picks one; the browser language is used until then. */
  settings: { sound: boolean; music: boolean; reducedMotion: boolean; shake: boolean; lang?: Lang };
}

const fresh = (): SaveData => ({ version: VERSION, stars: {}, bestCost: {}, designs: {}, coins: 0, fails: {}, owned: [], equipped: { ...DEFAULT_EQUIPPED }, achievements: [], stats: { ...EMPTY_STATS }, daily: { ...EMPTY_DAILY, played: [] }, held: [], sandboxWins: [], editor: { levels: [freshSlot()], current: 0 }, friendStars: [], purchases: { ...EMPTY_PURCHASES }, settings: { sound: true, music: true, reducedMotion: false, shake: true } });

/** Storage may be blocked (private mode, iframes on portals), so every access is guarded. */
interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function storage(): Storage | null {
  try {
    const s = globalThis.localStorage;
    const probe = '__bridgeit_probe__';
    s.setItem(probe, '1');
    s.getItem(probe);
    return s;
  } catch {
    return null;
  }
}

/** Validates loaded data so a corrupted or edited save can never crash the game. */
export function sanitize(raw: unknown): SaveData {
  const base = fresh();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<SaveData>;
  const numberMap = (m: unknown): Record<string, number> => {
    const out: Record<string, number> = {};
    if (m && typeof m === 'object') {
      for (const [k, v] of Object.entries(m)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    }
    return out;
  };
  base.stars = numberMap(r.stars);
  for (const k of Object.keys(base.stars)) base.stars[k] = Math.max(0, Math.min(3, Math.round(base.stars[k])));
  base.bestCost = numberMap(r.bestCost);
  base.fails = numberMap(r.fails);
  base.coins = typeof r.coins === 'number' && Number.isFinite(r.coins) ? Math.max(0, Math.floor(r.coins)) : 0;
  const ids = new Set(SHOP_ITEMS.map((i) => i.id));
  if (Array.isArray(r.owned)) base.owned = [...new Set(r.owned.filter((id): id is string => typeof id === 'string' && ids.has(id)))];
  if (r.equipped && typeof r.equipped === 'object') {
    for (const kind of Object.keys(DEFAULT_EQUIPPED) as ShopKind[]) {
      const id = (r.equipped as Record<string, unknown>)[kind];
      if (typeof id === 'string' && ids.has(id)) base.equipped[kind] = id;
    }
  }
  const known = new Set(ACHIEVEMENTS.map((a) => a.id));
  if (Array.isArray(r.achievements)) base.achievements = [...new Set(r.achievements.filter((id): id is string => typeof id === 'string' && known.has(id)))];
  if (r.stats && typeof r.stats === 'object') {
    const st = numberMap(r.stats);
    for (const k of Object.keys(EMPTY_STATS) as (keyof PlayStats)[]) if (st[k] !== undefined) base.stats[k] = Math.max(0, Math.floor(st[k]));
  }
  if (r.daily && typeof r.daily === 'object') {
    const d = r.daily as Partial<DailyState>;
    const okKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const okNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
    base.daily = {
      last: okKey(d.last) ? d.last : null,
      streak: okNum(d.streak) ? Math.floor(d.streak) : 0,
      best: okNum(d.best) ? Math.floor(d.best) : 0,
      saverWeek: okNum(d.saverWeek) ? Math.floor(d.saverWeek) : null,
      played: Array.isArray(d.played) ? [...new Set(d.played.filter(okKey))].sort().slice(-31) : [],
    };
  }
  const levelIds = new Set(ALL_LEVELS.map((l) => l.id));
  if (Array.isArray(r.held)) base.held = [...new Set(r.held.filter((id): id is string => typeof id === 'string' && levelIds.has(id)))];
  if (Array.isArray(r.sandboxWins)) base.sandboxWins = [...new Set(r.sandboxWins.filter((id): id is string => typeof id === 'string' && parseSandboxId(id) !== undefined))];
  if (r.editor && typeof r.editor === 'object') {
    const e = r.editor as Partial<SaveData['editor']> & Partial<EditorSlot>;
    if (Array.isArray(e.levels)) {
      // Bad levels are dropped; an empty list starts with one fresh level.
      const levels = e.levels.map(readSlot).filter((l): l is EditorSlot => l !== undefined).slice(0, MY_LEVELS_MAX);
      if (levels.length > 0) {
        const cur = typeof e.current === 'number' && Number.isInteger(e.current) ? e.current : 0;
        base.editor = { levels, current: Math.max(0, Math.min(levels.length - 1, cur)) };
      }
    } else {
      // Saves from before "My levels" had one level: { draft, best }.
      const one = readSlot(e);
      if (one) base.editor = { levels: [one], current: 0 };
    }
  }
  base.friendStars = readFriendStars(r.friendStars);
  if (r.designs && typeof r.designs === 'object') {
    for (const [k, v] of Object.entries(r.designs)) {
      if (Array.isArray(v)) {
        base.designs[k] = v.filter(
          (b): b is Beam =>
            !!b && typeof b.a === 'string' && typeof b.b === 'string' && ['road', 'wood', 'steel', 'rope', 'piston', 'spring'].includes(b.material),
        );
      }
    }
  }
  base.purchases = sanitizePurchases(r.purchases);
  if (base.purchases.supporterCoins) base.owned = grantSupporterItems(base.owned);
  if (r.settings && typeof r.settings === 'object') {
    base.settings.sound = r.settings.sound !== false;
    base.settings.music = r.settings.music !== false;
    base.settings.reducedMotion = r.settings.reducedMotion === true;
    base.settings.shake = r.settings.shake !== false;
    if (isLang(r.settings.lang)) base.settings.lang = r.settings.lang;
  }
  return base;
}

export class SaveStore {
  data: SaveData;
  private readonly store = storage();

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    if (!this.store) return fresh();
    try {
      const text = this.store.getItem(KEY);
      return text ? sanitize(JSON.parse(text)) : fresh();
    } catch {
      return fresh();
    }
  }

  persist(): void {
    if (!this.store) return;
    try {
      this.store.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Quota full or blocked: the game keeps working in memory.
    }
  }

  /** Records a win. Returns coins earned (only for newly earned stars). */
  recordWin(levelId: string, stars: number, cost: number): number {
    const before = this.data.stars[levelId] ?? 0;
    const gained = Math.max(0, stars - before);
    this.data.stars[levelId] = Math.max(before, stars);
    const best = this.data.bestCost[levelId];
    this.data.bestCost[levelId] = best === undefined ? cost : Math.min(best, cost);
    const coins = gained * 10;
    this.data.coins += coins;
    this.data.fails[levelId] = 0;
    this.persist();
    return coins;
  }

  recordFail(levelId: string): number {
    const fails = (this.data.fails[levelId] ?? 0) + 1;
    this.data.stats.fails += 1;
    this.data.fails[levelId] = fails;
    this.persist();
    return fails;
  }

  /** Counts an attempt (GO) and the beams it broke. Call when the attempt ends. */
  recordAttempt(broken: number): void {
    this.data.stats.attempts += 1;
    this.data.stats.broken += broken;
    this.persist();
  }

  /** Marks a level whose stress test held. Nothing else in the save changes. */
  recordHeld(levelId: string): void {
    if (this.data.held.includes(levelId)) return;
    this.data.held.push(levelId);
    this.persist();
  }

  /** Marks a sandbox setup that a vehicle crossed. Nothing else in the save changes. */
  recordSandboxWin(id: string): void {
    if (this.data.sandboxWins.includes(id) || parseSandboxId(id) === undefined) return;
    this.data.sandboxWins.push(id);
    this.persist();
  }

  /** A win on a friend's level: keeps the best stars. Returns the best stars before this win (0 if none). */
  recordFriendWin(id: string, stars: number): number {
    const before = friendStarsOf(this.data.friendStars, id);
    this.data.friendStars = addFriendStars(this.data.friendStars, id, stars);
    this.persist();
    return before;
  }

  /** The level open in the editor. */
  get editorSlot(): EditorSlot {
    const e = this.data.editor;
    return e.levels[e.current];
  }

  /** The level id the editor tests with (the draft, not crossed yet). */
  get draftId(): string {
    return slotId(this.editorSlot);
  }

  /** True when another level in "My levels" has the same test id (so it shares the saved bridge). */
  private idShared(id: string, except: number): boolean {
    return this.data.editor.levels.some((l, i) => i !== except && slotId(l) === id);
  }

  /** Changes the draft. The bridge moves with it; a change other than the name means it must be crossed again. */
  setDraft(draft: CustomSpec): void {
    const e = this.data.editor;
    const old = this.editorSlot;
    const oldId = this.draftId;
    const sameLevel = customId({ ...draft, name: '', authorCost: 0 }) === customId({ ...old.draft, name: '', authorCost: 0 });
    e.levels[e.current] = { draft: { ...draft, authorCost: 0 }, best: sameLevel ? old.best : 0 };
    const newId = this.draftId;
    if (newId !== oldId) {
      if (this.data.designs[oldId]) this.data.designs[newId] = this.data.designs[oldId];
      if (!this.idShared(oldId, e.current)) delete this.data.designs[oldId];
    }
    this.persist();
  }

  /** Opens another of "My levels" in the editor. */
  openEditorLevel(index: number): void {
    const e = this.data.editor;
    if (!Number.isInteger(index) || index < 0 || index >= e.levels.length) return;
    e.current = index;
    this.persist();
  }

  /**
   * Adds a level to "My levels" and opens it: a fresh one, or a copy of a friend's level
   * (it must be crossed again before its code can be shared). False when the list is full.
   */
  addEditorLevel(copyOf?: CustomSpec): boolean {
    const e = this.data.editor;
    if (e.levels.length >= MY_LEVELS_MAX) return false;
    const names = e.levels.map((l) => l.draft.name);
    const slot = copyOf ? readSlot({ draft: { ...copyOf, name: copyName(copyOf.name, names), authorCost: 0 }, best: 0 }) : freshSlot(freshName(names));
    if (!slot) return false;
    e.levels.push(slot);
    e.current = e.levels.length - 1;
    if (copyOf) {
      // Your bridge from the friend's level comes along, so you can test the copy at once.
      const from = this.data.designs[customId(copyOf)];
      const to = slotId(slot);
      if (from && !this.data.designs[to]) this.data.designs[to] = from.map((b) => ({ ...b }));
    }
    this.persist();
    return true;
  }

  /** Deletes one of "My levels" and its saved bridge. The last level cannot be deleted. */
  deleteEditorLevel(index: number): boolean {
    const e = this.data.editor;
    if (e.levels.length <= 1 || !Number.isInteger(index) || index < 0 || index >= e.levels.length) return false;
    const id = slotId(e.levels[index]);
    if (!this.idShared(id, index)) delete this.data.designs[id];
    e.levels.splice(index, 1);
    if (e.current > index || e.current >= e.levels.length) e.current = Math.max(0, e.current - 1);
    this.persist();
    return true;
  }

  /** A bridge crossed the draft: keep the cheapest cost (it sets the 3-star budget in the level code). */
  recordDraftWin(cost: number): void {
    const e = this.editorSlot;
    const c = Math.round(cost);
    if (c <= 0 || c > e.draft.budget) return;
    e.best = e.best > 0 ? Math.min(e.best, c) : c;
    this.persist();
  }

  /** Everything the achievements read from the save. */
  get achievementInput(): AchievementInput {
    const d = this.data;
    return { stars: d.stars, bestCost: d.bestCost, owned: d.owned, stats: d.stats, levels: ALL_LEVELS, held: d.held, dailyBest: d.daily.best, sandboxWins: d.sandboxWins, madeCrossed: d.editor.levels.filter((l) => l.best > 0).length, friendsCrossed: d.friendStars.length };
  }

  /** Fresh purchase data from the store. Returns the coins given now (supporter pack, once). */
  applyPurchases(owned: { noAds: boolean; supporter: boolean }): number {
    const { state, coins } = applyOwned(this.data.purchases, owned);
    this.data.purchases = state;
    this.data.coins += coins;
    if (state.supporter) this.data.owned = grantSupporterItems(this.data.owned);
    this.persist();
    return coins;
  }

  recordHint(): void {
    this.data.stats.hints += 1;
    this.persist();
  }

  /** Saves and returns achievements earned since the last check. */
  checkAchievements(): string[] {
    const d = this.data;
    const fresh = newAchievements(this.achievementInput, d.achievements);
    if (fresh.length) {
      d.achievements = [...d.achievements, ...fresh];
      this.persist();
    }
    return fresh;
  }

  get shop(): ShopState {
    return { coins: this.data.coins, owned: this.data.owned, equipped: this.data.equipped };
  }

  private applyShop(state: ShopState): void {
    this.data.coins = state.coins;
    this.data.owned = state.owned;
    this.data.equipped = state.equipped;
    this.persist();
  }

  /** Buys and puts on a shop item. Returns an error text when it cannot. */
  buyItem(id: string): string | null {
    const r = buy(this.shop, id);
    if (!r.ok) return r.error;
    this.applyShop(r.state);
    return null;
  }

  equipItem(id: string): void {
    this.applyShop(equip(this.shop, id));
  }

  /**
   * Records a daily bridge win for the date key. Only today counts for the streak and coins
   * (first win of the day); a past day from the calendar just gets its tick.
   */
  recordDaily(key: string, today = dateKey(new Date())): { coins: number; streak: number; usedSaver: boolean; past: boolean } {
    if (key !== today && !canPlayDay(key, today)) return { coins: 0, streak: this.data.daily.streak, usedSaver: false, past: true };
    const r = recordCalendarWin(this.data.daily, key, today);
    this.data.daily = r.state;
    const coins = r.firstToday ? DAILY_COINS : 0;
    this.data.coins += coins;
    this.persist();
    return { coins, streak: r.state.streak, usedSaver: r.usedSaver, past: r.past };
  }

  saveDesign(levelId: string, beams: Beam[]): void {
    // Keep only today's daily design, so old days do not fill the save.
    if (isDailyId(levelId)) {
      for (const k of Object.keys(this.data.designs)) if (isDailyId(k) && k !== levelId) delete this.data.designs[k];
      for (const k of Object.keys(this.data.fails)) if (isDailyId(k) && k !== levelId) delete this.data.fails[k];
    }
    if (isCustomId(levelId)) {
      // Newest last, so the bridges of friends' levels played long ago are the first to go.
      delete this.data.designs[levelId];
      this.data.designs[levelId] = beams;
      const keep = new Set([...this.data.editor.levels.map(slotId), ...this.data.friendStars.map((f) => f.id), levelId]);
      for (const k of staleCustomDesigns(Object.keys(this.data.designs), keep)) delete this.data.designs[k];
    } else {
      this.data.designs[levelId] = beams;
    }
    this.persist();
  }

  get totalStars(): number {
    return Object.values(this.data.stars).reduce((s, v) => s + v, 0);
  }
}

export const save = new SaveStore();
