import { describe, expect, test } from 'vitest';
import { TRACKS, degreeToMidi, midiToHz, notesAt, stepSeconds, trackFor } from '../src/core/music';
import { WORLDS } from '../src/core/levels';

describe('music', () => {
  test('every world has its own loop, plus one for Candy Mountain', () => {
    for (const w of WORLDS) expect(trackFor(w.id).name).toBe(w.name);
    expect(TRACKS.length).toBeGreaterThanOrEqual(WORLDS.length + 1);
    expect(new Set(TRACKS.map((t) => t.name)).size).toBe(TRACKS.length);
    // Out-of-range worlds fall back to a real track.
    expect(trackFor(0)).toBe(TRACKS[0]);
    expect(trackFor(99)).toBe(TRACKS[TRACKS.length - 1]);
  });

  test('loops are whole bars and the bass fits the melody', () => {
    for (const t of TRACKS) {
      expect(t.melody.length % 8, t.name).toBe(0);
      expect(t.bass.length * 4, t.name).toBe(t.melody.length);
      expect(t.melody[0], t.name).not.toBeNull();
    }
  });

  test('notes stay in a comfortable range (no squeaks, no rumble)', () => {
    for (const t of TRACKS) {
      for (let step = 0; step < t.melody.length; step++) {
        for (const n of notesAt(t, step)) {
          if (n.voice === 'lead') {
            expect(n.hz, t.name).toBeGreaterThan(200);
            expect(n.hz, t.name).toBeLessThan(1400);
          } else {
            expect(n.hz, t.name).toBeGreaterThan(40);
            expect(n.hz, t.name).toBeLessThan(250);
          }
          expect(n.duration).toBeGreaterThan(0);
        }
      }
    }
  });

  test('pitch maths', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(81)).toBeCloseTo(880);
    const t = TRACKS[0];
    expect(degreeToMidi(t, 0)).toBe(t.root);
    expect(degreeToMidi(t, t.scale.length)).toBe(t.root + 12);
    expect(degreeToMidi(t, -1)).toBe(t.root - 12 + t.scale[t.scale.length - 1]);
  });

  test('the loop repeats exactly and steps are evenly timed', () => {
    const t = TRACKS[2];
    const n = t.melody.length;
    const a = notesAt(t, 3);
    const b = notesAt(t, 3 + n);
    expect(b.map((x) => x.hz)).toEqual(a.map((x) => x.hz));
    expect(b[0].time - a[0].time).toBeCloseTo(n * stepSeconds(t));
  });
});
