import { defineConfig, type Plugin } from 'vite';

/**
 * Build flavours: `vite build --mode crazygames`, `--mode poki` or `--mode app` (npm run build:crazygames /
 * build:poki / build:app). The app flavour (Android and iOS) uses AdMob and goes to `dist-app`.
 * Each flavour picks its platform adapter (VITE_PLATFORM) and adds only that portal's SDK script.
 * The plain build (own website) loads nothing from the network.
 */
const SDK: Record<string, string> = {
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
  poki: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js',
};

const portalSdk = (mode: string): Plugin => ({
  name: 'portal-sdk',
  transformIndexHtml: () => (SDK[mode] ? [{ tag: 'script', attrs: { src: SDK[mode] }, injectTo: 'head-prepend' }] : []),
});

const FLAVOURS = [...Object.keys(SDK), 'app'];

export default defineConfig(({ mode }) => ({
  base: './',
  define: { __PLATFORM__: JSON.stringify(FLAVOURS.includes(mode) ? mode : 'local') },
  plugins: [portalSdk(mode)],
  build: {
    outDir: FLAVOURS.includes(mode) ? `dist-${mode}` : 'dist',
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { manualChunks: (id: string) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) } },
  },
  test: { include: ['tests/**/*.test.ts'], exclude: ['tests/tune.test.ts'] },
}));
