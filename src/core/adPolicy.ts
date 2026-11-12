/**
 * When a break ad (between levels) may be shown. Our own rules, on top of what each portal allows:
 * no break in the first 5 minutes of play, at least 3 minutes between breaks, never during an attempt
 * (breaks are only asked for from the win panel). Pure: pass in the clock.
 */
export const FIRST_BREAK_AFTER_MS = 5 * 60 * 1000;
export const BETWEEN_BREAKS_MS = 3 * 60 * 1000;

export interface AdClock {
  /** When this session started (ms). */
  start: number;
  /** When the last break was shown (ms), or null. */
  lastBreak: number | null;
}

export function breakAllowed(clock: AdClock, now: number): boolean {
  if (now - clock.start < FIRST_BREAK_AFTER_MS) return false;
  return clock.lastBreak === null || now - clock.lastBreak >= BETWEEN_BREAKS_MS;
}

/** Platform names a build can be made for (`vite build --mode <name>`; `app` is the Android and iOS build). */
export const PLATFORMS = ['local', 'crazygames', 'poki', 'app'] as const;
export type PlatformName = (typeof PLATFORMS)[number];

export const platformName = (mode: string | undefined): PlatformName => (PLATFORMS as readonly string[]).includes(mode ?? '') ? (mode as PlatformName) : 'local';
