/**
 * Game text in 8 languages. English is the base: every key is in `EN`, and every other
 * language must have every key (tests check this, and that {names} in the text match).
 * Screens move to `t()` a few at a time; text not moved yet stays English.
 */

export const LANGS = ['en', 'de', 'es', 'pt', 'fr', 'tr', 'ru', 'mk'] as const;
export type Lang = (typeof LANGS)[number];

/** Each language's name in that language, for the Settings button. */
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  tr: 'Türkçe',
  ru: 'Русский',
  mk: 'Македонски',
};

const EN = {
  'menu.tagline': 'Build it. Break it. Laugh. Try again.',
  'menu.play': 'PLAY',
  'menu.shop': 'Shop',
  'menu.trophies': 'Trophies',
  'menu.stats': 'Stats',
  'menu.sandbox': 'Sandbox',
  'menu.editor': 'Editor',
  'menu.settings': 'Settings',
  'settings.title': 'Settings',
  'settings.sound': 'Sound',
  'settings.shake': 'Screen shake',
  'settings.motion': 'Less motion',
  'settings.music': 'Music',
  'settings.language': 'Language',
  'settings.on': 'On',
  'settings.off': 'Off',
  'settings.removeAds': 'Remove ads',
  'settings.support': 'Support the game',
  'settings.privacy': 'Privacy choices',
  'common.close': 'Close',
  'common.back': '◀ Back',
  'trophies.title': 'Achievements',
  'trophies.page': 'Page {page} / {pages}',
} as const;

export type TextKey = keyof typeof EN;
type Table = Record<TextKey, string>;

const DE: Table = {
  'menu.tagline': 'Bauen. Kaputt machen. Lachen. Nochmal.',
  'menu.play': 'SPIELEN',
  'menu.shop': 'Laden',
  'menu.trophies': 'Pokale',
  'menu.stats': 'Statistik',
  'menu.sandbox': 'Sandkasten',
  'menu.editor': 'Editor',
  'menu.settings': 'Optionen',
  'settings.title': 'Einstellungen',
  'settings.sound': 'Ton',
  'settings.shake': 'Bildschirm wackeln',
  'settings.motion': 'Weniger Bewegung',
  'settings.music': 'Musik',
  'settings.language': 'Sprache',
  'settings.on': 'An',
  'settings.off': 'Aus',
  'settings.removeAds': 'Werbung entfernen',
  'settings.support': 'Das Spiel unterstützen',
  'settings.privacy': 'Datenschutz',
  'common.close': 'Schließen',
  'common.back': '◀ Zurück',
  'trophies.title': 'Erfolge',
  'trophies.page': 'Seite {page} / {pages}',
};

const ES: Table = {
  'menu.tagline': 'Constrúyelo. Rómpelo. Ríete. Otra vez.',
  'menu.play': 'JUGAR',
  'menu.shop': 'Tienda',
  'menu.trophies': 'Trofeos',
  'menu.stats': 'Datos',
  'menu.sandbox': 'Libre',
  'menu.editor': 'Editor',
  'menu.settings': 'Ajustes',
  'settings.title': 'Ajustes',
  'settings.sound': 'Sonido',
  'settings.shake': 'Temblor de pantalla',
  'settings.motion': 'Menos movimiento',
  'settings.music': 'Música',
  'settings.language': 'Idioma',
  'settings.on': 'Sí',
  'settings.off': 'No',
  'settings.removeAds': 'Quitar anuncios',
  'settings.support': 'Apoya el juego',
  'settings.privacy': 'Privacidad',
  'common.close': 'Cerrar',
  'common.back': '◀ Atrás',
  'trophies.title': 'Logros',
  'trophies.page': 'Página {page} / {pages}',
};

const PT: Table = {
  'menu.tagline': 'Construa. Quebre. Ria. Tente de novo.',
  'menu.play': 'JOGAR',
  'menu.shop': 'Loja',
  'menu.trophies': 'Troféus',
  'menu.stats': 'Dados',
  'menu.sandbox': 'Livre',
  'menu.editor': 'Editor',
  'menu.settings': 'Opções',
  'settings.title': 'Opções',
  'settings.sound': 'Som',
  'settings.shake': 'Tremer a tela',
  'settings.motion': 'Menos movimento',
  'settings.music': 'Música',
  'settings.language': 'Idioma',
  'settings.on': 'Sim',
  'settings.off': 'Não',
  'settings.removeAds': 'Remover anúncios',
  'settings.support': 'Apoie o jogo',
  'settings.privacy': 'Privacidade',
  'common.close': 'Fechar',
  'common.back': '◀ Voltar',
  'trophies.title': 'Conquistas',
  'trophies.page': 'Página {page} / {pages}',
};

const FR: Table = {
  'menu.tagline': 'Construis. Casse. Ris. Recommence.',
  'menu.play': 'JOUER',
  'menu.shop': 'Boutique',
  'menu.trophies': 'Trophées',
  'menu.stats': 'Stats',
  'menu.sandbox': 'Bac à sable',
  'menu.editor': 'Éditeur',
  'menu.settings': 'Options',
  'settings.title': 'Options',
  'settings.sound': 'Son',
  'settings.shake': "Secousses d'écran",
  'settings.motion': 'Moins de mouvement',
  'settings.music': 'Musique',
  'settings.language': 'Langue',
  'settings.on': 'Oui',
  'settings.off': 'Non',
  'settings.removeAds': 'Retirer les pubs',
  'settings.support': 'Soutenir le jeu',
  'settings.privacy': 'Confidentialité',
  'common.close': 'Fermer',
  'common.back': '◀ Retour',
  'trophies.title': 'Succès',
  'trophies.page': 'Page {page} / {pages}',
};

const TR: Table = {
  'menu.tagline': 'Kur. Yık. Gül. Yine dene.',
  'menu.play': 'OYNA',
  'menu.shop': 'Mağaza',
  'menu.trophies': 'Kupalar',
  'menu.stats': 'İstatistik',
  'menu.sandbox': 'Serbest',
  'menu.editor': 'Editör',
  'menu.settings': 'Ayarlar',
  'settings.title': 'Ayarlar',
  'settings.sound': 'Ses',
  'settings.shake': 'Ekran sarsıntısı',
  'settings.motion': 'Az hareket',
  'settings.music': 'Müzik',
  'settings.language': 'Dil',
  'settings.on': 'Açık',
  'settings.off': 'Kapalı',
  'settings.removeAds': 'Reklamları kaldır',
  'settings.support': 'Oyunu destekle',
  'settings.privacy': 'Gizlilik',
  'common.close': 'Kapat',
  'common.back': '◀ Geri',
  'trophies.title': 'Başarılar',
  'trophies.page': 'Sayfa {page} / {pages}',
};

const RU: Table = {
  'menu.tagline': 'Строй. Ломай. Смейся. Ещё раз.',
  'menu.play': 'ИГРАТЬ',
  'menu.shop': 'Магазин',
  'menu.trophies': 'Награды',
  'menu.stats': 'Итоги',
  'menu.sandbox': 'Песочница',
  'menu.editor': 'Редактор',
  'menu.settings': 'Опции',
  'settings.title': 'Настройки',
  'settings.sound': 'Звук',
  'settings.shake': 'Тряска экрана',
  'settings.motion': 'Меньше движения',
  'settings.music': 'Музыка',
  'settings.language': 'Язык',
  'settings.on': 'Вкл',
  'settings.off': 'Выкл',
  'settings.removeAds': 'Убрать рекламу',
  'settings.support': 'Поддержать игру',
  'settings.privacy': 'Конфиденциальность',
  'common.close': 'Закрыть',
  'common.back': '◀ Назад',
  'trophies.title': 'Достижения',
  'trophies.page': 'Стр. {page} / {pages}',
};

const MK: Table = {
  'menu.tagline': 'Изгради. Скрши. Смеј се. Пак.',
  'menu.play': 'ИГРАЈ',
  'menu.shop': 'Продавница',
  'menu.trophies': 'Трофеи',
  'menu.stats': 'Бројки',
  'menu.sandbox': 'Песок',
  'menu.editor': 'Уредник',
  'menu.settings': 'Опции',
  'settings.title': 'Поставки',
  'settings.sound': 'Звук',
  'settings.shake': 'Тресење на екран',
  'settings.motion': 'Помалку движење',
  'settings.music': 'Музика',
  'settings.language': 'Јазик',
  'settings.on': 'Вкл',
  'settings.off': 'Искл',
  'settings.removeAds': 'Без реклами',
  'settings.support': 'Поддржи ја играта',
  'settings.privacy': 'Приватност',
  'common.close': 'Затвори',
  'common.back': '◀ Назад',
  'trophies.title': 'Достигнувања',
  'trophies.page': 'Стр. {page} / {pages}',
};

export const TEXTS: Record<Lang, Table> = { en: EN, de: DE, es: ES, pt: PT, fr: FR, tr: TR, ru: RU, mk: MK };

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);

/** The text for `key` in `lang`, with {name} parts filled in. Falls back to English. */
export function translate(lang: Lang, key: TextKey, vars: Record<string, string | number> = {}): string {
  const raw = TEXTS[lang]?.[key] ?? EN[key];
  return raw.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}

/** The first of the browser's languages ("de-AT", "pt-BR", ...) that the game has; English otherwise. */
export function pickLang(preferred: readonly string[]): Lang {
  for (const p of preferred) {
    const base = p.toLowerCase().split(/[-_]/)[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

/** The next language in the list, for the Settings button (wraps around). */
export const nextLang = (lang: Lang): Lang => LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
