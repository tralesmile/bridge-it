import { describe, expect, test } from 'vitest';
import { ALL_LEVELS } from '../src/core/levels';
import { decodeBridge, encodeBridge } from '../src/core/share';

describe('share codes', () => {
  test('every level solution round-trips', () => {
    for (const level of ALL_LEVELS) {
      const code = encodeBridge(level.id, level.solution);
      const back = decodeBridge(code);
      expect(back.ok ? "ok" : back.error, level.id).toBe("ok");
      if (back.ok) {
        expect(back.levelId).toBe(level.id);
        expect(back.beams.length).toBe(level.solution.length);
      }
    }
  });
  test('typos and junk are rejected', () => {
    const level = ALL_LEVELS[2];
    const code = encodeBridge(level.id, level.solution);
    const bad = code.slice(0, 8) + (code[8] === 'A' ? 'B' : 'A') + code.slice(9);
    expect(decodeBridge(bad).ok).toBe(false);
    expect(decodeBridge('hello').ok).toBe(false);
    expect(decodeBridge('').ok).toBe(false);
  });
  test('a bridge from another level that does not fit is rejected', () => {
    const big = ALL_LEVELS.find((l) => l.solution.length > 3)!;
    const code = encodeBridge('w1-1', big.solution);
    expect(decodeBridge(code).ok).toBe(false);
  });
});
