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
    const why = (c: string): string => { const r = decodeBridge(c); return r.ok ? 'ok' : r.code; };
    expect(why(bad)).not.toBe('ok');
    const parts = code.split('.');
    parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
    expect(why(parts.join('.'))).toBe('typo');
    expect(why('hello')).toBe('not-code');
    expect(why('')).toBe('not-code');
  });
  test('a bridge from another level that does not fit is rejected', () => {
    const big = ALL_LEVELS.find((l) => l.solution.length > 3)!;
    const code = encodeBridge('w1-1', big.solution);
    const r = decodeBridge(code);
    expect(r.ok ? 'ok' : r.code).toBe('no-fit');
  });
});
