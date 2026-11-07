import { save } from './save';

/**
 * Tiny synthesized sound effects. No audio files, so the download stays small.
 * Browsers only allow sound after a tap, so unlock() is called on the first input.
 */
class Sfx {
  private ctx: AudioContext | null = null;

  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  /** Suspends audio when the game is hidden (tab switch, phone lock). */
  setPaused(paused: boolean): void {
    if (!this.ctx) return;
    void (paused ? this.ctx.suspend() : this.ctx.resume()).catch(() => undefined);
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number, slideTo?: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !save.data.settings.sound || ctx.state !== 'running') return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private noise(duration: number, volume: number, lowpass: number): void {
    const ctx = this.ctx;
    if (!ctx || !save.data.settings.sound || ctx.state !== 'running') return;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }

  /** Beam placed. Pitch rises with each beam in a row. */
  place(streak: number): void {
    this.tone(420 + Math.min(streak, 12) * 30, 0.08, 'triangle', 0.18);
  }
  click(): void {
    this.tone(660, 0.05, 'square', 0.06);
  }
  error(): void {
    this.tone(180, 0.15, 'sawtooth', 0.08, 120);
  }
  erase(): void {
    this.tone(300, 0.1, 'triangle', 0.12, 150);
  }
  snap(material: string): void {
    this.noise(0.25, material === 'steel' ? 0.5 : 0.35, material === 'steel' ? 4000 : 1800);
    this.tone(material === 'steel' ? 900 : 300, 0.12, 'square', 0.08, 80);
  }
  splash(): void {
    this.noise(0.6, 0.35, 900);
  }
  go(): void {
    this.tone(300, 0.12, 'triangle', 0.15, 600);
  }
  win(_stars: number): void {
    // Short fanfare; each star adds its own pop (see starPop) when it appears.
    this.tone(392, 0.3, 'triangle', 0.14);
    this.tone(523, 0.3, 'triangle', 0.1, undefined, 0.1);
  }
  /** Pop for the earned star number `i` (0, 1, 2): rises in pitch. */
  starPop(i: number): void {
    const notes = [659, 784, 1047];
    this.tone(notes[i] ?? 1047, 0.22, 'triangle', 0.18);
    this.tone((notes[i] ?? 1047) * 2, 0.1, 'sine', 0.06);
  }
  coin(): void {
    this.tone(1319, 0.08, 'square', 0.05);
    this.tone(1760, 0.14, 'square', 0.05, undefined, 0.06);
  }
  lose(): void {
    this.tone(400, 0.5, 'sawtooth', 0.08, 90);
  }
}

export const sfx = new Sfx();
