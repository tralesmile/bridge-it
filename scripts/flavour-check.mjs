// Checks the build flavours: the plain build loads no external script, and each portal build
// loads only its own SDK, and none of them carries the AdMob or RevenueCat code (app build only). Run after `npm run build`, `npm run build:crazygames` and `npm run build:poki`.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
const REVENUECAT_MARK = 'configure Purchases before';

const EXPECT = {
  dist: [],
  'dist-crazygames': ['https://sdk.crazygames.com/crazygames-sdk-v3.js'],
  'dist-poki': ['https://game-cdn.poki.com/scripts/v2/poki-sdk.js'],
};
let bad = 0;
for (const [dir, want] of Object.entries(EXPECT)) {
  const file = `${dir}/index.html`;
  if (!existsSync(file)) {
    console.log(`SKIP ${dir}: not built`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  const external = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  const ok = external.length === want.length && want.every((u) => external.includes(u));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${dir}: external ${JSON.stringify(external)}`);
  if (!ok) bad++;
  // AdMob belongs only in the app build (dist-app); web and portal builds must not carry its code.
  const js = readdirSync(`${dir}/assets`).filter((f) => f.endsWith('.js')).map((f) => readFileSync(`${dir}/assets/${f}`, 'utf8'));
  const admob = js.some((code) => code.includes('AdMob'));
  console.log(`${admob ? 'FAIL' : 'PASS'} ${dir}: no AdMob code`);
  if (admob) bad++;
  // Same for the RevenueCat purchases plugin (this text is only in the plugin code).
  const revenuecat = js.some((code) => code.includes(REVENUECAT_MARK));
  console.log(`${revenuecat ? 'FAIL' : 'PASS'} ${dir}: no RevenueCat code`);
  if (revenuecat) bad++;
}
process.exit(bad ? 1 : 0);
