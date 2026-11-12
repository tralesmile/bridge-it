import { describe, expect, test } from 'vitest';
import { BETWEEN_BREAKS_MS, FIRST_BREAK_AFTER_MS, breakAllowed, platformName } from '../src/core/adPolicy';
import { createPlatform, type CrazySdk, type PokiSdk } from '../src/game/platform';

const MIN = 60 * 1000;

function fakeClock() {
  const c = { t: 1000, paused: [] as boolean[] };
  return { c, hooks: { now: () => c.t, pause: (p: boolean) => c.paused.push(p) } };
}

describe('ad policy', () => {
  test('no break in the first 5 minutes, then at most one every 3 minutes', () => {
    const clock = { start: 0, lastBreak: null as number | null };
    expect(breakAllowed(clock, FIRST_BREAK_AFTER_MS - 1)).toBe(false);
    expect(breakAllowed(clock, FIRST_BREAK_AFTER_MS)).toBe(true);
    clock.lastBreak = FIRST_BREAK_AFTER_MS;
    expect(breakAllowed(clock, FIRST_BREAK_AFTER_MS + BETWEEN_BREAKS_MS - 1)).toBe(false);
    expect(breakAllowed(clock, FIRST_BREAK_AFTER_MS + BETWEEN_BREAKS_MS)).toBe(true);
  });

  test('unknown build modes fall back to the local platform', () => {
    expect(platformName('poki')).toBe('poki');
    expect(platformName('crazygames')).toBe('crazygames');
    expect(platformName('production')).toBe('local');
    expect(platformName(undefined)).toBe('local');
  });
});

describe('platform adapters', () => {
  test('local: free rewards, breaks do nothing', async () => {
    const { hooks } = fakeClock();
    const p = createPlatform('local', hooks, {});
    await p.init();
    expect(p.name).toBe('local');
    expect(await p.rewardedAd()).toBe(true);
    await p.commercialBreak();
  });

  test('poki: loading, one gameplay start, break timing, muted ads, rewards', async () => {
    const calls: string[] = [];
    const sdk: PokiSdk = {
      init: async () => void calls.push('init'),
      gameLoadingFinished: () => void calls.push('loaded'),
      gameplayStart: () => void calls.push('start'),
      gameplayStop: () => void calls.push('stop'),
      commercialBreak: async (onStart) => {
        onStart?.();
        calls.push('break');
      },
      rewardedBreak: async (onStart) => {
        onStart?.();
        calls.push('reward');
        return true;
      },
    };
    const { c, hooks } = fakeClock();
    const p = createPlatform('poki', hooks, { PokiSDK: sdk });
    await p.init();
    p.loadingDone();
    p.gameplayStart();
    p.gameplayStart();
    await p.commercialBreak(); // too early: nothing
    expect(calls).toEqual(['init', 'loaded', 'start']);
    c.t += 6 * MIN;
    await p.commercialBreak();
    expect(calls).toEqual(['init', 'loaded', 'start', 'stop', 'break', 'start']);
    expect(c.paused).toEqual([true, false]);
    await p.commercialBreak(); // just had one
    expect(calls.filter((x) => x === 'break')).toHaveLength(1);
    expect(await p.rewardedAd()).toBe(true);
  });

  test('crazygames: midgame and rewarded ads, an ad error gives no reward', async () => {
    const calls: string[] = [];
    let fail = false;
    const sdk: CrazySdk = {
      init: async () => void calls.push('init'),
      game: { gameplayStart: () => void calls.push('start'), gameplayStop: () => void calls.push('stop'), loadingStart: () => void calls.push('loading'), loadingStop: () => void calls.push('loaded') },
      ad: {
        requestAd: (type, cb) => {
          calls.push(type);
          cb.adStarted?.();
          if (fail) cb.adError?.('no fill');
          else cb.adFinished?.();
        },
      },
    };
    const { c, hooks } = fakeClock();
    const p = createPlatform('crazygames', hooks, { CrazyGames: { SDK: sdk } });
    await p.init();
    p.loadingDone();
    expect(await p.rewardedAd()).toBe(true);
    fail = true;
    expect(await p.rewardedAd()).toBe(false);
    c.t += 6 * MIN;
    await p.commercialBreak();
    expect(calls).toEqual(['init', 'loading', 'loaded', 'rewarded', 'rewarded', 'midgame']);
    expect(c.paused.at(-1)).toBe(false);
  });

  test('a missing SDK (ad blocker) never breaks the game', async () => {
    const { c, hooks } = fakeClock();
    for (const name of ['poki', 'crazygames'] as const) {
      const p = createPlatform(name, hooks, {});
      await p.init();
      p.loadingDone();
      p.gameplayStart();
      p.gameplayStop();
      expect(await p.rewardedAd()).toBe(false);
      c.t += 6 * MIN;
      await p.commercialBreak();
    }
  });
});
