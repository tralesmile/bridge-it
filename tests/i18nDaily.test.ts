import { describe, expect, test } from 'vitest';
import { LANGS } from '../src/core/i18n';
import { COPY_WORD, DAILY_WORDS, dailyNameIn } from '../src/core/texts/daily';
import { CUSTOM_NAME_MAX, cleanName, copyName } from '../src/core/custom';
import { dailyLevel, dailyNameParts } from '../src/core/daily';

describe('Daily Bridge names and the copy word', () => {
  test('every language has the same number of words as English', () => {
    for (const lang of LANGS) {
      expect(DAILY_WORDS[lang].adjectives.length, lang).toBe(DAILY_WORDS.en.adjectives.length);
      expect(DAILY_WORDS[lang].places.length, lang).toBe(DAILY_WORDS.en.places.length);
    }
  });
  test('every name has two words and fits the title', () => {
    for (const lang of LANGS)
      for (let a = 0; a < 10; a++)
        for (let p = 0; p < 10; p++) {
          const n = dailyNameIn(lang, a, p);
          expect(n.split(' ').length, `${lang} ${n}`).toBe(2);
          expect(n.length, `${lang} ${n}`).toBeLessThanOrEqual(24);
        }
  });
  test('the English name matches the level, and other languages follow gender', () => {
    for (const key of ['2026-11-16', '2026-01-01', '2027-03-05', '2028-02-29']) {
      const l = dailyLevel(key);
      const parts = dailyNameParts(l.id)!;
      expect(dailyNameIn('en', parts.adjective, parts.place)).toBe(l.name);
    }
    expect(dailyNameParts('w1-1')).toBeUndefined();
    expect(dailyNameIn('de', 0, 2)).toBe('Sonnige Schlucht');
    expect(dailyNameIn('de', 0, 3)).toBe('Sonniges Tal');
    expect(dailyNameIn('es', 0, 3)).toBe('Valle soleado');
    expect(dailyNameIn('fr', 1, 3)).toBe('Vallée brumeuse');
    expect(dailyNameIn('ru', 4, 4)).toBe('Тихая река');
    expect(dailyNameIn('mk', 5, 7)).toBe('Златно поточе');
  });
  test('copy words are valid in names and a copy of a copy gets one tag', () => {
    for (const lang of LANGS) {
      const w = COPY_WORD[lang];
      const n = copyName('Rocky', [], w);
      expect(n, lang).toBe(`Rocky (${w})`);
      expect(cleanName(n), lang).toBe(n);
      expect(copyName(n, [n], w), lang).toBe(`Rocky (${w} 2)`);
      expect(copyName('A very long level nm', [], w).length, lang).toBeLessThanOrEqual(CUSTOM_NAME_MAX);
    }
    expect(copyName('Rocky (copy)', [], 'Kopie')).toBe('Rocky (Kopie)');
  });
});
