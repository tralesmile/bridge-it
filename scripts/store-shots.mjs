// Store screenshot generator: renders clean 16:9 shots from the real game (needs a build first).
// Usage: npm run build && npm run shots   -> store-shots/<size>/<nn>-<name>.png
// Sizes: phone (1920x1080, Google Play / App Store landscape) and tablet (2560x1440).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 4181;
const OUT = 'store-shots';
const SIZES = { phone: { width: 1920, height: 1080 }, tablet: { width: 2560, height: 1440 } };
// [file name, level id, state] ; state: 'edit' (empty), 'built' (solution drawn), 'swing' (mid attempt), 'win' (result panel)
const SHOTS = [
  ['01-build', 'w1-5', 'built'],
  ['02-test', 'w1-7', 'swing'],
  ['03-win', 'w1-3', 'win'],
  ['04-ropes', 'w2-4', 'built'],
  ['05-ocean', 'w3-5', 'swing'],
  ['06-drawbridge', 'w4-2', 'swing'],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await sleep(2500);
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let bad = 0;
try {
  for (const [size, viewport] of Object.entries(SIZES)) {
    mkdirSync(`${OUT}/${size}`, { recursive: true });
    const page = await browser.newPage({ viewport });
    page.on('pageerror', (e) => { bad++; console.log('ERROR', e.message); });
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForFunction(() => globalThis.__bridgeit?.scene?.isActive('menu'), null, { timeout: 15000 });
    await sleep(800);
    await page.screenshot({ path: `${OUT}/${size}/00-menu.png` });
    await page.evaluate(() => globalThis.__bridgeit.scene.start('worlds'));
    await sleep(700);
    await page.screenshot({ path: `${OUT}/${size}/07-worlds.png` });
    for (const [file, id, state] of SHOTS) {
      await page.evaluate((lid) => globalThis.__bridgeit.scene.start('play', { levelId: lid }), id);
      await sleep(700);
      if (state !== 'edit') {
        await page.evaluate(() => {
          const p = globalThis.__bridgeit.scene.getScene('play');
          p.design = p.design.constructor.restore(p.level, p.level.solution);
          p.redraw?.();
        });
      }
      if (state === 'swing' || state === 'win') {
        await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('play').startSim(); });
        if (state === 'swing') await sleep(2600);
        else {
          await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').mode === 'result', null, { timeout: 30000 }).catch(() => {});
          await sleep(4500); // the achievement banner is gone by now
        }
      } else await sleep(300);
      await page.screenshot({ path: `${OUT}/${size}/${file}.png` });
      console.log('shot', size, file, id);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(bad ? `FAIL: ${bad} page errors` : 'OK: store shots in ' + OUT);
process.exit(bad ? 1 : 0);
