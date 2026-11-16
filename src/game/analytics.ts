/**
 * Game side of analytics: scenes call `track`. Events wait in a capped queue; nothing is sent
 * until the owner's GameAnalytics keys exist (see docs/NEEDS_FROM_OWNER.md). The last events are
 * kept on `globalThis.__bridgeitEvents` so tests and debugging can see them.
 */
import { EventQueue, type GaEvent, type GameEvent } from '../core/analytics';

export const events = new EventQueue();
const recent: GaEvent[] = [];
(globalThis as unknown as { __bridgeitEvents?: GaEvent[] }).__bridgeitEvents = recent;

export function track(e: GameEvent): void {
  try {
    recent.push(events.push(e));
    if (recent.length > 50) recent.shift();
  } catch {
    // Analytics must never break the game.
  }
}
