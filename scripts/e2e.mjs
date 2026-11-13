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
  await click(830, 360); // Less motion is the third row (y = 360 - 140 + 2 * 70)
  const still = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}').settings?.reducedMotion);
  await click(830, 360); // switch back
  await click(640, 590);
  check(still === true, `${name}: settings switch saves (reducedMotion ${still})`);
  // Music is the fourth row (y = 430). Turn it off and on again.
  await click(1180, 60);
  await click(830, 430);
  const music = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save') || '{}').settings?.music);
  await click(830, 430);
  await click(640, 590);
  check(music === false, `${name}: music switch saves (music ${music})`);
  // Language: the browser's English first; each tap on the language button picks the next one,
  // the menu restarts in it with Settings open again. 8 taps come back to English.
  const menuTexts = () => page.evaluate(() => {
    const out = [];
    const walk = (o) => { if (o.type === 'Text') out.push(o.text); (o.list ?? []).forEach(walk); };
    globalThis.__bridgeit.scene.getScene('menu').children.list.forEach(walk);
    return out;
  });
  const enTexts = await menuTexts();
  await click(1180, 60);
  const langs = [];
  for (let i = 0; i < 8; i++) {
    await click(810, 500);
    await sleep(250);
    const texts = await menuTexts();
    const lang = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save')).settings.lang);
    const open = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('menu').children.list.some((o) => o.depth === 50));
    langs.push({ lang, play: texts.find((t) => /^\p{Lu}+$/u.test(t) && t.length > 3) ?? '', open });
    if (name === 'desktop' && (lang === 'de' || lang === 'ru' || lang === 'mk')) await page.screenshot({ path: `${OUT}/${name}-1d-settings-${lang}.png` });
  }
  check(JSON.stringify(langs.map((l) => l.lang)) === '["de","es","pt","fr","tr","ru","mk","en"]' && langs[0].play === 'SPIELEN' && langs[6].play === 'ИГРАЈ' && langs[7].play === 'PLAY' && langs.every((l) => l.open),
    `${name}: the language button goes through 8 languages and the menu text follows (${JSON.stringify(langs)})`);
  check(enTexts.includes('PLAY') && enTexts.includes('Build it. Break it. Laugh. Try again.'), `${name}: the menu starts in English in an English browser`);
  await click(640, 590);
  await sleep(200);
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('menu').scene.start('trophies'); });
  await sleep(200);
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('trophies').scene.start('menu'); });
  await sleep(300);
  const reopened = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('menu').children.list.some((o) => o.depth === 50));
  check(!reopened, `${name}: going back to the menu later does not open Settings again`);

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
  const goShown = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').goButton.visible);
  check(back === 'build' && goShown, `${name}: Fix it returns to building with the GO button (mode ${back}, GO ${goShown})`);
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

  // World select, level select and the daily calendar follow the language (Russian here), then back to English.
  const sceneTexts = (key) => page.evaluate((k) => {
    const out = [];
    const walk = (o) => { if (o.type === 'Text') out.push(o.text); (o.list ?? []).forEach(walk); };
    globalThis.__bridgeit.scene.getScene(k).children.list.forEach(walk);
    return out;
  }, key);
  const setLang = async (lang) => {
    await page.evaluate((l) => {
      const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}');
      if (l) s.settings.lang = l; else delete s.settings.lang;
      localStorage.setItem('bridgeit.save', JSON.stringify(s));
    }, lang);
    await page.reload();
    await page.waitForFunction(() => globalThis.__bridgeit?.scene?.isActive('menu'), null, { timeout: 15000 });
  };
  await setLang('ru');
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('menu').scene.start('worlds'); });
  await sleep(500);
  const ruWorlds = await sceneTexts('worlds');
  if (name === 'desktop') await page.screenshot({ path: `${OUT}/${name}-9l-worlds-ru.png` });
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('worlds').scene.start('levels', { world: 2 }); });
  await sleep(400);
  const ruLevels = await sceneTexts('levels');
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('levels').scene.start('daily'); });
  await sleep(400);
  const ruDaily = await sceneTexts('daily');
  if (name === 'desktop') await page.screenshot({ path: `${OUT}/${name}-9l-daily-ru.png` });
  check(ruWorlds.includes('Выбери мир') && ruWorlds.includes('Ферма в\nдолине') && ruWorlds.includes('Скоро') && ruLevels.includes('Рельсы каньона') && ruLevels.includes('◀ Назад')
    && ruDaily.includes('Календарь') && ruDaily.some((t) => t.startsWith('Сегодня\n')),
    `${name}: world select, level select and calendar are in Russian (${JSON.stringify([ruWorlds.slice(0, 6), ruLevels.slice(0, 2), ruDaily.slice(0, 3)])})`);
  await setLang(null);

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
  const trOne = await page.evaluate(() => !globalThis.__bridgeit.scene.getScene('trophies').nextBtn);
  check(trOne, `${name}: all achievements fit one page, no page buttons`);
  // Pages: 12 cards a page to see the buttons (the real page holds 30).
  await page.evaluate(() => { globalThis.__bridgeit.scene.getScene('trophies').scene.restart({ perPage: 12 }); });
  await sleep(400);
  const trPage = () => page.evaluate(() => { const t = globalThis.__bridgeit.scene.getScene('trophies'); return { page: t.page, text: t.pageText?.text, cards: t.cards.list.filter((o) => o.type === 'Graphics').length }; });
  const tr0 = await trPage();
  await click(640 + 120, 670); // next page
  await sleep(300);
  const tr1 = await trPage();
  await page.keyboard.press('ArrowRight'); await sleep(300);
  await page.keyboard.press('ArrowRight'); await sleep(300);
  const tr2 = await trPage();
  await page.screenshot({ path: `${OUT}/${name}-9t-trophies-page3.png` });
  await click(640 - 120, 670); // previous page
  await sleep(300);
  const tr3 = await trPage();
  check(tr0.page === 0 && tr0.cards === 12 && tr0.text === 'Page 1 / 3' && tr1.page === 1 && tr2.page === 2 && tr2.cards === 5 && tr3.page === 1,
    `${name}: Trophies pages turn with the buttons and arrow keys and stop at the last page (${JSON.stringify([tr0, tr1, tr2, tr3])})`);

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
    // 4 other setups already crossed: this win is the 5th, which earns "Tinkerer".
    s.sandboxWins = ['sandbox-10-car-flat-none', 'sandbox-16-car-flat-none', 'sandbox-24-car-flat-none', 'sandbox-6-truck-flat-none'];
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
  const sbBefore = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}'); return JSON.stringify([s.coins, s.stats, s.fails, s.stars]); });
  await click(1160, 664); // GO
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').lastSandboxWon !== null, null, { timeout: 30000 });
  await sleep(600);
  const sbWon = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').lastSandboxWon);
  const sbAfter = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}'); return JSON.stringify([s.coins, s.stats, s.fails, s.stars]); });
  check(sbWon === true && sbBefore === sbAfter, `${name}: the sandbox truss crosses and nothing is scored (won ${sbWon}, save same ${sbBefore === sbAfter})`);
  const sbAch = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save') || '{}'); return { wins: s.sandboxWins.length, has: s.sandboxWins.includes('sandbox-6-car-flat-none'), tinkerer: s.achievements.includes('sandbox-5') }; });
  check(sbAch.wins === 5 && sbAch.has && sbAch.tinkerer, `${name}: the sandbox win is saved and the 5th setup earns Tinkerer (${JSON.stringify(sbAch)})`);
  await page.screenshot({ path: `${OUT}/${name}-9v-sandbox-won.png` });
  await click(780, 430); // New setup
  check(await active('sandbox'), `${name}: New setup goes back to the sandbox setup`);
  await page.keyboard.press('Escape'); await sleep(300);
  check(await active('menu'), `${name}: Escape on the sandbox setup goes back to the menu`);

  // Level editor: change the level, add a rock, test it, cross it, copy the level code, play it as a friend.
  await click(805, 60);
  check(await active('editor'), `${name}: Editor button opens the level editor`);
  await click(245, 140); await click(469, 140); // gap 8 -> 7 -> 8 m
  await click(469, 335); await click(469, 335); // money 4000 -> 5000
  const ev = await page.evaluate(() => { const v = globalThis.__bridgeit.scene.getScene('editor').view(); return { ppm: v.ppm, x0: v.x0, y0: v.y0 }; });
  await click(ev.x0 + (4 + 3) * ev.ppm, ev.y0 - (-2 + 6) * ev.ppm); // rock at (4, -2)
  await page.screenshot({ path: `${OUT}/${name}-9x-editor.png` });
  const draft = await page.evaluate(() => { const e = JSON.parse(localStorage.getItem('bridgeit.save')).editor; return e.levels[e.current]; });
  check(draft.draft.gap === 8 && draft.draft.budget === 5000 && JSON.stringify(draft.draft.anchors) === '[{"x":4,"y":-2}]' && draft.best === 0,
    `${name}: editor saves the draft (${JSON.stringify(draft)})`);
  const copyOff = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('editor').copyButton.alpha < 1);
  check(copyOff, `${name}: Copy level code is off until the level is crossed`);
  await click(1120, 640); // Test
  await sleep(600);
  check(await active('play'), `${name}: Test opens the level in the play scene`);
  await page.evaluate(() => {
    const p = globalThis.__bridgeit.scene.getScene('play');
    for (let x = 0; x < 8; x++) p.design.add({ x, y: 0 }, { x: x + 1, y: 0 }, 'road');
    for (let x = 0; x < 8; x += 2) { p.design.add({ x, y: 0 }, { x: x + 1, y: 1 }, 'wood'); p.design.add({ x: x + 1, y: 1 }, { x: x + 2, y: 0 }, 'wood'); }
    for (let x = 1; x < 7; x += 2) p.design.add({ x, y: 1 }, { x: x + 2, y: 1 }, 'wood');
    p.design.add({ x: 4, y: 0 }, { x: 4, y: -2 }, 'wood');
    p.afterChange();
  });
  await page.screenshot({ path: `${OUT}/${name}-9x-editor-test.png` });
  const edBefore = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save')); return JSON.stringify([s.coins, s.stats, s.stars]); });
  await click(1160, 664); // GO
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').lastSandboxWon !== null, null, { timeout: 30000 });
  await sleep(800);
  const edWon = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').lastSandboxWon);
  const edAfter = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save')); return { score: JSON.stringify([s.coins, s.stats, s.stars]), best: s.editor.levels[s.editor.current].best }; });
  check(edWon === true && edAfter.best > 0 && edAfter.score === edBefore, `${name}: your bridge crosses your level, its cost is kept and nothing is scored (won ${edWon}, best ${edAfter.best})`);
  await page.screenshot({ path: `${OUT}/${name}-9x-editor-won.png` });
  await click(780, 450); // Edit level
  check(await active('editor'), `${name}: Edit level goes back to the editor`);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('blocked')) } }));
  await click(860, 640); // Copy level code
  await sleep(300);
  const levelCode = await page.locator('#code-dialog textarea').inputValue().catch(() => '');
  check(levelCode.startsWith('BL1.'), `${name}: Copy level code gives a level code (${levelCode})`);
  await page.screenshot({ path: `${OUT}/${name}-9x-editor-code.png` });
  await page.click('#code-dialog button.ok');
  await click(640, 640); // Paste code
  await page.locator('#code-dialog textarea').fill('BL1.nope.abc');
  await page.click('#code-dialog button.ok');
  await sleep(300);
  check(await active('editor'), `${name}: a bad level code stays in the editor`);
  await click(640, 640);
  await page.locator('#code-dialog textarea').fill(levelCode);
  await page.click('#code-dialog button.ok');
  await sleep(700);
  const friend = await page.evaluate(() => { const p = globalThis.__bridgeit.scene.getScene('play'); return { on: globalThis.__bridgeit.scene.isActive('play'), id: p.level.id, gap: p.level.gapEnd, stars: p.level.starBudgets, beams: p.design.list.length }; });
  check(friend.on && friend.gap === 8 && friend.stars[1] === Math.ceil(edAfter.best / 50) * 50 && friend.beams === 0, `${name}: a level code opens the level for a friend (${JSON.stringify(friend)})`);
  await page.screenshot({ path: `${OUT}/${name}-9x-editor-friend.png` });
  await page.keyboard.press('Escape'); await sleep(300);
  check(await active('editor'), `${name}: Escape on a player level goes back to the editor`);

  // My levels: cross the friend's level, Edit a copy, new level, open, delete.
  await click(640, 640);
  await page.locator('#code-dialog textarea').fill(levelCode);
  await page.click('#code-dialog button.ok');
  await sleep(700);
  await page.evaluate(() => {
    const p = globalThis.__bridgeit.scene.getScene('play');
    for (let x = 0; x < 8; x++) p.design.add({ x, y: 0 }, { x: x + 1, y: 0 }, 'road');
    for (let x = 0; x < 8; x += 2) { p.design.add({ x, y: 0 }, { x: x + 1, y: 1 }, 'wood'); p.design.add({ x: x + 1, y: 1 }, { x: x + 2, y: 0 }, 'wood'); }
    for (let x = 1; x < 7; x += 2) p.design.add({ x, y: 1 }, { x: x + 2, y: 1 }, 'wood');
    p.design.add({ x: 4, y: 0 }, { x: 4, y: -2 }, 'wood');
    p.afterChange();
  });
  const mlBeams = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').design.list.length);
  await click(1160, 664); // GO
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').lastSandboxWon !== null, null, { timeout: 30000 });
  await sleep(800);
  await page.screenshot({ path: `${OUT}/${name}-9x-editor-friend-won.png` });
  const fsSave = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save')); return { list: s.friendStars, id: globalThis.__bridgeit.scene.getScene('play').level.id, ach: s.achievements }; });
  check(fsSave.ach.includes('maker') && fsSave.ach.includes('friend-level'), `${name}: Level Maker and Good Friend earned (${fsSave.ach.join(',')})`);
  check(fsSave.list.length === 1 && fsSave.list[0].id === fsSave.id && fsSave.list[0].stars >= 1, `${name}: a friend's level keeps its best stars (${JSON.stringify(fsSave.list.map((f) => f.stars))})`);
  await click(500, 450); // Build more
  await sleep(300);
  await click(1160, 664); // GO again: the panel now shows the best stars
  await page.waitForFunction(() => { const p = globalThis.__bridgeit.scene.getScene('play'); return p.mode === 'result' && !!p.resultLayer; }, null, { timeout: 30000 });
  await sleep(800);
  const fsText = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').resultLayer.list.filter((o) => o.type === 'Text').map((o) => o.text).join(' | '));
  check(fsText.includes('Your best:'), `${name}: a second win shows the best stars (${fsText})`);
  await click(640, 540); // Edit a copy
  await sleep(500);
  const mlCopy = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgeit.save'));
    const e = s.editor;
    return { n: e.levels.length, cur: e.current, best: e.levels[e.current].best, cost: e.levels[e.current].draft.authorCost, copyName: e.levels[e.current].draft.name };
  });
  const mlDesign = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bridgeit.save')); return Object.values(s.designs).map((d) => d.length); });
  check(await active('editor') && mlCopy.n === 2 && mlCopy.cur === 1 && mlCopy.best === 0 && mlCopy.cost === 0 && mlCopy.copyName.endsWith(' (copy)') && mlDesign.includes(mlBeams),
    `${name}: Edit a copy adds the friend's level to My levels with your bridge, not crossed yet (${JSON.stringify(mlCopy)}, ${JSON.stringify(mlDesign)})`);
  await click(330, 50); // My levels
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${name}-9x-editor-mylevels.png` });
  await click(500, 650); // + New level
  await sleep(300);
  const mlNew = await page.evaluate(() => { const e = JSON.parse(localStorage.getItem('bridgeit.save')).editor; return { n: e.levels.length, cur: e.current, name: e.levels[e.current].draft.name }; });
  check(mlNew.n === 3 && mlNew.cur === 2 && mlNew.name === 'My Level 2', `${name}: New level adds a level with its own name (${JSON.stringify(mlNew)})`);
  await click(330, 50);
  await sleep(300);
  await click(640 - 350 - 32, 160); // first level
  await sleep(300);
  const mlOpen = await page.evaluate(() => { const e = JSON.parse(localStorage.getItem('bridgeit.save')).editor; return { cur: e.current, best: e.levels[0].best, list: !!globalThis.__bridgeit.scene.getScene('editor').listLayer }; });
  check(mlOpen.cur === 0 && mlOpen.best > 0 && !mlOpen.list, `${name}: tapping a level opens it (${JSON.stringify(mlOpen)})`);
  await click(330, 50);
  await sleep(300);
  await click(640 + 350 + 135, 137); // bin of the 3rd level: first tap only asks
  await sleep(200);
  const mlAsk = await page.evaluate(() => JSON.parse(localStorage.getItem('bridgeit.save')).editor.levels.length);
  await click(640 + 350 + 135, 137);
  await sleep(300);
  const mlDel = await page.evaluate(() => { const e = JSON.parse(localStorage.getItem('bridgeit.save')).editor; return { n: e.levels.length, cur: e.current, list: !!globalThis.__bridgeit.scene.getScene('editor').listLayer }; });
  check(mlAsk === 3 && mlDel.n === 2 && mlDel.cur === 0 && mlDel.list, `${name}: the bin deletes a level on the second tap (${mlAsk}, ${JSON.stringify(mlDel)})`);
  // Share button on a card: copies a crossed level's code without opening it; off for a level not crossed.
  await page.evaluate(() => { globalThis.__copied = []; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { globalThis.__copied.push(t); return Promise.resolve(); } } }); });
  await click(640 - 350 + 135, 183); // share of level 1 (crossed)
  await sleep(300);
  await page.screenshot({ path: `${OUT}/${name}-9x-editor-share.png` });
  await click(640 + 135, 183); // share of level 2 (not crossed)
  await sleep(300);
  const mlShare = await page.evaluate(() => ({ copied: globalThis.__copied, cur: JSON.parse(localStorage.getItem('bridgeit.save')).editor.current, list: !!globalThis.__bridgeit.scene.getScene('editor').listLayer }));
  check(mlShare.copied.length === 1 && mlShare.copied[0] === levelCode && mlShare.cur === 0 && mlShare.list,
    `${name}: the share button copies a crossed level's code and keeps the list open; off when not crossed (${JSON.stringify(mlShare)})`);
  await page.keyboard.press('Escape'); await sleep(300);
  const mlClosed = await page.evaluate(() => !globalThis.__bridgeit.scene.getScene('editor').listLayer);
  check(await active('editor') && mlClosed, `${name}: Escape closes My levels`);

  // Ship lanes and the flag: a new 4 m level with a lane, a pier rock and the flag at 5 m; a drawbridge crosses it.
  await click(330, 50); // My levels
  await click(500, 650); // + New level
  for (let i = 0; i < 4; i++) await click(245, 140); // gap 8 -> 4
  await click(855, 578); // Ship lanes mode
  const lnView = await page.evaluate(() => { const v = globalThis.__bridgeit.scene.getScene('editor').view(); return { ppm: v.ppm, x0: v.x0, y0: v.y0 }; });
  const lnAt = (x, y) => click(lnView.x0 + (x + 3) * lnView.ppm, lnView.y0 - (y + 6) * lnView.ppm);
  await lnAt(2, 0); // lane 0..4
  await click(655, 578); // Rocks mode
  await lnAt(-1, 0); // the piston's rock
  await lnAt(2, -2); // in the lane: refused
  await click(469, 578); // flag 4 -> 5 m
  await page.screenshot({ path: `${OUT}/${name}-9x-editor-lane.png` });
  const lnDraft = await page.evaluate(() => { const e = JSON.parse(localStorage.getItem('bridgeit.save')).editor; return e.levels[e.current].draft; });
  check(JSON.stringify(lnDraft.lanes) === '[0]' && lnDraft.goal === 5 && lnDraft.materials.includes('piston') && JSON.stringify(lnDraft.anchors) === '[{"x":-1,"y":0}]',
    `${name}: editor adds a ship lane (piston too), refuses a rock in it and moves the flag (${JSON.stringify(lnDraft)})`);
  await click(1120, 640); // Test
  await sleep(600);
  const lnLevel = await page.evaluate(() => { const l = globalThis.__bridgeit.scene.getScene('play').level; return { lanes: JSON.stringify(l.shipLanes), goal: l.goalDistance }; });
  check(lnLevel.lanes === '[{"x0":0,"x1":4}]' && lnLevel.goal === 5, `${name}: the test level has the lane and the flag (${JSON.stringify(lnLevel)})`);
  await page.evaluate(() => {
    const p = globalThis.__bridgeit.scene.getScene('play');
    const add = (a, b, m) => p.design.add({ x: a[0], y: a[1] }, { x: b[0], y: b[1] }, m);
    add([0, 0], [0, 2], 'road'); add([0, 2], [0, 4], 'road');
    add([0, 0], [-1, 1], 'wood'); add([-1, 1], [0, 2], 'wood'); add([-1, 1], [-2, 3], 'wood'); add([-2, 3], [0, 4], 'wood');
    add([-1, 0], [-2, 3], 'piston');
    p.afterChange();
  });
  await click(1160, 664); // GO
  await page.waitForFunction(() => globalThis.__bridgeit.scene.getScene('play').lastSandboxWon !== null, null, { timeout: 30000 });
  await sleep(800);
  const lnWon = await page.evaluate(() => globalThis.__bridgeit.scene.getScene('play').lastSandboxWon);
  check(lnWon === true, `${name}: a drawbridge crosses the player's ship lane level (won ${lnWon})`);
  await page.screenshot({ path: `${OUT}/${name}-9x-editor-lane-won.png` });
  await click(780, 450); // Edit level
  check(await active('editor'), `${name}: back in the editor after the lane level`);
  await click(330, 50); // My levels: the lane level's card shows a ship
  await sleep(300);
  const lnCards = await page.evaluate(() => {
    const texts = [];
    const walk = (o) => { if (o.type === 'Text') texts.push(o.text); (o.list ?? []).forEach(walk); };
    walk(globalThis.__bridgeit.scene.getScene('editor').listLayer);
    return texts.filter((t) => t.includes(' m')).map((t) => t.includes('🚢'));
  });
  check(lnCards.filter(Boolean).length === 1 && lnCards.length >= 3, `${name}: only the ship lane level's card shows 🚢 (${JSON.stringify(lnCards)})`);
  await page.screenshot({ path: `${OUT}/${name}-9x-editor-mylevels-lane.png` });
  await page.keyboard.press('Escape'); await sleep(300);
  await page.keyboard.press('Escape'); await sleep(300);
  check(await active('menu'), `${name}: Escape in the editor goes back to the menu`);
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
