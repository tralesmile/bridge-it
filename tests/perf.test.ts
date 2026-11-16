import { describe, expect, test } from 'vitest';
import { FrameWatch, fxCount } from '../src/core/perf';

const run = (w: FrameWatch, ms: number, n: number) => {
  const out: (string | null)[] = [];
  for (let i = 0; i < n; i++) out.push(w.push(ms));
  return out.filter((v) => v !== null);
};

describe('low-effects mode', () => {
  test('a fast device is ok, a slow one is slow, each said once', () => {
    expect(run(new FrameWatch(), 16.7, 500)).toEqual(['ok']);
    expect(run(new FrameWatch(), 40, 500)).toEqual(['slow']);
  });
  test('the warm-up and long pauses do not count', () => {
    const w = new FrameWatch(5, 10);
    expect(run(w, 100, 5)).toEqual([]);
    expect(run(w, 1000, 50)).toEqual([]);
    expect(run(w, 16, 9)).toEqual([]);
    expect(run(w, 16, 1)).toEqual(['ok']);
  });
  test('a few slow frames on a fast device stay ok (median)', () => {
    const w = new FrameWatch(0, 10);
    const out = [40, 40, 40, 16, 16, 16, 16, 16, 16, 16].map((ms) => w.push(ms)).filter((v) => v !== null);
    expect(out).toEqual(['ok']);
  });
  test('particle counts drop to a third', () => {
    expect(fxCount(18, false)).toBe(18);
    expect(fxCount(18, true)).toBe(6);
    expect(fxCount(1, true)).toBe(1);
  });
});
