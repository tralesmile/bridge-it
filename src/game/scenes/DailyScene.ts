import { onBack } from '../back';
import Phaser from 'phaser';
import { calendarDays, dateKey, liveStreak } from '../../core/daily';
import { addBackground } from '../background';
import { save } from '../save';
import { C, GAME_W } from '../theme';
import { button, label, panel } from '../ui';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Daily Bridge calendar: today and the 13 days before. Past days are just for fun (no streak, no coins). */
export class DailyScene extends Phaser.Scene {
  constructor() {
    super('daily');
  }

  create(): void {
    addBackground(this);
    panel(this, GAME_W / 2, 400, 1100, 560);
    button(this, 110, 60, '◀ Back', () => this.scene.start('worlds'), { width: 160, height: 52, fontSize: 24, color: C.blue, shade: C.blueDark });
    onBack(this, () => this.scene.start('worlds'));
    label(this, GAME_W / 2, 60, 'Daily calendar', 52, C.white).setStroke(C.ink, 10);

    const today = dateKey(new Date());
    const played = new Set(save.data.daily.played);
    if (save.data.daily.last) played.add(save.data.daily.last);
    const days = calendarDays(today);
    const cols = 7;
    const w = 130;
    const h = 150;
    const gap = 18;
    const left = GAME_W / 2 - ((cols - 1) * (w + gap)) / 2;
    days.forEach((key, i) => {
      const [y, m, d] = key.split('-').map(Number);
      const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
      const isToday = key === today;
      const won = played.has(key);
      const x = left + (i % cols) * (w + gap);
      const cy = 245 + Math.floor(i / cols) * (h + gap + 10);
      const text = `${isToday ? 'Today' : weekday}\n${d} ${MONTHS[m - 1]}\n${won ? '✓' : ' '}`;
      button(this, x, cy, text, () => this.scene.start('play', { levelId: `daily-${key}` }), {
        width: w,
        height: h,
        fontSize: 24,
        color: isToday ? C.gold : won ? C.good : C.primary,
        shade: isToday ? '#d99a14' : won ? C.goodDark : C.primaryDark,
        textColor: isToday ? C.ink : C.white,
      });
    });

    const streak = liveStreak(save.data.daily, today);
    label(this, GAME_W / 2, 590, streak > 0 ? `🔥 ${streak} day streak` : 'Win today to start a streak!', 26, C.ink);
    label(this, GAME_W / 2, 630, 'Only today counts for the streak and coins. Old days are just for fun.', 20, C.greyDark);
  }
}
