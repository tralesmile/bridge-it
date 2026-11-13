import Phaser from 'phaser';
import { ALL_LEVELS } from '../../core/levels';
import { vehicleTextureKey } from '../../core/shop';
import { addBackground } from '../background';
import { save } from '../save';
import { C, FONT, GAME_W } from '../theme';
import { announceAchievements, button, label, openSettings } from '../ui';

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
    if (!save.data.settings.reducedMotion) this.tweens.add({ targets: title, y: 210, angle: 1.5, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    label(this, GAME_W / 2, 310, 'Build it. Break it. Laugh. Try again.', 30, C.ink);

    const carImage = this.add.image(0, 0, vehicleTextureKey(save.shop, 'car'));
    // Cow head sits in the cabin (texture centre is 86,48; head is at 88,34).
    const cow = this.add.image(2, -14, 'cow-calm');
    const wheels = [-47, 47].map((dx) => this.add.image(dx, 28, 'wheel').setScale(0.72));
    const car = this.add.container(-120, 560, [...wheels, carImage, cow]).setScale(0.9);
    if (!save.data.settings.reducedMotion) this.tweens.add({ targets: wheels, angle: 360, duration: 900, repeat: -1 });
    if (save.data.settings.reducedMotion) car.setX(GAME_W / 2 + 300);
    else this.tweens.add({ targets: car, x: GAME_W + 120, duration: 7000, repeat: -1, delay: 500 });

    button(this, GAME_W / 2, 430, 'PLAY', () => this.scene.start('worlds'), { width: 280, height: 86, fontSize: 44, color: C.good, shade: C.goodDark });

    const stars = save.totalStars;
    label(this, GAME_W / 2, 520, `★ ${stars} / ${ALL_LEVELS.length * 3}`, 28, C.ink);

    button(this, 100, 60, 'Shop', () => this.scene.start('shop'), { width: 150, height: 52, fontSize: 22, color: C.gold, shade: '#d99a14', textColor: C.ink });
    button(this, 270, 60, 'Trophies', () => this.scene.start('trophies'), { width: 170, height: 52, fontSize: 22, color: C.primary, shade: C.primaryDark });
    button(this, 445, 60, 'Stats', () => this.scene.start('stats'), { width: 150, height: 52, fontSize: 22, color: C.blue, shade: C.blueDark });
    button(this, 625, 60, 'Sandbox', () => this.scene.start('sandbox'), { width: 170, height: 52, fontSize: 22, color: C.good, shade: C.goodDark });
    button(this, 805, 60, 'Editor', () => this.scene.start('editor'), { width: 170, height: 52, fontSize: 22, color: C.primary, shade: C.primaryDark });
    this.add.image(60, 125, 'coin').setScale(0.8);
    label(this, 80, 125, `${save.data.coins}`, 26, C.ink).setOrigin(0, 0.5);

    announceAchievements(this, 300);

    button(this, GAME_W - 100, 60, 'Settings', () => openSettings(this), { width: 170, height: 52, fontSize: 22, color: C.blue, shade: C.blueDark });
  }
}
