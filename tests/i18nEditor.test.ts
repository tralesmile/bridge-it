import { describe, expect, test } from 'vitest';
import { anchorProblem, decodeLevel, laneProblem, DEFAULT_CUSTOM } from '../src/core/custom';
import { LANGS, TEXTS, fromEnglish, type TextKey } from '../src/core/i18n';
import { SANDBOX_BANKS, SANDBOX_HELPS } from '../src/core/sandbox';

describe('sandbox and editor texts', () => {
  test('core problem texts from the editor have a translation', () => {
    const spec = { ...DEFAULT_CUSTOM, gap: 12, lanes: [4] };
    const problems = [
      laneProblem(spec, 10),
      laneProblem(spec, 5),
      anchorProblem(spec, { x: 0.5, y: 0 }),
      anchorProblem(spec, { x: 99, y: 0 }),
      anchorProblem(spec, { x: 6, y: -2 }),
      decodeLevel('hello').ok ? null : (decodeLevel('hello') as { error: string }).error,
    ].filter((p): p is string => typeof p === 'string');
    expect(problems.length).toBe(6);
    for (const p of problems) {
      for (const lang of LANGS.filter((l) => l !== 'en')) expect(fromEnglish(lang, p), `${lang}: ${p}`).not.toBe(p);
    }
  });

  test('fromEnglish fills numbers into templates and keeps unknown texts', () => {
    expect(fromEnglish('de', 'Too far out.')).toBe('Zu weit draußen.');
    expect(fromEnglish('de', 'A ship lane is 4 m wide and must fit in the gap.')).toBe('Ein Schiffsweg ist 4 m breit und muss in die Lücke passen.');
    expect(fromEnglish('en', 'Too far out.')).toBe('Too far out.');
    expect(fromEnglish('fr', 'Something new.')).toBe('Something new.');
  });

  test('sandbox choices have names, short vehicle names stay short', () => {
    for (const lang of LANGS) {
      for (const id of [...SANDBOX_BANKS, ...SANDBOX_HELPS]) expect(TEXTS[lang][`sandbox.${id}` as TextKey], `${lang} ${id}`).toBeTruthy();
      for (const v of ['car', 'truck', 'train']) expect(TEXTS[lang][`short.${v}` as TextKey].length, `${lang} ${v}`).toBeLessThanOrEqual(9);
    }
  });
});
