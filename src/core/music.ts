/**
 * Background music as plain note data, one short loop per world. No audio files: the game plays
 * these with simple oscillators (src/game/audio.ts). Kept here, free of browser code, so it is tested.
 */
export interface Track {
  name: string;
  /** Beats per minute. Each step is an eighth note. */
  bpm: number;
  /** MIDI note of the key's root (60 = middle C). */
  root: number;
  /** Melody wave and bass wave. */
  lead: 'triangle' | 'sine' | 'square';
  /** One entry per step: a scale degree (0 = root), or null for a rest. */
  melody: (number | null)[];
  /** Bass scale degrees, one per 4 steps (a half bar). */
  bass: number[];
  /** Scale as semitones above the root. */
  scale: number[];
}

const MAJOR_PENTA = [0, 2, 4, 7, 9];
const MINOR_PENTA = [0, 3, 5, 7, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

const _ = null;

/** Index = world id - 1. The menu uses world 1. */
export const TRACKS: Track[] = [
  {
    name: 'Farm Valley',
    bpm: 112,
    root: 67,
    lead: 'triangle',
    scale: MAJOR_PENTA,
    melody: [0, _, 2, _, 4, 3, 2, _, 1, _, 2, _, 0, _, _, _, 2, _, 4, _, 5, 4, 3, _, 2, _, 1, _, 0, _, _, _],
    bass: [0, 0, 3, 3, -2, -2, 0, 0],
  },
  {
    name: 'Canyon Rails',
    bpm: 100,
    root: 62,
    lead: 'triangle',
    scale: MINOR_PENTA,
    melody: [0, _, _, 1, 2, _, 3, _, 2, _, 1, _, 0, _, _, _, 3, _, _, 4, 5, _, 4, _, 3, _, 2, 1, 0, _, _, _],
    bass: [0, 0, -2, -2, 0, 0, 3, -1],
  },
  {
    name: 'Pirate Bay',
    bpm: 132,
    root: 62,
    lead: 'square',
    scale: DORIAN,
    melody: [0, _, 2, 4, _, 2, 4, _, 3, _, 1, 3, _, 1, 3, _, 4, _, 2, 4, _, 2, 4, 5, 6, _, 5, 4, 3, _, 0, _],
    bass: [0, 0, -2, -2, 0, 0, -3, 0],
  },
  {
    name: 'River Town',
    bpm: 92,
    root: 65,
    lead: 'sine',
    scale: MAJOR,
    melody: [4, _, 3, _, 2, _, _, _, 1, _, 2, _, 4, _, _, _, 5, _, 4, _, 2, _, 4, _, 3, _, 1, _, 0, _, _, _],
    bass: [0, 0, 3, 3, 5, 5, 4, 0],
  },
  {
    name: 'Candy Mountain',
    bpm: 120,
    root: 69,
    lead: 'sine',
    scale: MAJOR_PENTA,
    melody: [0, 2, 4, _, 5, 4, 2, _, 3, _, 5, _, 4, _, _, _, 0, 2, 4, _, 5, 7, 6, _, 4, _, 2, _, 0, _, _, _],
    bass: [0, 0, 2, 2, 3, 3, 1, 0],
  },
];

export function trackFor(world: number): Track {
  return TRACKS[Math.min(Math.max(1, Math.round(world)), TRACKS.length) - 1];
}

/** Frequency in Hz of a MIDI note (69 = A4 = 440 Hz). */
export const midiToHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** MIDI note of a scale degree; degrees past the scale go up an octave, negative ones go down. */
export function degreeToMidi(track: Track, degree: number): number {
  const n = track.scale.length;
  const octave = Math.floor(degree / n);
  const step = ((degree % n) + n) % n;
  return track.root + 12 * octave + track.scale[step];
}

export interface NoteEvent {
  /** Seconds from the start of the loop. */
  time: number;
  duration: number;
  hz: number;
  voice: 'lead' | 'bass';
}

export const stepSeconds = (track: Track): number => 60 / track.bpm / 2;

/** The notes that start on step `step` (steps count up forever; the loop repeats). */
export function notesAt(track: Track, step: number): NoteEvent[] {
  const dt = stepSeconds(track);
  const i = step % track.melody.length;
  const time = step * dt;
  const out: NoteEvent[] = [];
  const m = track.melody[i];
  if (m !== null) {
    // Hold the note until the next one (at most 3 steps).
    let hold = 1;
    while (hold < 3 && track.melody[(i + hold) % track.melody.length] === null) hold++;
    out.push({ time, duration: hold * dt * 0.9, hz: midiToHz(degreeToMidi(track, m)), voice: 'lead' });
  }
  if (i % 4 === 0) {
    const b = track.bass[(i / 4) % track.bass.length];
    out.push({ time, duration: 4 * dt * 0.95, hz: midiToHz(degreeToMidi(track, b) - 24), voice: 'bass' });
  }
  return out;
}
