import { describe, expect, it } from 'vitest';
import { EventQueue, levelParts, toGameAnalytics } from '../src/core/analytics';

describe('analytics events', () => {
  it('splits level ids into world and level', () => {
    expect(levelParts('w2-7')).toEqual(['w2', '7']);
    expect(levelParts('daily-2026-11-16')).toEqual(['daily', '2026-11-16']);
    expect(levelParts('odd')).toEqual(['odd', '_']);
    expect(levelParts('w1:3')).toEqual(['w1_3', '_']);
  });

  it('makes GameAnalytics progression events for levels', () => {
    expect(toGameAnalytics({ type: 'level', status: 'start', level: 'w1-2' })).toEqual({ category: 'progression', event_id: 'Start:w1:2' });
    expect(toGameAnalytics({ type: 'level', status: 'complete', level: 'w1-2', cost: 1250, stars: 3 })).toEqual({ category: 'progression', event_id: 'Complete:w1:2', value: 1250 });
    expect(toGameAnalytics({ type: 'level', status: 'fail', level: 'w3-10', reason: 'fell' })).toEqual({ category: 'progression', event_id: 'Fail:w3:10' });
  });

  it('makes design events for hints, ads and purchases', () => {
    expect(toGameAnalytics({ type: 'hint', level: 'w1-4', given: true }).event_id).toBe('hint:given:w1:4');
    expect(toGameAnalytics({ type: 'hint', level: 'w1-4', given: false }).event_id).toBe('hint:refused:w1:4');
    expect(toGameAnalytics({ type: 'ad', ad: 'interstitial', result: 'skipped' })).toEqual({ category: 'design', event_id: 'ad:interstitial:skipped' });
    expect(toGameAnalytics({ type: 'purchase', product: 'remove_ads', result: 'pending' }).event_id).toBe('purchase:remove_ads:pending');
  });

  it('only uses letters GameAnalytics allows, at most 5 parts of 64', () => {
    const ids = [
      toGameAnalytics({ type: 'level', status: 'start', level: 'x'.repeat(100) + '-ü:é' }).event_id,
      toGameAnalytics({ type: 'hint', level: 'daily-2026-01-01', given: true }).event_id,
      toGameAnalytics({ type: 'purchase', product: 'a:b/c', result: 'bought' }).event_id,
    ];
    for (const id of ids) {
      const parts = id.split(':');
      expect(parts.length).toBeLessThanOrEqual(5);
      for (const p of parts) expect(p).toMatch(/^[A-Za-z0-9 \-_.()!?]{1,64}$/);
    }
  });

  it('keeps a queue with a size limit', () => {
    const q = new EventQueue(3);
    for (let i = 1; i <= 5; i++) q.push({ type: 'level', status: 'start', level: `w1-${i}` });
    expect(q.size).toBe(3);
    expect(q.dropped).toBe(2);
    const first = q.take(2);
    expect(first.map((e) => e.event_id)).toEqual(['Start:w1:3', 'Start:w1:4']);
    expect(q.size).toBe(1);
    q.putBack(first);
    expect(q.take().map((e) => e.event_id)).toEqual(['Start:w1:3', 'Start:w1:4', 'Start:w1:5']);
    expect(q.size).toBe(0);
  });
});
