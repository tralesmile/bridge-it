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
  await click(640, 590);
  check(still === true, `${name}: settings switch saves (reducedMotion ${still})`);
  // Music is the fourth row (y = 265 + 240). Turn it off and on again.
  await click(1180, 60);
  await click(810, 505);
  const music = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}').settings?.music);
  await click(810, 505);
  await click(640, 590);
  check(music === false, `${name}: music switch saves (music ${music})`);

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
  const cheaper = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').lastCheaper);
  check(Number.isInteger(cheaper) && cheaper >= 1 && cheaper <= 99, `${name}: win panel shows "cheaper than X% of players" (${cheaper})`);
  await page.screenshot({ path: `${OUT}/${name}-5-result.png` });

  // Stress Test from the win panel: same bridge, the truck; nothing is saved.
  const before = await page.evaluate(() => localStorage.getItem('bridgeit.save'));
  await click(780, 585);
  const stressOn = await page.evaluate(() => { const p = globalThis.__bridgeit.scene.getScene('play'); return p.stress && p.level.vehicle; });
  check(stressOn === 'truck', `${name}: Stress test button opens level 1 with the truck (${stressOn})`);
  await sleep(400);
  await click(1160, 664);
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').mode === 'result', null, { timeout: 30000 }).catch(() => {});
  await sleep(1000);
  await page.screenshot({ path: `${OUT}/${name}-5b-stress-result.png` });
  const after = await page.evaluate(() => localStorage.getItem('bridgeit.save'));
  // Only the "held" mark may change (when the truck crossed).
  const strip = (t) => { const o = JSON.parse(t || '{}'); delete o.held; delete o.achievements; return JSON.stringify(o); };
  check(strip(before) === strip(after), `${name}: a stress test changes nothing in the save but the held mark`);
  const held = await page.evaluate(() => { const p = globalThis.__bridgeit.scene.getScene('play'); return { held: JSON.parse(localStorage.getItem('bridgeit.save')).held, ok: p.lastStressWon }; });
  check(held.held.includes('w1-1') === held.ok, `${name}: held mark saved only when the stress test held (${JSON.stringify(held)})`);
  await click(780, 450);
  const backFromStress = await page.evaluate(() => { const p = globalThis.__bridgeit.scene.getScene('play'); return `${p.stress} ${p.level.vehicle} ${p.mode}`; });
  check(backFromStress === 'false car build', `${name}: Back to level returns to the normal level (${backFromStress})`);

  // Level 3 with a bad bridge should fail, then the Fix it button returns to building.
  await page.evaluate(() => { globalThis.__bridgeit.scene.start('play', { levelId: 'w1-3' }); });
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
  // Bridge codes use an in-game dialog, not window.prompt (portals and app web views may block it).
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('blocked')) } }));
  const playBeams = () => page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').design.list.length);
  await page.evaluate(() => { void globalThis.__bridgeit.scene.getScene('play').copyCode(); });
  await sleep(300);
  const code = await page.locator('#code-dialog textarea').inputValue().catch(() => '');
  check(code.startsWith('BI1.w1-3.'), `${name}: no clipboard shows the code in a dialog (${code})`);
  await page.click('#code-dialog button.ok');
  await page.evaluate(() => { const s = globalThis.__bridgeit.scene.getScene('play'); s.design.clear(); s.redraw(); });
  await click(215, 50);
  await page.keyboard.type('Z z ');
  const typedMode = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').mode);
  check(typedMode === 'build', `${name}: Space typed in the code box does not start the attempt (${typedMode})`);
  await page.locator('#code-dialog textarea').fill(code);
  await page.screenshot({ path: `${OUT}/${name}-6b-paste-code.png` });
  await page.keyboard.press('Enter');
  await sleep(300);
  const pasted = await playBeams();
  const dialogGone = (await page.locator('#code-dialog').count()) === 0;
  check(pasted === 2 && dialogGone, `${name}: Paste code loads the bridge (${pasted} beams, dialog closed ${dialogGone})`);
  await click(215, 50);
  await page.locator('#code-dialog textarea').fill('BI1.nope');
  await page.click('#code-dialog button.ok');
  await sleep(300);
  check((await playBeams()) === 2, `${name}: a bad code keeps the bridge`);
  // Level 9 has an uneven cliff and a wide gap: look at it with the hint on.
  await page.evaluate(() => { globalThis.__bridgeit.scene.start('play', { levelId: 'w1-9' }); });
  await sleep(600);
  await page.evaluate(() => { const s = globalThis.__bridgeit.scene.getScene('play'); s.showHint = true; s.drawHint(); });
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${name}-7-wide-level.png` });
  // World 2 uses rope hangers from high anchors.
  await page.evaluate(() => { globalThis.__bridgeit.scene.start('play', { levelId: 'w2-3' }); });
  await sleep(600);
  await page.evaluate(() => { const s = globalThis.__bridgeit.scene.getScene('play'); s.showHint = true; s.drawHint(); });
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${name}-8-rope-level.png` });
  // A 32 m gap: the play scene zooms out to fit it.
  await page.evaluate(() => { globalThis.__bridgeit.scene.start('play', { levelId: 'w2-10' }); });
  await sleep(600);
  await page.evaluate(() => { const s = globalThis.__bridgeit.scene.getScene('play'); s.showHint = true; s.drawHint(); });
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${name}-9-zoomed-level.png` });
  // The train level (long vehicle).
  await page.evaluate(() => { globalThis.__bridgeit.scene.start('play', { levelId: 'w2-14' }); });
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
  // World 4 River Town: drawbridges over ship lanes, with the hint shown, and one leaf swinging down.
  // Lock Gate (w4-3) stays last: the swing and win check below run on it.
  const river = ['drawbridge', 'twin-leaves', 'lock-gate', 'heavy-leaf', 'market-canal', 'ferry-road', 'mill-wharf', 'toll-bridge', 'rope-market', 'ferry-train', 'long-wharf', 'harbour-mast', 'two-canals', 'grain-barges', 'river-finale']
    .map((n, i) => [`w4-${i + 1}`, `9w4-${String(i + 1).padStart(2, '0')}-${n}`])
    .sort((a, b) => (a[0] === 'w4-3') - (b[0] === 'w4-3'));
  for (const [id, shot] of river) {
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
  await page.screenshot({ path: `${OUT}/${name}-9w4-03b-leaf-swinging.png` });
  const boatAlpha = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').boats.map((b) => b.g.alpha));
  check(boatAlpha.length === 1 && boatAlpha[0] < 0.9, `${name}: the boat sails away when the attempt starts (alpha ${boatAlpha})`);
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').mode === 'result', null, { timeout: 20000 }).catch(() => {});
  const lockWon = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').sim?.status);
  check(lockWon === 'won', `${name}: the Lock Gate drawbridge solution wins in the game (got ${lockWon})`);
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('play').scene.start('levels', { world: 3 }); });
  await sleep(600);
  check(await active('levels'), `${name}: world 3 level select opens`);
  await page.screenshot({ path: `${OUT}/${name}-9w3-levels.png` });
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('levels').scene.start('levels', { world: 4 }); });
  await sleep(600);
  check(await active('levels'), `${name}: world 4 level select opens`);
  await page.screenshot({ path: `${OUT}/${name}-9w4-levels.png` });
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('levels').scene.start('worlds'); });
  await sleep(600);
  check(await active('worlds') && !(await active('levels')), `${name}: world select opens with 5 cards`);
  await page.screenshot({ path: `${OUT}/${name}-9z-worlds.png` });
  // Every world open: shows the themed cards with their pictures.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}');
    s.stars = s.stars || {};
    for (let w = 1; w <= 4; w++) for (let i = 1; i <= 15; i++) s.stars[`w${w}-${i}`] = s.stars[`w${w}-${i}`] || 1;
    localStorage.setItem('bridgeit.save', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForFunction(() => globalThis.__bridgeit?.scene?.isActive('menu'), null, { timeout: 15000 });
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('menu').scene.start('worlds'); });
  await sleep(600);
  check(await active('worlds'), `${name}: world select with every world open`);
  await page.screenshot({ path: `${OUT}/${name}-9z-worlds-open.png` });

  // Daily Bridge: opens from world select, the stored solution wins, the streak and coins are saved.
  await click(1130, 60);
  const dailyId = await page.evaluate(() => globalThis.__bridgeit.scene.isActive('play') && globalThis.__bridgeit.scene.getScene('play').level.id);
  check(typeof dailyId === 'string' && /^daily-\d{4}-\d{2}-\d{2}$/.test(dailyId), `${name}: Daily Bridge button opens today's level (${dailyId})`);
  const coinsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}').coins ?? 0);
  await page.evaluate(() => {
    const p = globalThis.__bridgeit.scene.getScene('play');
    const pt = (k) => { const [x, y] = k.split(',').map(Number); return { x, y }; };
    for (const b of p.level.solution) p.design.add(pt(b.a), pt(b.b), b.material);
    p.redraw();
  });
  await page.screenshot({ path: `${OUT}/${name}-9d-daily.png` });
  await click(1160, 662);
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').mode === 'result', null, { timeout: 30000 }).catch(() => {});
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/${name}-9d-daily-win.png` });
  const daily = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}'));
  check(daily.daily?.streak === 1 && daily.coins === coinsBefore + 20 && !Object.keys(daily.stars || {}).some((k) => k.startsWith('daily-')),
    `${name}: daily win saves the streak and 20 coins, not world stars (${JSON.stringify(daily.daily)}, coins ${coinsBefore} -> ${daily.coins})`);

  // Daily calendar: 📅 on world select; an old day can be played but gives no coins and keeps the streak.
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('play').scene.start('worlds'); });
  await sleep(500);
  await click(968, 60);
  check(await active('daily'), `${name}: 📅 button opens the daily calendar`);
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${name}-9d-calendar.png` });
  await click(196, 245);
  const pastId = await page.evaluate(() => globalThis.__bridgeit.scene.isActive('play') && globalThis.__bridgeit.scene.getScene('play').level.id);
  check(typeof pastId === 'string' && pastId !== dailyId && pastId.startsWith('daily-'), `${name}: a calendar day opens its own level (${pastId})`);
  await page.evaluate(() => {
    const p = globalThis.__bridgeit.scene.getScene('play');
    const pt = (k) => { const [x, y] = k.split(',').map(Number); return { x, y }; };
    for (const b of p.level.solution) p.design.add(pt(b.a), pt(b.b), b.material);
    p.redraw();
  });
  await click(1160, 662);
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').mode === 'result', null, { timeout: 30000 }).catch(() => {});
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/${name}-9d-past-win.png` });
  const past = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}'));
  check(past.coins === daily.coins && past.daily.streak === 1 && past.daily.last === daily.daily.last && past.daily.played.includes(pastId.slice(6)),
    `${name}: an old day gets a tick, no coins, same streak (${JSON.stringify(past.daily)}, coins ${past.coins})`);
  // The level select shows the stress test badge on level 1 (held earlier).
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('play').scene.start('levels', { world: 1 }); });
  await sleep(500);
  await page.screenshot({ path: `${OUT}/${name}-9d-levels-held.png` });

  // Shop: with 160 coins, buy the Sky paint, Brick road and Birch beams (second cards), check the save, then see them in a level.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}');
    s.coins = 160;
    s.owned = [];
    s.equipped = { paint: 'paint-classic', deck: 'deck-classic' }; // an old save with no beam skin
    localStorage.setItem('bridgeit.save', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForFunction(() => globalThis.__bridgeit?.scene?.isActive('menu'), null, { timeout: 15000 });
  await sleep(300);
  await click(100, 60);
  check(await active('shop'), `${name}: Shop button opens the shop`);
  await page.screenshot({ path: `${OUT}/${name}-9s-shop.png` });
  await click(265, 256); // Sky paint, 40 coins
  await click(258, 445); // Brick road, 60 coins
  await click(490, 634); // Birch beams, 60 coins
  await click(406, 445); // Forest road, 80 coins: too expensive now
  const bought = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}'));
  check(bought.coins === 0 && bought.owned?.join() === 'paint-sky,deck-brick,frame-birch' && bought.equipped?.paint === 'paint-sky' && bought.equipped?.deck === 'deck-brick' && bought.equipped?.frame === 'frame-birch',
    `${name}: buying saves coins, items and what is in use (${JSON.stringify({ c: bought.coins, o: bought.owned, e: bought.equipped })})`);
  await page.screenshot({ path: `${OUT}/${name}-9s-shop-bought.png` });
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('shop').scene.start('play', { levelId: 'w1-3' }); });
  await sleep(700);
  const tex = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').chassisSprite.texture.key);
  check(tex === 'car-paint-sky', `${name}: the level uses the bought paint (${tex})`);
  const woodTool = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').beamStyle('wood').color);
  check(woodTool === '#d2a866', `${name}: the level uses the bought beam skin (${woodTool})`);
  await page.screenshot({ path: `${OUT}/${name}-9s-painted-car.png` });
  // Car shapes: with 120 more coins buy the Ice Cream van (third card of the middle row's right group); the car level uses it with the paint on.
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}'); s.coins = 120; localStorage.setItem('bridgeit.save', JSON.stringify(s)); });
  await page.reload();
  await page.waitForFunction(() => globalThis.__bridgeit?.scene?.isActive('menu'), null, { timeout: 15000 });
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('menu').scene.start('shop'); });
  await sleep(500);
  await click(1170, 445); // Ice Cream, 120 coins
  const van = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}'));
  check(van.coins === 0 && van.equipped?.ride === 'ride-icecream' && van.owned?.includes('ride-icecream'), `${name}: buying a car shape saves it (${JSON.stringify({ c: van.coins, e: van.equipped })})`);
  await page.screenshot({ path: `${OUT}/${name}-9s-shop-van.png` });
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('shop').scene.start('play', { levelId: 'w1-3' }); });
  await sleep(700);
  const vanTex = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').chassisSprite.texture.key);
  check(vanTex === 'icecream-paint-sky', `${name}: the car level uses the bought shape with its paint (${vanTex})`);
  await page.screenshot({ path: `${OUT}/${name}-9s-van.png` });
  // Supporter paint: hidden on the web until owned; a save with the Supporter pack shows it as a 9th paint card and can use it.
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}'); s.purchases = { noAds: true, supporter: true, supporterCoins: true }; localStorage.setItem('bridgeit.save', JSON.stringify(s)); });
  await page.reload();
  await page.waitForFunction(() => globalThis.__bridgeit?.scene?.isActive('menu'), null, { timeout: 15000 });
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('menu').scene.start('shop'); });
  await sleep(500);
  await click(1176, 256); // Rose Gold, 9th paint card
  const rose = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}'));
  check(rose.equipped?.paint === 'paint-rosegold' && rose.owned?.includes('paint-rosegold'), `${name}: supporter paint is owned and can be used (${rose.equipped?.paint})`);
  await page.screenshot({ path: `${OUT}/${name}-9s-shop-supporter.png` });
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}'); s.equipped.paint = 'paint-sky'; delete s.purchases; localStorage.setItem('bridgeit.save', JSON.stringify(s)); });
  await page.reload();
  await page.waitForFunction(() => globalThis.__bridgeit?.scene?.isActive('menu'), null, { timeout: 15000 });

  // Achievements: earlier wins and the purchase are saved; the Trophies screen lists them.
  const ach = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}').achievements || []);
  check(ach.includes('first-win') && ach.includes('shop') && ach.includes('world-1'), `${name}: achievements saved (${ach.join(',')})`);
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('play').scene.start('menu'); });
  await sleep(500);
  await click(270, 60);
  check(await active('trophies'), `${name}: Trophies button opens the achievements list`);
  await page.screenshot({ path: `${OUT}/${name}-9t-trophies.png` });

  // Stats screen from the menu: the attempts and levels done match the save.
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('trophies').scene.start('menu'); });
  await sleep(500);
  await click(445, 60);
  check(await active('stats'), `${name}: Stats button opens the stats screen`);
  const statTexts = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('stats').children.list.filter((o) => o.type === 'Text').map((o) => o.text));
  const attempts = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}').stats?.attempts ?? -1);
  check(statTexts.includes('Attempts (GO)') && statTexts.includes(String(attempts)) && !statTexts.some((t) => /NaN|undefined/.test(t)),
    `${name}: stats screen lists ${attempts} attempts`);
  await page.screenshot({ path: `${OUT}/${name}-9u-stats.png` });
  // Escape (and the Android back button) goes back one step: windows close first.
  await page.keyboard.press('Escape'); await sleep(300);
  check(await active('menu'), `${name}: Escape on the stats screen goes back to the menu`);
  await click(1180, 60);
  await page.keyboard.press('Escape'); await sleep(300);
  await click(640, 430);
  check(await active('worlds'), `${name}: Escape closes the settings window`);
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('worlds').scene.start('play', { levelId: 'w1-2' }); });
  await sleep(500);
  await page.keyboard.press('Escape'); await sleep(400);
  check(await active('levels'), `${name}: Escape in a level goes back to level select`);

  // Sandbox: menu button, setup screen, every material, a saved bridge crosses, nothing is scored.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}');
    const beams = [];
    for (let x = 0; x < 6; x++) beams.push({ a: `${x},0`, b: `${x + 1},0`, material: 'road' });
    for (const [a, b] of [['0,0', '1,1'], ['1,1', '2,0'], ['2,0', '3,1'], ['3,1', '4,0'], ['4,0', '5,1'], ['5,1', '6,0'], ['1,1', '3,1'], ['3,1', '5,1']]) beams.push({ a, b, material: 'wood' });
    s.designs = { ...(s.designs || {}), 'sandbox-6-car-flat-none': beams };
    localStorage.setItem('bridgeit.save', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForFunction(() => globalThis.__bridgeit?.scene?.isActive('menu'), null, { timeout: 15000 });
  await sleep(300);
  await click(625, 60);
  check(await active('sandbox'), `${name}: Sandbox button opens the sandbox setup`);
  await click(420, 195); // 6 m
  await click(420, 275); // car
  await click(420, 355); // same height
  await click(420, 435); // no helpers
  await page.screenshot({ path: `${OUT}/${name}-9v-sandbox-setup.png` });
  await click(1020, 600); // Build
  await sleep(600);
  const sb = await page.evaluate(() => { const p = globalThis.__bridgeit.scene.getScene('play'); return { id: p.level.id, tools: p.toolButtons.size, beams: p.design.list.length }; });
  check(sb.id === 'sandbox-6-car-flat-none' && sb.tools === 7 && sb.beams === 14, `${name}: sandbox level opens with every material and the saved bridge (${JSON.stringify(sb)})`);
  await page.screenshot({ path: `${OUT}/${name}-9v-sandbox-build.png` });
  const sbBefore = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}'); return JSON.stringify([s.coins, s.stats, s.fails, s.stars, s.achievements]); });
  await click(1160, 664); // GO
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').lastSandboxWon !== null, null, { timeout: 30000 });
  await sleep(600);
  const sbWon = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').lastSandboxWon);
  const sbAfter = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}'); return JSON.stringify([s.coins, s.stats, s.fails, s.stars, s.achievements]); });
  check(sbWon === true && sbBefore === sbAfter, `${name}: the sandbox truss crosses and nothing is scored (won ${sbWon}, save same ${sbBefore === sbAfter})`);
  await page.screenshot({ path: `${OUT}/${name}-9v-sandbox-won.png` });
  await click(780, 430); // New setup
  check(await active('sandbox'), `${name}: New setup goes back to the sandbox setup`);
  await page.keyboard.press('Escape'); await sleep(300);
  check(await active('menu'), `${name}: Escape on the sandbox setup goes back to the menu`);
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
