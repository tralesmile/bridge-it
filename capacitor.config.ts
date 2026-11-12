import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android and iOS apps (Capacitor). `npm run app:sync` builds the web game into `dist`
 * and copies it into `android/` and `ios/`.
 * The app id cannot change after the first store upload: the owner confirms it first (docs/NEEDS_FROM_OWNER.md).
 */
const config: CapacitorConfig = {
  appId: 'com.tralesmile.bridgeit',
  appName: 'Bridge It!',
  webDir: 'dist',
  backgroundColor: '#7cc6ff',
  android: { backgroundColor: '#7cc6ff' },
  ios: { backgroundColor: '#7cc6ff', contentInset: 'never' },
};

export default config;
