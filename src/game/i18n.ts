import { pickLang, translate, type Lang, type TextKey } from '../core/i18n';
import type { VehicleId } from '../core/types';
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

/** A world's name in the player's language (world ids 1 to 5 have a text). */
export function worldName(id: number): string {
  return id >= 1 && id <= 5 ? t(`world.${id}` as TextKey) : `World ${id}`;
}

/** Short weekday and month names in the player's language ("Mon", "Nov"), from the browser; English if it has none. */
export function dateNames(lang: Lang = currentLang()): { weekday: (d: Date) => string; month: (d: Date) => string } {
  try {
    const wd = new Intl.DateTimeFormat(lang, { weekday: 'short' });
    const mo = new Intl.DateTimeFormat(lang, { month: 'short' });
    return { weekday: (d) => wd.format(d), month: (d) => mo.format(d).replace(/\.$/, '') };
  } catch {
    return { weekday: (d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], month: (d) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] };
  }
}

/** A vehicle's name in the player's language ("Moo Car"). */
export const vehicleName = (id: VehicleId): string => t(`vehicle.${id}`);
