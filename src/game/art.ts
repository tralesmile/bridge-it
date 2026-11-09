import Phaser from 'phaser';
import { C, WORLD_BACKGROUNDS } from './theme';

/**
 * Draws every texture in code ("chunky toy" style: rounded shapes, soft shadow, a light rim).
 * Zero art files keeps the first download tiny, well under the 8 MB portal limit.
 */
type Ctx = CanvasRenderingContext2D;

function canvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  draw(ctx);
  tex.refresh();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Deterministic random numbers so hills look the same on every load. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hills(ctx: Ctx, w: number, h: number, color: string, seed: number, amp: number): void {
  const rnd = seeded(seed);
  const bumps = Array.from({ length: 6 }, () => ({ f: 1 + Math.floor(rnd() * 3), p: rnd() * Math.PI * 2, a: 0.3 + rnd() * 0.7 }));
  ctx.fillStyle = color;
  const top: number[] = [];
  for (let x = 0; x <= w; x += 8) {
    let y = 0;
    for (const b of bumps) y += Math.sin((x / w) * Math.PI * 2 * b.f + b.p) * b.a;
    top.push(h * 0.45 - y * amp);
  }
  ctx.beginPath();
  ctx.moveTo(0, h);
  top.forEach((y, i) => ctx.lineTo(i * 8, y));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  // Rim: top edge only, so tiled copies show no seam.
  ctx.beginPath();
  top.forEach((y, i) => (i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * 8, y)));
  // Soft light rim along the top.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 4;
  ctx.stroke();
}

export type Mood = 'calm' | 'worried' | 'scream';
export const MOODS: Mood[] = ['calm', 'worried', 'scream'];

/** Cow driver head, centred on (cx, cy). Drawn separately so the face can change with bridge stress. */
function drawCow(ctx: CanvasRenderingContext2D, cx: number, cy: number, mood: Mood): void {
  const dark = '#2b2140';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 17, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(cx - 8, cy - 6, 6, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffb8c6';
  ctx.beginPath();
  ctx.ellipse(cx + 10, cy + 6, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  const ex = [cx + 4, cx + 12];
  const ey = cy - 4;
  ctx.fillStyle = dark;
  ctx.strokeStyle = dark;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  if (mood === 'calm') {
    for (const x of ex) {
      ctx.beginPath();
      ctx.arc(x, ey, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Big white eyes with small pupils.
    const r = mood === 'scream' ? 5.2 : 4.4;
    for (const x of ex) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, ey, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(x, ey, mood === 'scream' ? 1.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Brows slanted up in the middle.
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex[0] - 5, ey - 6);
    ctx.lineTo(ex[0] + 3, ey - 9);
    ctx.moveTo(ex[1] - 3, ey - 9);
    ctx.lineTo(ex[1] + 5, ey - 6);
    ctx.stroke();
  }
  // Mouth.
  ctx.lineWidth = 2;
  if (mood === 'calm') {
    ctx.beginPath();
    ctx.arc(cx + 10, cy + 7, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (mood === 'worried') {
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy + 9);
    ctx.quadraticCurveTo(cx + 8, cy + 5, cx + 11, cy + 9);
    ctx.quadraticCurveTo(cx + 14, cy + 12, cx + 16, cy + 8);
    ctx.stroke();
    // Sweat drop.
    ctx.fillStyle = '#7fd4ff';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 12);
    ctx.quadraticCurveTo(cx - 9, cy - 6, cx - 14, cy - 3);
    ctx.quadraticCurveTo(cx - 19, cy - 6, cx - 14, cy - 12);
    ctx.fill();
  } else {
    ctx.fillStyle = '#7a1f2e';
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy + 8, 4.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function makeTextures(scene: Phaser.Scene): void {
  for (const mood of MOODS) canvas(scene, `cow-${mood}`, 44, 40, (ctx) => drawCow(ctx, 22, 20, mood));
  WORLD_BACKGROUNDS.forEach((b, i) => {
    const sfx = i === 0 ? '' : `-w${i + 1}`;
    canvas(scene, `sky${sfx}`, 4, 512, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, b.skyTop);
      g.addColorStop(1, b.skyBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 512);
    });
    canvas(scene, `hills-far${sfx}`, 1024, 320, (ctx) => hills(ctx, 1024, 320, b.hillFar, 7 + i * 5, 40));
    canvas(scene, `hills-near${sfx}`, 1024, 320, (ctx) => hills(ctx, 1024, 320, b.hillNear, 23 + i * 5, 28));
  });

  canvas(scene, 'cloud', 220, 110, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [x, y, r] of [[60, 70, 36], [105, 52, 46], [155, 70, 34], [110, 80, 38]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  canvas(scene, 'sun', 160, 160, (ctx) => {
    const g = ctx.createRadialGradient(80, 80, 10, 80, 80, 80);
    g.addColorStop(0, 'rgba(255,248,200,1)');
    g.addColorStop(0.45, 'rgba(255,230,140,0.9)');
    g.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 160, 160);
  });

  canvas(scene, 'car', 172, 96, (ctx) => {
    // Shadow under body.
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, 12, 50, 150, 34, 16);
    ctx.fill();
    // Body.
    const g = ctx.createLinearGradient(0, 30, 0, 80);
    g.addColorStop(0, '#ff6b5c');
    g.addColorStop(1, '#d93b30');
    ctx.fillStyle = g;
    roundRect(ctx, 6, 40, 160, 38, 18);
    ctx.fill();
    // Cabin.
    ctx.fillStyle = '#ff8a7c';
    roundRect(ctx, 46, 8, 78, 42, 16);
    ctx.fill();
    ctx.fillStyle = '#bfe8ff';
    roundRect(ctx, 56, 16, 58, 28, 10);
    ctx.fill();
    // Headlight and rim highlight.
    ctx.fillStyle = '#fff4b0';
    roundRect(ctx, 150, 48, 12, 10, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(24, 46);
    ctx.lineTo(146, 46);
    ctx.stroke();
  });

  canvas(scene, 'truck', 260, 120, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, 10, 72, 240, 36, 16);
    ctx.fill();
    // Hay bed.
    ctx.fillStyle = '#e9c45a';
    roundRect(ctx, 8, 22, 150, 52, 14);
    ctx.fill();
    ctx.strokeStyle = '#c9a23d';
    ctx.lineWidth = 3;
    for (let x = 22; x < 150; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 28);
      ctx.lineTo(x + 8, 68);
      ctx.stroke();
    }
    // Body and cab.
    ctx.fillStyle = '#3c8dff';
    roundRect(ctx, 6, 64, 248, 36, 16);
    ctx.fill();
    roundRect(ctx, 166, 18, 84, 56, 16);
    ctx.fill();
    ctx.fillStyle = '#bfe8ff';
    roundRect(ctx, 182, 28, 54, 30, 10);
    ctx.fill();
  });

  canvas(scene, 'wheel', 64, 64, (ctx) => {
    ctx.fillStyle = '#2b2140';
    ctx.beginPath();
    ctx.arc(32, 32, 31, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d7dbe8';
    ctx.beginPath();
    ctx.arc(32, 32, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9aa1b8';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(32 + Math.cos(a) * 8, 32 + Math.sin(a) * 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  canvas(scene, 'anchor', 32, 32, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(17, 18, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.anchor;
    ctx.beginPath();
    ctx.arc(16, 16, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 16, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  canvas(scene, 'node', 20, 20, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10, 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  const star = (ctx: Ctx, fill: string, stroke: string) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 30 : 13;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(32 + Math.cos(a) * r, 34 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  };
  canvas(scene, 'star', 64, 68, (ctx) => star(ctx, C.gold, '#e0a21c'));
  canvas(scene, 'star-empty', 64, 68, (ctx) => star(ctx, 'rgba(255,255,255,0.35)', 'rgba(43,33,64,0.35)'));

  canvas(scene, 'coin', 40, 40, (ctx) => {
    ctx.fillStyle = '#e0a21c';
    ctx.beginPath();
    ctx.arc(20, 20, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(20, 19, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0a21c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(20, 19, 9, 0, Math.PI * 2);
    ctx.stroke();
  });

  canvas(scene, 'confetti', 14, 8, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 14, 8);
  });

  canvas(scene, 'spark', 12, 12, (ctx) => {
    const g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 12, 12);
  });
  canvas(scene, 'chip', 12, 6, (ctx) => {
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 0, 0, 12, 6, 2);
    ctx.fill();
  });
  canvas(scene, 'puff', 32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });
}
