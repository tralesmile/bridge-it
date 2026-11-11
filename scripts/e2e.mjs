// End-to-end smoke test: builds a bridge by mouse in a real browser and checks the game reacts.
// Usage: npm run build && node scripts/e2e.mjs   (uses installed Google Chrome)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 4179;
const OUT = 'e2e-shots';
mkdirSync(OUT, { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);

const errors = [];
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); console.log(cond ? 'PASS' : 'FAIL', msg); };

async function run(viewport, name) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name} console: ${m.text()}`); });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => globalThis.__bridgeit?.scene?.isActive('menu'), null, { timeout: 15000 });
  // Map game coordinates (1280x720) to page pixels.
  const box = await page.locator('canvas').boundingBox();
  const at = (x, y) => ({ x: box.x + (x / 1280) * box.width, y: box.y + (y / 720) * box.height });
  const click = async (x, y) => { const p = at(x, y); await page.mouse.click(p.x, p.y); await sleep(250); };
  const drag = async (x1, y1, x2, y2) => {
    const a = at(x1, y1), b = at(x2, y2);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
    await page.mouse.up(); await sleep(150);
  };
  const active = (key) => page.evaluate((k) => globalThis.__bridgeit.scene.isActive(k), key);
  await page.screenshot({ path: `${OUT}/${name}-1-menu.png` });

  // Settings: open, turn "Less motion" on, close, check it is saved.
  await click(1180, 60);
  await page.screenshot({ path: `${OUT}/${name}-1b-settings.png` });
  await click(810, 425); // Less motion is the third row (y = 360 - 95 + 160)
  const still = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}').settings?.reducedMotion);
  await click(810, 425); // switch back
  await click(640, 550);
  check(still === true, `${name}: settings switch saves (reducedMotion ${still})`);

  await click(640, 430);
  check(await active('worlds'), `${name}: PLAY opens world select`);
  await page.screenshot({ path: `${OUT}/${name}-1c-worlds.png` });
  await click(280, 350);
  check(await active('levels'), `${name}: world 1 opens level select`);
  await page.screenshot({ path: `${OUT}/${name}-2-levels.png` });

  await click(310, 280);
  check(await active('play'), `${name}: level 1 opens`);
  await sleep(400);
  // Level 1: gap 0..2, origin x = 640 - 48 = 592, ground y = 390.
  await drag(592, 390, 688, 390);
  const beams = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').design.list.length);
  check(beams === 1, `${name}: dragging builds one road beam (got ${beams})`);
  await page.screenshot({ path: `${OUT}/${name}-3-built.png` });

  await click(1160, 664);
  await sleep(1200);
  await page.screenshot({ path: `${OUT}/${name}-4-driving.png` });
  // Hiding the app during a drive pauses with a Continue card.
  await page.evaluate(() => globalThis.__bridgeit.events.emit('hidden'));
  await sleep(200);
  const paused = await page.evaluate(() => !!globalThis.__bridgeit.scene.getScene('play').pauseLayer);
  check(paused, `${name}: hiding the app pauses the drive`);
  await page.screenshot({ path: `${OUT}/${name}-4b-paused.png` });
  await click(640, 410);
  const resumed = await page.evaluate(() => !globalThis.__bridgeit.scene.getScene('play').pauseLayer);
  check(resumed, `${name}: Continue resumes the drive`);
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').mode === 'result', null, { timeout: 20000 }).catch(() => {});
  await sleep(1200);
  const stars = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}').stars?.['w1-1'] ?? 0);
  check(stars >= 1, `${name}: crossing level 1 earns stars (got ${stars})`);
  await page.screenshot({ path: `${OUT}/${name}-5-result.png` });

  // Level 3 with a bad bridge should fail, then the Fix it button returns to building.
  await page.evaluate(() => globalThis.__bridgeit.scene.start('play', { levelId: 'w1-3' }));
  await sleep(600);
  await drag(592 - 48, 390, 592 + 48, 390);
  await drag(592 + 48, 390, 592 + 144, 390);
  await click(1160, 664);
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').mode === 'result', null, { timeout: 20000 }).catch(() => {});
  await sleep(1000);
  await page.screenshot({ path: `${OUT}/${name}-6-fail.png` });
  const mode = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').mode);
  check(mode === 'result', `${name}: an unsupported long road fails (mode ${mode})`);
  await click(640, 440);
  const back = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').mode);
  check(back === 'build', `${name}: Fix it returns to building (mode ${back})`);
  // Level 9 has an uneven cliff and a wide gap: look at it with the hint on.
  await page.evaluate(() => globalThis.__bridgeit.scene.start('play', { levelId: 'w1-9' }));
  await sleep(600);
  await page.evaluate(() => { const s = globalThis.__bridgeit.scene.getScene('play'); s.showHint = true; s.drawHint(); });
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${name}-7-wide-level.png` });
  // World 2 uses rope hangers from high anchors.
  await page.evaluate(() => globalThis.__bridgeit.scene.start('play', { levelId: 'w2-3' }));
  await sleep(600);
  await page.evaluate(() => { const s = globalThis.__bridgeit.scene.getScene('play'); s.showHint = true; s.drawHint(); });
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${name}-8-rope-level.png` });
  // A 32 m gap: the play scene zooms out to fit it.
  await page.evaluate(() => globalThis.__bridgeit.scene.start('play', { levelId: 'w2-10' }));
  await sleep(600);
  await page.evaluate(() => { const s = globalThis.__bridgeit.scene.getScene('play'); s.showHint = true; s.drawHint(); });
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${name}-9-zoomed-level.png` });
  // The train level (long vehicle).
  await page.evaluate(() => globalThis.__bridgeit.scene.start('play', { levelId: 'w2-14' }));
  await sleep(600);
  await page.screenshot({ path: `${OUT}/${name}-9b-train-level.png` });
  // World 3 Pirate Bay levels (opened by id), each with its hint shown.
  const names = ['low-dock', 'ramp-foot', 'plank-walk', 'crows-nest', 'gangplank', 'tide-pools', 'rum-barrels', 'shipwreck', 'treasure-island', 'rope-ladder', 'cannon-cart', 'cargo-hold', 'one-mast', 'deep-water', 'pirate-finale'];
  const pirate = names.map((n, i) => [`w3-${i + 1}`, `9w3-${String(i + 1).padStart(2, '0')}-${n}`]);
  for (const [id, shot] of pirate) {
    await page.evaluate((lid) => globalThis.__bridgeit.scene.start('play', { levelId: lid }), id);
    await sleep(600);
    await page.evaluate(() => { const s = globalThis.__bridgeit.scene.getScene('play'); s.showHint = true; s.drawHint(); });
    await sleep(300);
    await page.screenshot({ path: `${OUT}/${name}-${shot}.png` });
  }
  // Draft World 4 River Town: drawbridges over ship lanes, with the hint shown, and one leaf swinging down.
  for (const [id, shot] of [['w4-1', '9w4-01-drawbridge'], ['w4-2', '9w4-02-twin-leaves'], ['w4-4', '9w4-05-heavy-leaf'], ['w4-5', '9w4-06-market-canal'], ['w4-6', '9w4-07-ferry-road'], ['w4-7', '9w4-08-mill-wharf'], ['w4-3', '9w4-03-lock-gate']]) {
    await page.evaluate((lid) => globalThis.__bridgeit.scene.start('play', { levelId: lid }), id);
    await sleep(600);
    await page.evaluate(() => { const s = globalThis.__bridgeit.scene.getScene('play'); s.showHint = true; s.drawHint(); });
    await sleep(300);
    await page.screenshot({ path: `${OUT}/${name}-${shot}.png` });
  }
  await page.evaluate(() => {
    const s = globalThis.__bridgeit.scene.getScene('play');
    s.design = s.design.constructor.restore(s.level, s.level.solution);
    s.startSim();
  });
  await sleep(900);
  await page.screenshot({ path: `${OUT}/${name}-9w4-04-leaf-swinging.png` });
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').mode === 'result', null, { timeout: 20000 }).catch(() => {});
  const lockWon = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').sim?.status);
  check(lockWon === 'won', `${name}: the Lock Gate drawbridge solution wins in the game (got ${lockWon})`);
  await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').scene.start('levels', { world: 3 }));
  await sleep(600);
  check(await active('levels'), `${name}: world 3 level select opens`);
  await page.screenshot({ path: `${OUT}/${name}-9w3-levels.png` });
  await page.close();
}

try {
  await run({ width: 1280, height: 720 }, 'desktop');
  await run({ width: 844, height: 390 }, 'phone');
  // Upright phone shows the rotate card; wide screens do not.
  for (const [vp, want, nm] of [[{ width: 390, height: 844 }, 'flex', 'portrait phone'], [{ width: 844, height: 390 }, 'none', 'landscape phone']]) {
    const p = await browser.newPage({ viewport: vp });
    await p.goto(`http://localhost:${PORT}/`);
    const shown = await p.evaluate(() => getComputedStyle(document.getElementById('rotate')).display);
    check(shown === want, `${nm}: rotate card display is ${want} (got ${shown})`);
    if (want === 'flex') await p.screenshot({ path: `${OUT}/portrait-rotate.png` });
    await p.close();
  }
} finally {
  await browser.close();
  server.kill();
}
check(errors.length === 0, `no page errors ${errors.length ? JSON.stringify(errors.slice(0, 5)) : ''}`);
process.exit(failures.length ? 1 : 0);
