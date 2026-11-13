import { describe, expect, test } from 'vitest';
import { MATERIALS } from '../src/core/materials';
import { VEHICLES } from '../src/core/vehicles';
import { LANGS, LANG_NAMES, TEXTS, isLang, nextLang, pickLang, translate, twoLines, type TextKey } from '../src/core/i18n';

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

  test('play scene: tool bar labels stay short, every material and vehicle has a name', () => {
    const tool: TextKey[] = ['play.erase', 'play.undo', 'play.hint', 'play.go', 'play.edit', ...Object.keys(MATERIALS).map((m) => `mat.${m}` as TextKey)];
    for (const lang of LANGS) for (const k of tool) expect(TEXTS[lang][k].length, `${lang} ${k}`).toBeLessThanOrEqual(10);
    // English names match the core tables (they are used in level tips and tests).
    for (const m of Object.values(MATERIALS)) expect(TEXTS.en[`mat.${m.id}` as TextKey]).toBe(m.name);
    for (const v of Object.values(VEHICLES)) expect(TEXTS.en[`vehicle.${v.id}` as TextKey]).toBe(v.name);
    expect(translate('en', 'play.nextStar', { cost: '1,200', next: '900' })).toBe('Cost $1,200 · next star at $900');
  });

  test('translate fills in names and keeps unknown ones', () => {
    expect(translate('en', 'common.page', { page: 2, pages: 3 })).toBe('Page 2 / 3');
    expect(translate('de', 'common.page', { page: 1 })).toBe('Seite 1 / {pages}');
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

  test('world names split onto two lines near the middle', () => {
    expect(twoLines('Farm Valley')).toBe('Farm\nValley');
    expect(twoLines('Шини во кањон')).toBe('Шини во\nкањон');
    expect(twoLines('Farmtal')).toBe('Farmtal');
    // Every world name fits a narrow card: no line longer than 15 letters.
    for (const lang of LANGS) for (const w of [1, 2, 3, 4, 5]) {
      const name = TEXTS[lang][`world.${w}` as TextKey];
      for (const line of twoLines(name).split('\n')) expect(line.length, `${lang} ${name}`).toBeLessThanOrEqual(15);
    }
  });
});
