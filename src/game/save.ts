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
  settings: { sound: boolean; reducedMotion: boolean; shake: boolean };
}

const fresh = (): SaveData => ({ version: VERSION, stars: {}, bestCost: {}, designs: {}, coins: 0, fails: {}, settings: { sound: true, reducedMotion: false, shake: true } });

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
  if (r.designs && typeof r.designs === 'object') {
    for (const [k, v] of Object.entries(r.designs)) {
      if (Array.isArray(v)) {
        base.designs[k] = v.filter(
          (b): b is Beam =>
            !!b && typeof b.a === 'string' && typeof b.b === 'string' && ['road', 'wood', 'steel'].includes(b.material),
        );
      }
    }
  }
  if (r.settings && typeof r.settings === 'object') {
    base.settings.sound = r.settings.sound !== false;
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
    this.data.fails[levelId] = fails;
    this.persist();
    return fails;
  }

  saveDesign(levelId: string, beams: Beam[]): void {
    this.data.designs[levelId] = beams;
    this.persist();
  }

  get totalStars(): number {
    return Object.values(this.data.stars).reduce((s, v) => s + v, 0);
  }
}

export const save = new SaveStore();
