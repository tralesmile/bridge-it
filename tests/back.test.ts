import { describe, expect, test } from 'vitest';
import type Phaser from 'phaser';
import { closeOnBack, goBack, onBack } from '../src/game/back';

// Small stand-ins for Phaser scenes, game objects and the game.
const fakeScene = (key: string) => ({ sys: { settings: { key } } }) as unknown as Phaser.Scene;
const fakeObject = () => {
  let onDestroy: (() => void) | null = null;
  return {
    once: (_e: string, fn: () => void) => {
      onDestroy = fn;
    },
    destroy: () => onDestroy?.(),
  };
};
const fakeGame = (active: Phaser.Scene[]) => ({ scene: { getScenes: () => active } }) as unknown as Phaser.Game;

describe('back button', () => {
  test('closes the newest open window first, then the scene goes back', () => {
    const log: string[] = [];
    const scene = fakeScene('shop');
    onBack(scene, () => log.push('shop back'));
    const a = fakeObject();
    const b = fakeObject();
    closeOnBack(a as unknown as Phaser.GameObjects.GameObject, () => log.push('close a'));
    closeOnBack(b as unknown as Phaser.GameObjects.GameObject, () => log.push('close b'));
    const game = fakeGame([scene]);
    expect(goBack(game)).toBe(true);
    expect(goBack(game)).toBe(true);
    expect(goBack(game)).toBe(true);
    expect(log).toEqual(['close b', 'close a', 'shop back']);
  });

  test('a window closed by its own button is forgotten', () => {
    const log: string[] = [];
    const scene = fakeScene('stats');
    onBack(scene, () => log.push('stats back'));
    const w = fakeObject();
    closeOnBack(w as unknown as Phaser.GameObjects.GameObject, () => log.push('close'));
    w.destroy();
    goBack(fakeGame([scene]));
    expect(log).toEqual(['stats back']);
  });

  test('on a scene with no back step (the menu) it reports false, so the app can minimize', () => {
    expect(goBack(fakeGame([fakeScene('menu')]))).toBe(false);
  });
});
