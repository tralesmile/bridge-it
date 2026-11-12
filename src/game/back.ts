import type Phaser from 'phaser';
import { closeCodeDialog, codeDialogOpen } from './codeDialog';

/**
 * One "back" action for the Escape key and the Android back button.
 * Open windows (settings, pause) close first; then the top scene goes back.
 * On the main menu there is nowhere to go back to: the app may minimize itself.
 */

const closers: Array<() => void> = [];
const sceneBack = new Map<string, () => void>();

/** A window that Back closes. It is forgotten when the object is destroyed (for example on a scene change). */
export function closeOnBack(obj: Phaser.GameObjects.GameObject, close: () => void): void {
  closers.push(close);
  obj.once('destroy', () => {
    const i = closers.indexOf(close);
    if (i >= 0) closers.splice(i, 1);
  });
}

/** What Back does in this scene. Scenes without one (the menu) let the app exit. */
export function onBack(scene: Phaser.Scene, fn: () => void): void {
  sceneBack.set(scene.sys.settings.key, fn);
}

/** Runs one back step. Returns false when nothing could go back (on the main menu). */
export function goBack(game: Phaser.Game): boolean {
  if (codeDialogOpen()) {
    closeCodeDialog();
    return true;
  }
  const close = closers.pop();
  if (close) {
    close();
    return true;
  }
  const scenes = game.scene.getScenes(true);
  for (let i = scenes.length - 1; i >= 0; i--) {
    const fn = sceneBack.get(scenes[i].sys.settings.key);
    if (fn) {
      fn();
      return true;
    }
  }
  return false;
}
