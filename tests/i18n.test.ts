import { describe, expect, test } from 'vitest';
import { LANGS, LANG_NAMES, TEXTS, isLang, nextLang, pickLang, translate, type TextKey } from '../src/core/i18n';

const vars = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('languages', () => {
  const keys = Object.keys(TEXTS.en) as TextKey[];

  test('every language has every key, with the same {names}, and no empty text', () => {
    for (const lang of LANGS) {
      expect(Object.keys(TEXTS[lang]).sort()).toEqual([...keys].sort());
      for (const k of keys) {
        expect(TEXTS[lang][k].trim().length, `${lang} ${k}`).toBeGreaterThan(0);
        expect(vars(TEXTS[lang][k]), `${lang} ${k}`).toEqual(vars(TEXTS.en[k]));
      }
    }
    expect(Object.keys(LANG_NAMES).sort()).toEqual([...LANGS].sort());
  });

  test('short labels stay short in every language (buttons do not grow)', () => {
    const limits: Partial<Record<TextKey, number>> = { 'settings.on': 6, 'settings.off': 6, 'menu.play': 10, 'menu.shop': 11, 'menu.stats': 11, 'menu.settings': 11, 'menu.editor': 11, 'menu.sandbox': 11, 'menu.trophies': 11 };
    for (const lang of LANGS) for (const [k, max] of Object.entries(limits)) expect(TEXTS[lang][k as TextKey].length, `${lang} ${k}`).toBeLessThanOrEqual(max);
  });

  test('translate fills in names and keeps unknown ones', () => {
    expect(translate('en', 'trophies.page', { page: 2, pages: 3 })).toBe('Page 2 / 3');
    expect(translate('de', 'trophies.page', { page: 1 })).toBe('Seite 1 / {pages}');
    expect(translate('mk', 'menu.play')).toBe('ИГРАЈ');
  });

  test('the browser language picks the game language, English otherwise', () => {
    expect(pickLang(['de-AT', 'en'])).toBe('de');
    expect(pickLang(['pt_BR'])).toBe('pt');
    expect(pickLang(['ja', 'MK'])).toBe('mk');
    expect(pickLang(['ja'])).toBe('en');
    expect(pickLang([])).toBe('en');
    expect(isLang('fr')).toBe(true);
    expect(isLang('xx')).toBe(false);
    expect(nextLang('en')).toBe('de');
    expect(nextLang('mk')).toBe('en');
  });
});
