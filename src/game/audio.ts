import { notesAt, stepSeconds, trackFor } from '../core/music';
import { save } from './save';

/**
 * Tiny synthesized sound effects. No audio files, so the download stays small.
 * Browsers only allow sound after a tap, so unlock() is called on the first input.
 */
class Sfx {
  private ctx: AudioContext | null = null;
  /** Background music: the world whose loop plays (0 = none), the next step and when it starts. */
  private musicWorld = 0;
  private musicStep = 0;
  private musicNext = 0;
  private musicTimer: ReturnType<typeof setInterval> | null = null;

  /** Plays the loop of a world (the menu uses world 1). Calling it again with the same world keeps the loop going. */
  music(world: number): void {
    if (world === this.musicWorld) return;
    this.musicWorld = world;
    this.musicStep = 0;
    this.musicNext = 0;
    if (!this.musicTimer) this.musicTimer = setInterval(() => this.scheduleMusic(), 50);
  }

  /** Looks 0.2 s ahead and schedules the notes that start in that time. */
  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.musicWorld) return;
    if (!save.data.settings.music) {
      this.musicNext = 0;
      return;
    }
    const track = trackFor(this.musicWorld);
    const dt = stepSeconds(track);
    // Start (or restart after a pause) a little in the future.
    if (this.musicNext < ctx.currentTime - 0.1) this.musicNext = ctx.currentTime + 0.05;
    while (this.musicNext < ctx.currentTime + 0.2) {
      for (const n of notesAt(track, this.musicStep)) {
        if (n.voice === 'lead') this.note(n.hz, n.duration, track.lead, 0.035, this.musicNext);
        else this.note(n.hz, n.duration, 'triangle', 0.05, this.musicNext);
      }
      this.musicStep++;
      this.musicNext += dt;
    }
  }

  /** A soft note with a short attack, at an exact AudioContext time. */
  private note(freq: number, duration: number, type: OscillatorType, volume: number, at: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

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
