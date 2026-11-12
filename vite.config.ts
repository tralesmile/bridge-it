import { defineConfig, type Plugin } from 'vite';

/**
 * Build flavours: `vite build --mode crazygames` or `--mode poki` (npm run build:crazygames / build:poki).
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

export default defineConfig(({ mode }) => ({
  base: './',
  define: { __PLATFORM__: JSON.stringify(SDK[mode] ? mode : 'local') },
  plugins: [portalSdk(mode)],
  build: {
    outDir: SDK[mode] ? `dist-${mode}` : 'dist',
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { manualChunks: (id: string) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) } },
  },
  test: { include: ['tests/**/*.test.ts'], exclude: ['tests/tune.test.ts'] },
}));
