import { describe, expect, test } from 'vitest';
import { ALL_LEVELS } from '../src/core/levels';
import { LANGS } from '../src/core/i18n';
import { DAILY_TIP, LEVEL_TEXTS, NEW_LEVEL_NAME, levelNameIn, levelTipIn } from '../src/core/texts/levels';
import { CUSTOM_NAME_MAX, DEFAULT_CUSTOM, cleanName, freshName } from '../src/core/custom';
import { dailyLevel } from '../src/core/daily';

describe('level texts', () => {
  test('English names and tips match the level list', () => {
    for (const l of ALL_LEVELS) {
      expect(levelNameIn('en', l.id, '?'), l.id).toBe(l.name);
      expect(levelTipIn('en', l.id, '?'), l.id).toBe(l.tip);
    }
  });
  test('every language has every level, and a tip exactly where English has one', () => {
    const ids = ALL_LEVELS.map((l) => l.id).sort();
    for (const lang of LANGS) {
      expect(Object.keys(LEVEL_TEXTS[lang]).sort(), lang).toEqual(ids);
      for (const l of ALL_LEVELS) {
        const [name, tip] = LEVEL_TEXTS[lang][l.id];
        expect(name.trim().length, `${lang} ${l.id}`).toBeGreaterThan(0);
        expect(name.length, `${lang} ${l.id} name fits the level card`).toBeLessThanOrEqual(22);
        expect(tip === undefined, `${lang} ${l.id} tip`).toBe(l.tip === undefined);
        if (tip) expect(tip.length, `${lang} ${l.id} tip`).toBeLessThanOrEqual(120);
      }
    }
  });
  test('levels without a text keep their own name and tip', () => {
    const d = dailyLevel('2026-11-16');
    expect(levelNameIn('de', d.id, d.name)).toBe(d.name);
    expect(levelTipIn('de', 'custom-x', 'Own tip')).toBe('Own tip');
    for (const lang of LANGS) expect(DAILY_TIP[lang].length).toBeGreaterThan(0);
    expect(DAILY_TIP.en).toBe(d.tip);
  });
  test('new level names are valid level names in every language', () => {
    expect(NEW_LEVEL_NAME.en).toBe(DEFAULT_CUSTOM.name);
    for (const lang of LANGS) {
      const n = NEW_LEVEL_NAME[lang];
      expect(cleanName(n), lang).toBe(n);
      expect(freshName([n, `${n} 2`], n).length, lang).toBeLessThanOrEqual(CUSTOM_NAME_MAX);
    }
    expect(freshName(['Mein Level'], 'Mein Level')).toBe('Mein Level 2');
    expect(freshName([])).toBe('My Level');
  });
});
