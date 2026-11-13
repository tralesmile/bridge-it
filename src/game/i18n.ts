import { pickLang, translate, type Lang, type TextKey } from '../core/i18n';
import { save } from './save';

/** The player's language: the one picked in Settings, else the browser's (English if the game does not have it). */
export function currentLang(): Lang {
  const picked = save.data.settings.lang;
  if (picked) return picked;
  try {
    const nav = globalThis.navigator;
    return pickLang(nav?.languages?.length ? nav.languages : [nav?.language ?? 'en']);
  } catch {
    return 'en';
  }
}

/** Game text in the player's language. */
export const t = (key: TextKey, vars?: Record<string, string | number>): string => translate(currentLang(), key, vars);
