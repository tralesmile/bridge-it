import Phaser from 'phaser';
import { ALL_LEVELS } from '../../core/levels';
import { sfx } from '../audio';
import { addBackground } from '../background';
import { save } from '../save';
import { C, FONT, GAME_W } from '../theme';
import { button, label } from '../ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    addBackground(this);

    const title = this.add
      .text(GAME_W / 2, 200, 'Bridge It!', { fontFamily: FONT, fontSize: '120px', fontStyle: 'bold', color: C.white })
      .setOrigin(0.5);
    title.setStroke(C.ink, 14);
    title.setShadow(0, 10, 'rgba(43,33,64,0.35)', 0, true, true);
    this.tweens.add({ targets: title, y: 210, angle: 1.5, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    label(this, GAME_W / 2, 310, 'Build it. Break it. Laugh. Try again.', 30, C.ink);

    const car = this.add.image(-120, 560, 'car').setScale(0.9);
    this.tweens.add({ targets: car, x: GAME_W + 120, duration: 7000, repeat: -1, delay: 500 });

    button(this, GAME_W / 2, 430, 'PLAY', () => this.scene.start('levels'), { width: 280, height: 86, fontSize: 44, color: C.good, shade: C.goodDark });

    const stars = save.totalStars;
    label(this, GAME_W / 2, 520, `★ ${stars} / ${ALL_LEVELS.length * 3}`, 28, C.ink);

    const sound = button(this, GAME_W - 90, 60, save.data.settings.sound ? 'Sound on' : 'Sound off', () => {
      save.data.settings.sound = !save.data.settings.sound;
      save.persist();
      sound.setLabel(save.data.settings.sound ? 'Sound on' : 'Sound off');
      sfx.unlock();
    }, { width: 150, height: 48, fontSize: 20, color: C.blue, shade: C.blueDark });
  }
}
