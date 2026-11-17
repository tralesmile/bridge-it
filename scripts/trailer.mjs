// Trailer clip recorder: records short gameplay clips (webm) from the real game (needs a build first).
// Usage: npm run build && npm run trailer   -> trailer-clips/<nn>-<name>.webm (git-ignored)
// Each clip: open a level, build the stored solution piece by piece, press GO, let the vehicle cross.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';

const PORT = 4182;
const OUT = 'trailer-clips';
const TMP = `${OUT}/.tmp`;
const SIZE = { width: 1280, height: 720 };
// [clip name, level id]
const CLIPS = [
  ['01-farm', 'w1-5'],
  ['02-truck', 'w1-7'],
  ['03-ropes', 'w2-4'],
  ['04-ocean', 'w3-5'],
  ['05-drawbridge', 'w4-2'],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
rmSync(OUT, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await sleep(2500);
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let bad = 0;
try {
  for (const [name, id] of CLIPS) {
    const ctx = await browser.newContext({ viewport: SIZE, recordVideo: { dir: TMP, size: SIZE } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => { bad++; console.log('ERROR', e.message); });
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForFunction(() => globalThis.__bridgeit?.scene?.isActive('menu'), null, { timeout: 15000 });
    await sleep(600);
    await page.evaluate((lid) => globalThis.__bridgeit.scene.start('play', { levelId: lid }), id);
    await sleep(1200);
    // Build the stored solution one beam at a time (a short pause between beams makes it watchable).
    const count = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').level.solution.length);
    for (let n = 1; n <= count; n++) {
      await page.evaluate((k) => {
        const p = globalThis.__bridgeit.scene.getScene('play');
        p.design = p.design.constructor.restore(p.level, p.level.solution.slice(0, k));
        p.redraw?.();
      }, n);
      await sleep(260);
    }
    await sleep(500);
    await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('play').startSim(); });
    await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').mode === 'result', null, { timeout: 40000 }).catch(() => {});
    await sleep(2500);
    const video = page.video();
    await ctx.close(); // flushes the video file
    await video.saveAs(`${OUT}/${name}.webm`);
    console.log('clip', name, id, `${count} beams`);
  }
} finally {
  await browser.close();
  server.kill();
  rmSync(TMP, { recursive: true, force: true });
}
console.log(bad ? `FAIL: ${bad} page errors` : 'trailer clips done');
process.exit(bad ? 1 : 0);
