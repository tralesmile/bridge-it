/**
 * Daily Bridge names in 8 languages. A name is one adjective and one place word, picked by index
 * from the date (`dailyNameParts` in `src/core/daily.ts`), so every player sees the same name in
 * their own language. Adjectives have one form per gender of the place word (m, f, n); the order
 * says whether the adjective comes before or after the place word.
 * Also the "(copy)" word for copied player levels.
 */
import type { Lang } from '../i18n';

type Gender = 0 | 1 | 2; // m, f, n
interface DailyWords {
  /** Adjective before ("Sunny Creek") or after ("Arroyo soleado") the place word. */
  order: 'before' | 'after';
  /** Same order as English: Sunny, Misty, Windy, Rainy, Quiet, Golden, Frosty, Lucky, Sleepy, Happy. Forms m, f, n. */
  adjectives: readonly (readonly [string, string, string])[];
  /** Same order as English: Creek, Gap, Gorge, Valley, River, Pass, Ravine, Brook, Canyon, Crossing. */
  places: readonly (readonly [string, Gender])[];
}

const one = (words: string[]): [string, string, string][] => words.map((w) => [w, w, w]);
const m = (words: string[]): [string, Gender][] => words.map((w) => [w, 0]);
/** German adjective stems get the strong endings: sonniger Bach, sonnige Schlucht, sonniges Tal. */
const de = (stems: string[]): [string, string, string][] => stems.map((s) => [`${s}er`, `${s}e`, `${s}es`]);
/** Romance adjectives: masculine and feminine forms; there is no neuter, so it is never used. */
const mf = (pairs: [string, string][]): [string, string, string][] => pairs.map(([a, b]) => [a, b, a]);

export const DAILY_WORDS: Record<Lang, DailyWords> = {
  en: {
    order: 'before',
    adjectives: one(['Sunny', 'Misty', 'Windy', 'Rainy', 'Quiet', 'Golden', 'Frosty', 'Lucky', 'Sleepy', 'Happy']),
    places: m(['Creek', 'Gap', 'Gorge', 'Valley', 'River', 'Pass', 'Ravine', 'Brook', 'Canyon', 'Crossing']),
  },
  de: {
    order: 'before',
    adjectives: de(['Sonnig', 'Neblig', 'Windig', 'Regnerisch', 'Still', 'Golden', 'Frostig', 'Glücklich', 'Verschlafen', 'Fröhlich']),
    places: [['Bach', 0], ['Spalt', 0], ['Schlucht', 1], ['Tal', 2], ['Fluss', 0], ['Pass', 0], ['Klamm', 1], ['Bächlein', 2], ['Canyon', 0], ['Übergang', 0]],
  },
  es: {
    order: 'after',
    adjectives: mf([['soleado', 'soleada'], ['brumoso', 'brumosa'], ['ventoso', 'ventosa'], ['lluvioso', 'lluviosa'], ['tranquilo', 'tranquila'], ['dorado', 'dorada'], ['helado', 'helada'], ['afortunado', 'afortunada'], ['dormido', 'dormida'], ['alegre', 'alegre']]),
    places: [['Arroyo', 0], ['Brecha', 1], ['Garganta', 1], ['Valle', 0], ['Río', 0], ['Paso', 0], ['Barranco', 0], ['Riachuelo', 0], ['Cañón', 0], ['Cruce', 0]],
  },
  pt: {
    order: 'after',
    adjectives: mf([['ensolarado', 'ensolarada'], ['nebuloso', 'nebulosa'], ['ventoso', 'ventosa'], ['chuvoso', 'chuvosa'], ['tranquilo', 'tranquila'], ['dourado', 'dourada'], ['gelado', 'gelada'], ['sortudo', 'sortuda'], ['sonolento', 'sonolenta'], ['feliz', 'feliz']]),
    places: [['Riacho', 0], ['Fenda', 1], ['Garganta', 1], ['Vale', 0], ['Rio', 0], ['Passo', 0], ['Ravina', 1], ['Córrego', 0], ['Cânion', 0], ['Travessia', 1]],
  },
  fr: {
    order: 'after',
    adjectives: mf([['ensoleillé', 'ensoleillée'], ['brumeux', 'brumeuse'], ['venteux', 'venteuse'], ['pluvieux', 'pluvieuse'], ['calme', 'calme'], ['doré', 'dorée'], ['glacé', 'glacée'], ['chanceux', 'chanceuse'], ['endormi', 'endormie'], ['joyeux', 'joyeuse']]),
    places: [['Ruisseau', 0], ['Brèche', 1], ['Gorge', 1], ['Vallée', 1], ['Rivière', 1], ['Col', 0], ['Ravin', 0], ['Torrent', 0], ['Canyon', 0], ['Passage', 0]],
  },
  tr: {
    order: 'before',
    adjectives: one(['Güneşli', 'Sisli', 'Rüzgârlı', 'Yağmurlu', 'Sessiz', 'Altın', 'Buzlu', 'Şanslı', 'Uykulu', 'Mutlu']),
    places: m(['Dere', 'Yarık', 'Boğaz', 'Vadi', 'Nehir', 'Geçit', 'Koyak', 'Pınar', 'Kanyon', 'Geçiş']),
  },
  ru: {
    order: 'before',
    adjectives: [
      ['Солнечный', 'Солнечная', 'Солнечное'], ['Туманный', 'Туманная', 'Туманное'], ['Ветреный', 'Ветреная', 'Ветреное'],
      ['Дождливый', 'Дождливая', 'Дождливое'], ['Тихий', 'Тихая', 'Тихое'], ['Золотой', 'Золотая', 'Золотое'],
      ['Морозный', 'Морозная', 'Морозное'], ['Счастливый', 'Счастливая', 'Счастливое'], ['Сонный', 'Сонная', 'Сонное'],
      ['Весёлый', 'Весёлая', 'Весёлое'],
    ],
    places: [['ручей', 0], ['разлом', 0], ['ущелье', 2], ['долина', 1], ['река', 1], ['перевал', 0], ['овраг', 0], ['протока', 1], ['каньон', 0], ['переправа', 1]],
  },
  mk: {
    order: 'before',
    adjectives: [
      ['Сончев', 'Сончева', 'Сончево'], ['Маглив', 'Маглива', 'Магливо'], ['Ветровит', 'Ветровита', 'Ветровито'],
      ['Дождлив', 'Дождлива', 'Дождливо'], ['Тивок', 'Тивка', 'Тивко'], ['Златен', 'Златна', 'Златно'],
      ['Мразовит', 'Мразовита', 'Мразовито'], ['Среќен', 'Среќна', 'Среќно'], ['Поспан', 'Поспана', 'Поспано'],
      ['Весел', 'Весела', 'Весело'],
    ],
    places: [['поток', 0], ['процеп', 0], ['клисура', 1], ['долина', 1], ['река', 1], ['превој', 0], ['јаруга', 1], ['поточе', 2], ['кањон', 0], ['премин', 0]],
  },
};

/** The Daily Bridge name in a language, from the adjective and place indexes. */
export function dailyNameIn(lang: Lang, adjective: number, place: number): string {
  const w = DAILY_WORDS[lang];
  const [noun, gender] = w.places[place];
  const adj = w.adjectives[adjective][gender];
  return w.order === 'before' ? `${adj} ${noun}` : `${noun} ${adj}`;
}

/** The word in brackets after a copied level's name: "Big Gap (copy)", "Big Gap (copy 2)". Letters only. */
export const COPY_WORD: Record<Lang, string> = {
  en: 'copy',
  de: 'Kopie',
  es: 'copia',
  pt: 'cópia',
  fr: 'copie',
  tr: 'kopya',
  ru: 'копия',
  mk: 'копија',
};
