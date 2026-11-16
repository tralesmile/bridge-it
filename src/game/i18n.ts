import { fromEnglish, pickLang, translate, type Lang, type TextKey } from '../core/i18n';
import type { Achievement } from '../core/achievements';
import { DAILY_TIP, NEW_LEVEL_NAME, levelNameIn, levelTipIn } from '../core/texts/levels';
import { isDailyId } from '../core/daily';
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

/** An English text from the core (a problem message) in the player's language. */
export const tEn = (english: string): string => fromEnglish(currentLang(), english);

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

/** The text key of an achievement ("ach.first-win"; world goals share "ach.world" and "ach.perfect"). */
const achKey = (a: Achievement): string => (a.world !== undefined ? `ach.${a.id.startsWith('perfect') ? 'perfect' : 'world'}` : `ach.${a.id}`);

/** An achievement's name in the player's language. */
export const achName = (a: Achievement): string => t(achKey(a) as TextKey, a.world !== undefined ? { world: worldName(a.world) } : {});

/** An achievement's goal text in the player's language. */
export const achText = (a: Achievement): string => t(`${achKey(a)}.text` as TextKey, a.world !== undefined ? { world: worldName(a.world) } : {});

/** A level's name in the player's language (player and Daily levels keep their own name). */
export const levelName = (level: { id: string; name: string }): string => levelNameIn(currentLang(), level.id, level.name);

/** A level's start tip in the player's language. */
export const levelTip = (level: { id: string; tip?: string }): string | undefined => (isDailyId(level.id) ? DAILY_TIP[currentLang()] : levelTipIn(currentLang(), level.id, level.tip));

/** The name a new level gets in the Level Editor. */
export const newLevelName = (): string => NEW_LEVEL_NAME[currentLang()];
