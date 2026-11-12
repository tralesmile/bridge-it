// Checks the build flavours: the plain build loads no external script, and each portal build
// loads only its own SDK. Run after `npm run build`, `npm run build:crazygames` and `npm run build:poki`.
import { existsSync, readFileSync } from 'node:fs';

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
}
process.exit(bad ? 1 : 0);
