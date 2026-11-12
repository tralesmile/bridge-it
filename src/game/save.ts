import { ACHIEVEMENTS, EMPTY_STATS, newAchievements, type PlayStats } from '../core/achievements';
import { DAILY_COINS, EMPTY_DAILY, isDailyId, recordDailyWin, type DailyState } from '../core/daily';
import { ALL_LEVELS } from '../core/levels';
import { DEFAULT_EQUIPPED, SHOP_ITEMS, buy, equip, type ShopKind, type ShopState } from '../core/shop';
import type { Beam } from '../core/types';

const KEY = 'bridgeit.save';
const VERSION = 1;

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
  settings: { sound: boolean; music: boolean; reducedMotion: boolean; shake: boolean };
}

const fresh = (): SaveData => ({ version: VERSION, stars: {}, bestCost: {}, designs: {}, coins: 0, fails: {}, owned: [], equipped: { ...DEFAULT_EQUIPPED }, achievements: [], stats: { ...EMPTY_STATS }, daily: { ...EMPTY_DAILY }, held: [], settings: { sound: true, music: true, reducedMotion: false, shake: true } });

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
    };
  }
  const levelIds = new Set(ALL_LEVELS.map((l) => l.id));
  if (Array.isArray(r.held)) base.held = [...new Set(r.held.filter((id): id is string => typeof id === 'string' && levelIds.has(id)))];
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
  if (r.settings && typeof r.settings === 'object') {
    base.settings.sound = r.settings.sound !== false;
    base.settings.music = r.settings.music !== false;
    base.settings.reducedMotion = r.settings.reducedMotion === true;
    base.settings.shake = r.settings.shake !== false;
  }
  return base;
}

class SaveStore {
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

  recordHint(): void {
    this.data.stats.hints += 1;
    this.persist();
  }

  /** Saves and returns achievements earned since the last check. */
  checkAchievements(): string[] {
    const d = this.data;
    const fresh = newAchievements(
      { stars: d.stars, bestCost: d.bestCost, owned: d.owned, stats: d.stats, levels: ALL_LEVELS, held: d.held, dailyBest: d.daily.best },
      d.achievements,
    );
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

  /** Records a daily bridge win for the date key. Coins only for the first win of the day. */
  recordDaily(today: string): { coins: number; streak: number; usedSaver: boolean } {
    const r = recordDailyWin(this.data.daily, today);
    this.data.daily = r.state;
    const coins = r.firstToday ? DAILY_COINS : 0;
    this.data.coins += coins;
    this.persist();
    return { coins, streak: r.state.streak, usedSaver: r.usedSaver };
  }

  saveDesign(levelId: string, beams: Beam[]): void {
    // Keep only today's daily design, so old days do not fill the save.
    if (isDailyId(levelId)) {
      for (const k of Object.keys(this.data.designs)) if (isDailyId(k) && k !== levelId) delete this.data.designs[k];
      for (const k of Object.keys(this.data.fails)) if (isDailyId(k) && k !== levelId) delete this.data.fails[k];
    }
    this.data.designs[levelId] = beams;
    this.persist();
  }

  get totalStars(): number {
    return Object.values(this.data.stars).reduce((s, v) => s + v, 0);
  }
}

export const save = new SaveStore();
