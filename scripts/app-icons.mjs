// Draws the app icon and splash screen in code (canvas 2D in Chrome) and writes them
// into the Android and iOS projects. Usage: node scripts/app-icons.mjs
// Re-run it after changing the drawing; the PNGs are committed.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { dirname } from 'node:path';

const RES = 'android/app/src/main/res';
const IOS = 'ios/App/App/Assets.xcassets';
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const splashLand = { mdpi: [480, 320], hdpi: [800, 480], xhdpi: [1280, 720], xxhdpi: [1600, 960], xxxhdpi: [1920, 1280] };

// Runs in the page. kind: 'icon' (full square), 'round', 'foreground' (adaptive icon layer, full bleed, art in the middle 66%), 'splash'.
function draw(kind, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const sky = (x0, y0, x1, y1) => {
    const grad = g.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, '#7cc6ff');
    grad.addColorStop(1, '#ffe2c2');
    g.fillStyle = grad;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  };
  // The scene is drawn in a 100 x 100 box: two grass cliffs, a wood truss bridge, the red car.
  const scene = (ox, oy, s, sun = true) => {
    g.save();
    g.translate(ox, oy);
    g.scale(s / 100, s / 100);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // Water in the gap.
    g.fillStyle = '#3fa7e0';
    g.fillRect(20, 78, 60, 400);
    // Cliffs.
    // The ground runs far past the box, so it reaches the image edges.
    for (const [x0, x1] of [[-600, 22], [78, 700]]) {
      g.fillStyle = '#b77a4a';
      g.fillRect(x0, 60, x1 - x0, 500);
      g.fillStyle = '#5fb24f';
      g.fillRect(x0, 58, x1 - x0, 7);
    }
    // Truss under the road.
    g.strokeStyle = '#8e5a35';
    g.lineWidth = 4.4;
    const top = 60, low = 76;
    const xs = [22, 36, 50, 64, 78];
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      g.moveTo(xs[i], top);
      g.lineTo((xs[i] + xs[i + 1]) / 2, low);
      g.lineTo(xs[i + 1], top);
    }
    g.moveTo(29, low);
    g.lineTo(71, low);
    g.stroke();
    g.strokeStyle = '#e6ad6f';
    g.lineWidth = 2;
    g.stroke();
    // Road.
    g.strokeStyle = '#4a4458';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(20, top);
    g.lineTo(80, top);
    g.stroke();
    g.strokeStyle = '#ffd84a';
    g.lineWidth = 1.2;
    g.setLineDash([3, 3]);
    g.stroke();
    g.setLineDash([]);
    // Anchors.
    for (const x of [22, 78]) {
      g.fillStyle = '#e8473d';
      g.beginPath();
      g.arc(x, top, 3.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(x, top, 1.3, 0, Math.PI * 2);
      g.fill();
    }
    // Car: body, cabin, window, driver, wheels.
    const cx = 47, wy = 52;
    g.fillStyle = '#2b2140';
    g.beginPath();
    g.roundRect(cx - 21, wy - 12, 42, 12, 5);
    g.fill();
    g.fillStyle = '#ff5a4e';
    g.beginPath();
    g.roundRect(cx - 20, wy - 11, 40, 10, 4.5);
    g.fill();
    g.beginPath();
    g.roundRect(cx - 9, wy - 22, 19, 13, 4);
    g.fill();
    g.fillStyle = '#bfe8ff';
    g.beginPath();
    g.roundRect(cx - 6, wy - 19.5, 13, 8, 2.5);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(cx + 0.5, wy - 15.5, 3.3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2b2140';
    g.beginPath();
    g.arc(cx + 1.2, wy - 15.8, 0.9, 0, Math.PI * 2);
    g.arc(cx + 3.2, wy - 15.8, 0.9, 0, Math.PI * 2);
    g.fill();
    for (const x of [cx - 12, cx + 12]) {
      g.fillStyle = '#2b2140';
      g.beginPath();
      g.arc(x, wy + 0.5, 6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#c6d4e8';
      g.beginPath();
      g.arc(x, wy + 0.5, 2.6, 0, Math.PI * 2);
      g.fill();
    }
    // Sun (not on the splash, where the title is).
    if (!sun) {
      g.restore();
      return;
    }
    g.fillStyle = '#ffc93c';
    g.beginPath();
    g.arc(80, 18, 9, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };

  if (kind === 'splash') {
    sky(0, 0, w, h);
    const s = Math.min(w, h) * 0.55;
    const top = (h - s) / 2 + s * 0.12;
    scene((w - s) / 2, top, s, false);
    g.fillStyle = '#2b2140';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `700 ${Math.round(s * 0.17)}px "Fredoka Variable", sans-serif`;
    g.fillText('Bridge It!', w / 2, top + s * 0.08);
  } else if (kind === 'foreground') {
    // Adaptive icons: the launcher crops this square to its own shape; only the middle 66% is always seen.
    const s = w * 0.62;
    sky(0, 0, w, h);
    scene((w - s) / 2, (h - s) / 2, s);
  } else {
    g.save();
    if (kind === 'round') {
      g.beginPath();
      g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
      g.clip();
    }
    sky(0, 0, w, h);
    scene(w * 0.04, h * 0.06, w * 0.92);
    g.restore();
  }
  // Raw pixel bytes (base64). RGB with no alpha channel (App Store rule), except the round icon,
  // whose corners must stay see-through.
  const px = g.getImageData(0, 0, w, h).data;
  const n = kind === 'round' ? 4 : 3;
  const out = new Uint8Array(w * h * n);
  for (let i = 0, j = 0; i < px.length; i += 4, j += n) {
    out[j] = px[i];
    out[j + 1] = px[i + 1];
    out[j + 2] = px[i + 2];
    if (n === 4) out[j + 3] = px[i + 3];
  }
  let bin = '';
  for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode(...out.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** A plain 8-bit PNG: RGB (n = 3) or RGBA (n = 4). */
function png(w, h, px, n) {
  const row = w * n;
  const rows = Buffer.alloc((row + 1) * h);
  for (let y = 0; y < h; y++) px.copy(rows, y * (row + 1) + 1, y * row, (y + 1) * row);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, n === 4 ? 6 : 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
// The splash title uses the game's own font file.
await page.setContent(`<style>@font-face { font-family: 'Fredoka Variable'; src: url('data:font/woff2;base64,${readFileSync('node_modules/@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2').toString('base64')}') format('woff2'); font-weight: 300 700; }</style><p style="font-family:'Fredoka Variable'">.</p>`);
await page.evaluate(() => document.fonts.load('700 40px "Fredoka Variable"'));

const write = async (path, kind, w, h) => {
  const b64 = await page.evaluate(([fn, k, ww, hh]) => new Function(`return (${fn})`)()(k, ww, hh), [draw.toString(), kind, w, h]);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png(w, h, Buffer.from(b64, 'base64'), kind === 'round' ? 4 : 3));
  console.log('wrote', path, w, h);
};

for (const [d, k] of Object.entries(densities)) {
  await write(`${RES}/mipmap-${d}/ic_launcher.png`, 'icon', 48 * k, 48 * k);
  await write(`${RES}/mipmap-${d}/ic_launcher_round.png`, 'round', 48 * k, 48 * k);
  await write(`${RES}/mipmap-${d}/ic_launcher_foreground.png`, 'foreground', 108 * k, 108 * k);
  const [lw, lh] = splashLand[d];
  await write(`${RES}/drawable-land-${d}/splash.png`, 'splash', lw, lh);
  await write(`${RES}/drawable-port-${d}/splash.png`, 'splash', lh, lw);
}
await write(`${RES}/drawable/splash.png`, 'splash', 480, 320);
await write(`${IOS}/AppIcon.appiconset/AppIcon-512@2x.png`, 'icon', 1024, 1024);
for (const n of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) await write(`${IOS}/Splash.imageset/${n}`, 'splash', 2732, 2732);
await write('probe/icon-preview.png', 'icon', 512, 512);
await write('probe/splash-preview.png', 'splash', 1280, 720);
await write('probe/foreground-preview.png', 'foreground', 432, 432);
await write('probe/round-preview.png', 'round', 192, 192);
await write('probe/splash-port-preview.png', 'splash', 720, 1280);
await browser.close();
