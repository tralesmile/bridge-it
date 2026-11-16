/**
 * Automatic low-effects mode: watches frame times while a bridge is tested and says once whether
 * the device is slow. Pure code (no clock): the game passes in each frame's length in ms.
 */

/** Frames below this rate count as slow (ms per frame for 40 fps). */
export const SLOW_FRAME_MS = 1000 / 40;

export type FrameVerdict = 'slow' | 'ok';

export class FrameWatch {
  private seen = 0;
  private readonly times: number[] = [];
  private done = false;

  /** `warmup` first frames are skipped (loading, shader compile); then `window` frames are judged. */
  constructor(private readonly warmup = 30, private readonly window = 90) {}

  /**
   * Adds one frame. Returns a verdict once, when the window is full; null before and after.
   * Very long frames (over 250 ms: tab switch, pause) are ignored.
   */
  push(deltaMs: number): FrameVerdict | null {
    if (this.done || !(deltaMs > 0) || deltaMs > 250) return null;
    if (this.seen++ < this.warmup) return null;
    this.times.push(deltaMs);
    if (this.times.length < this.window) return null;
    this.done = true;
    const sorted = [...this.times].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] > SLOW_FRAME_MS ? 'slow' : 'ok';
  }
}

/** How many particles to show: a third (at least 1) in low-effects mode. */
export const fxCount = (n: number, low: boolean): number => (low ? Math.max(1, Math.ceil(n / 3)) : n);
