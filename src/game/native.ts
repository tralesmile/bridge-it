import { Capacitor } from '@capacitor/core';
import type Phaser from 'phaser';
import { goBack } from './back';
import { save } from './save';

/**
 * Phone app extras (Capacitor). On the web all of this does nothing, and the plugin code
 * is only loaded inside the app.
 */

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

type HapticsModule = typeof import('@capacitor/haptics');
let haptics: HapticsModule | null = null;
let lastBuzz = 0;

/** Escape (web) and the Android back button go back one step; on the menu the app goes to the background. */
export function setupBackKeys(game: Phaser.Game): void {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') goBack(game);
  });
  if (!isNativeApp()) return;
  void import('@capacitor/app').then(({ App }) => {
    void App.addListener('backButton', () => {
      if (!goBack(game)) void App.minimizeApp();
    });
  });
  void import('@capacitor/haptics').then((m) => {
    haptics = m;
  });
}

/** A short buzz on phones. It follows the Screen shake switch. */
export function haptic(kind: 'light' | 'heavy'): void {
  if (!haptics || !save.data.settings.shake) return;
  // Many beams can snap in one frame: one buzz is enough.
  const now = performance.now();
  if (now - lastBuzz < 90) return;
  lastBuzz = now;
  const style = kind === 'heavy' ? haptics.ImpactStyle.Heavy : haptics.ImpactStyle.Light;
  void haptics.Haptics.impact({ style }).catch(() => undefined);
}
