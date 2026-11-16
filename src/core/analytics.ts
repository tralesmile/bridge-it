/**
 * Game events for analytics (GameAnalytics later). Pure code: the game reports what happened,
 * this file turns it into GameAnalytics event ids and keeps a small queue until they can be sent.
 * Nothing is sent anywhere yet: that needs the owner's GameAnalytics keys and, in the EU, consent.
 */

export type LevelStatus = 'start' | 'complete' | 'fail';
export type AdKind = 'interstitial' | 'rewarded';
export type AdResult = 'shown' | 'skipped' | 'reward' | 'no-reward';

export type GameEvent =
  /** A scored level attempt (GO pressed), and how it ended. */
  | { type: 'level'; status: LevelStatus; level: string; cost?: number; stars?: number; reason?: string }
  /** The hint button: `given` is false when the rewarded ad was closed early. */
  | { type: 'hint'; level: string; given: boolean }
  | { type: 'ad'; ad: AdKind; result: AdResult }
  /** A real-money purchase try, with the store's answer. */
  | { type: 'purchase'; product: string; result: 'bought' | 'cancelled' | 'pending' | 'failed' };

/** The GameAnalytics shape: progression events for levels, design events for the rest. */
export interface GaEvent {
  category: 'progression' | 'design';
  event_id: string;
  value?: number;
}

/** GameAnalytics allows letters, digits, space and `-_.()!?` in each part, up to 64 letters. */
const part = (s: string): string => s.replace(/[^A-Za-z0-9 \-_.()!?]/g, '_').slice(0, 64) || '_';

/** "w2-7" -> ["w2", "7"]; "daily-2026-11-16" -> ["daily", "2026-11-16"]; other ids stay whole. */
export function levelParts(id: string): [string, string] {
  const dash = id.indexOf('-');
  if (dash <= 0 || dash === id.length - 1) return [part(id), '_'];
  return [part(id.slice(0, dash)), part(id.slice(dash + 1))];
}

const STATUS: Record<LevelStatus, string> = { start: 'Start', complete: 'Complete', fail: 'Fail' };

export function toGameAnalytics(e: GameEvent): GaEvent {
  switch (e.type) {
    case 'level': {
      const [world, level] = levelParts(e.level);
      const out: GaEvent = { category: 'progression', event_id: `${STATUS[e.status]}:${world}:${level}` };
      // GameAnalytics takes one number: the bridge cost on a win.
      if (e.status === 'complete' && e.cost !== undefined) out.value = e.cost;
      return out;
    }
    case 'hint':
      return { category: 'design', event_id: `hint:${e.given ? 'given' : 'refused'}:${levelParts(e.level).join(':')}` };
    case 'ad':
      return { category: 'design', event_id: `ad:${e.ad}:${e.result}` };
    case 'purchase':
      return { category: 'design', event_id: `purchase:${part(e.product)}:${e.result}` };
  }
}

/**
 * Events wait here until a sender takes them. The queue has a size limit, so a game that never
 * sends (no keys, no consent, offline) never grows its memory.
 */
export class EventQueue {
  private items: GaEvent[] = [];
  dropped = 0;

  constructor(private readonly limit = 200) {}

  push(e: GameEvent): GaEvent {
    const ga = toGameAnalytics(e);
    this.items.push(ga);
    if (this.items.length > this.limit) {
      this.items.shift();
      this.dropped++;
    }
    return ga;
  }

  get size(): number {
    return this.items.length;
  }

  /** Takes up to `n` events out of the queue, oldest first. */
  take(n = this.limit): GaEvent[] {
    return this.items.splice(0, n);
  }

  /** Puts events back at the front (a send failed). */
  putBack(events: GaEvent[]): void {
    this.items = [...events, ...this.items].slice(0, this.limit);
  }
}
