# Run log

Newest first. Every run adds: what was done, how it was verified, and lessons for the next run.

## 2026-11-09 — Run 14
**Done**
- Synced: no new work on other branches (only old font/seam ones).
- Difficulty report: `npm run report` prints cost, budget, tightness and which simple designs win per level. Tests added (170 total).

**Verified**
- `npm run check` green, `npm run e2e` all PASS.

**Lessons**
- Report shows only w1-1 is won by a bare road; truss-only wins on w1-2..6, 11 (fine, they teach trusses) and steel truss wins w1-7, w1-13 (rocks not needed; consider tighter budgets).
- `vite createServer().ssrLoadModule` runs TS scripts without extra dependencies.
- Next: per-world themes, truck-friendly World 2 levels, tighten w1-7 / w1-13 budgets.

## 2026-11-09 — Run 13
**Done**
- Synced: only old font/seam branches (1vjdjd, bfkknd, klj5rs) are unmerged; they conflict with newer `main` and hold nothing new, so skipped.
- Size check: `scripts/size-check.mjs` fails the build if `dist/` is over 8 MB; runs in `npm run check` (so also in CI). Now 1.6 MB.

**Verified**
- `npm run check` green, `npm run e2e` all PASS.

**Lessons**
- Merging the old font branches always conflicts; do not retry, just ignore them.
- Next: train / truck-friendly World 2 levels, per-world themes, difficulty report, loading screen.

## 2026-11-09 — Run 12
**Done**
- Synced: `main` already had World 2 levels 1-5 (the earlier run did not log them). Other branches only hold old font/seam work.
- World 2 now has 10 levels: added Sparse Posts, Long Cable (truss + rope), Grand Canyon (28 m), Skyline Span, Canyon Finale (32 m). All have winning stored solutions.
- e2e saves `*-9-zoomed-level.png` for the 32 m level.

**Verified**
- `npm run check` green (168 tests), `npm run e2e` all PASS; looked at desktop and phone screenshots of level 10.

**Lessons**
- Trucks lose on rope-hung bridges and on wood trusses over 4 m; only steel trusses win to 8 m, none at 12 m. A truck level in World 2 needs a new idea (pylons from below, or a stronger material).
- Cars: road + ropes every 2 m at height 4 wins up to 32 m; height 6 loses (rope too long/stretchy).
- 32 m fits the phone screen at the current zoom, so zoom-out still has no gap that needs it.
- Next: train vehicle or truck-friendly rope levels; per-world themes; difficulty report.

## 2026-11-08 — Run 11
**Done**
- Synced: other `claude/*` branches (1vjdjd, bfkknd, klj5rs) still only hold old font/seam work already in `main`.
- World select screen (`WorldSelectScene`): Farm Valley card with stars, three locked "Coming soon" cards. PLAY now goes menu -> worlds -> levels; level select takes `{world}`; back buttons return correctly. Unlock reuses `isUnlocked` over all levels.
- e2e follows the new path and saves `*-1c-worlds.png`.

**Verified**
- `npm run check` green (108 tests), `npm run e2e` all PASS; looked at the world select screenshot.

**Lessons**
- Cloud run starts already cloned; `add_repo` just reports it is present.
- Next: World 2 Canyon Rails needs a train (multi-car vehicle) in `src/core`; start with 5 rope levels using existing vehicles if the train is too big.

## 2026-11-07 — Run 10
**Done**
- Synced: other `claude/*` branches (1vjdjd, bfkknd, klj5rs) still only hold old font/seam work already in `main`.
- Rope material: tension only (`RopeJoint`), 4.5 m max, $60/m, strength 7000. Toolbar button, colour, save check; used only when a level lists `'rope'`.
- Tests: rope-braced truss wins, braces without posts lose, rope length limit.

**Verified**
- `npm run check` green (108 tests), `npm run e2e` all PASS. No game level uses rope yet, so no screenshot of it.

**Lessons**
- planck `new RopeJoint({maxLength}, a, b, anchor)` uses ONE anchor for both bodies, so the rope had length 0 and acted like a weld. Use the def form with `localAnchorA/B`.
- Single diagonals made of rope fail under a moving load (the load flips tension to compression); X braces are needed.
- Next: world select screen, then World 2 with a train and real rope levels.

## 2026-11-07 — Run 9
**Done**
- Synced: other `claude/*` branches still only hold font/seam work already in `main`.
- World 1 now has 15 levels (10 Long Haul, 11 Little Brook, 12 Two Rocks, 13 Heavy Load, 14 Deep Gorge, 15 Farm Finale), each with a winning stored solution.
- Level select is a 5x3 grid (4x3 overflowed the panel at 12 levels already).

**Verified**
- `npm run check` green (105 tests), `npm run e2e` all PASS; looked at level select on desktop and phone.

**Lessons**
- Wood truss (h=1) often beats steel for trucks: steel is heavier and broke more. Test materials with a scratch test before assuming.
- Scratch tests: vitest hides console output here; append to a file in the scratchpad instead.
- Open physics issues (in roadmap): car flips after dropping onto a lower cliff; truck breaks the ramp beam when starting on a raised cliff. I dropped those level ideas instead of tuning around them.
- Next: pan task is still not needed; start M3 Rope material and World 2.

## 2026-11-07 — Run 8
**Done**
- Synced: other `claude/*` branches still only hold font/seam work already in `main`.
- `levelToJson` / `levelFromJson` (shape checks, short errors) in `src/core/levels.ts`; every level round-trips and still wins.
- Level 9 "High Cliff": 16 m gap, left cliff 1 m higher, goal 5 m away. e2e now saves `*-7-wide-level.png` (hint shown).

**Verified**
- `npm run check` green (69 tests), `npm run e2e` all PASS; looked at desktop and phone screenshots of level 9.

**Lessons**
- Climbing a 1:2 ramp up (kink in the deck) always got the car "stuck"; a ramp down at the start works. Sweep the kink position with a scratch test instead of guessing; delete the scratch file after.
- A 16 m level still fits at full scale, so zoom-out is not yet seen by screenshot; needs a gap of ~30 m or a small viewport.
- Next: more World 1 levels (10-15), including a long truck level.

## 2026-11-07 — Run 7
**Done**
- Synced: branches 1vjdjd, bfkknd, klj5rs only hold font/seam work already in `main`.
- Level specs accept `leftHeight`, `rightHeight`, `goalDistance`; default anchors follow cliff heights; sim and flag use `goalDistance`. `build` exported for tests.

**Verified**
- `npm run check` green (54 tests), `npm run e2e` all PASS. No screenshot of an uneven level yet (no such level in the game).

**Lessons**
- Sim and bridge rules already handled cliff heights; check the code before assuming work is needed.
- Next: add a real uneven/wide level with a solution and look at it in a screenshot.

## 2026-11-07 — Run 6
**Done**
- Synced: unmerged `claude/*` branches only hold the font and seam work already in `main`.
- Play scene scale is now per level (`ppm`): wide levels zoom out to fit (min 28 px/m). Pan is a separate task, needed only past ~40 m.

**Verified**
- `npm run check` green (52 tests), `npm run e2e` all PASS. No wide level exists yet, so the zoom-out path was checked by reading the math only, not by screenshot.

**Lessons**
- The run branch can be behind `main`: do `git checkout -B <branch> origin/main` first.
- Next run: add a wide test level (or a 24 m gap) with a screenshot when M3 level format work starts.

## 2026-11-07 — Run 5
**Done**
- Synced: other `claude/*` branches only hold the font and seam work already in `main`.
- Settings panel (menu): Sound, Screen shake, Less motion (stops cloud/sun/title/car animation, confetti, stress pulse, shake). Saved in `settings`; e2e toggles it.
- Menu car got the cow head too (it lost it when the head became its own sprite).
- Portrait phone (width up to 700px) shows a "Turn your phone sideways" card (pure CSS, e2e checks it).
- Hiding the app during a drive shows a Paused card with Continue (e2e covers it).
- `.github/workflows/ci.yml`: check + e2e on push to main and pull requests. Not run yet; verify on GitHub next run.
- Win panel: confetti behind the panel, coins fly to the top right, each earned star plays a rising pop.
- Cow driver is now a separate sprite (`cow-calm`, `cow-worried`, `cow-scream`). Face follows worst beam stress (over 50% worried, over 80% or falling: screaming).

**Verified**
- `npm run check` green (52 tests), `npm run e2e` all PASS; driving and fail screenshots show the cow in the cabin, screaming in the water.

**Lessons**
- Draw parts that change (faces) as their own textures, so the vehicle body stays one cached image.
- When a texture is split into parts, grep every place that uses it (the menu car lost its driver).
- Particle depth matters: confetti above the result panel hid the title; put it behind.
- The cow face is tiny on screen; a zoomed screenshot test of the mood would be nice later.

## 2026-11-07 — Run 4
**Done**
- Synced: other `claude/*` branches (font, hill seam) were already in `main` under different commits; nothing to merge.
- Stress now also shows as thicker beams and a white pulse (faster when closer to breaking).
- Vehicle chassis and wheels are bullet bodies; a NaN/infinite body ends the attempt as `collapse` (shown as "Splash!").

**Verified**
- `npm run check` green (52 tests), `npm run e2e` all PASS, fail screenshot looks right.

**Lessons**
- Duplicate work lands on several run branches; compare by file content (`grep`), not commit hash.
- Stress pulse is not covered by a screenshot; add one after the settings panel (reduced motion) lands.

## 2026-11-07 — Run 3
**Done**
- Synced: all other `claude/*` branches only held the font and hill-seam work already in `main`.
- Ghost of the last failed attempt: beams that broke or were over 80% stress glow red while editing.

**Verified**
- `npm run check` green (51 tests), `npm run e2e` all PASS.

**Lessons**
- Branch `claude/practical-meitner-*` is checked out at start; use `git checkout -B <branch> origin/main` to start from latest main.
- The e2e does not screenshot the edit screen after a fail; add one when touching edit visuals.

## 2026-11-06 — Run 2
**Done**
- Fredoka variable font bundled via `@fontsource-variable/fredoka` (latin, latin-ext, hebrew woff2 in the build, OFL licence in `docs/`). Game waits for the font (max 2 s) before starting Phaser, so text never renders in the fallback font.
- Fixed the menu hill seam (whole-number frequencies, rim only on top edge).

**Verified**
- `npm run check` green (51 tests), `npm run e2e` all PASS, menu screenshot shows Fredoka.

**Lessons**
- Top-level await is not allowed by the build target; use `.then`.
- The cloud session is on branch `claude/practical-meitner-n7h2rn`, so pushes go there, not `main`.
- Tiling textures need whole-number sine frequencies and no stroke on the side edges.
- Several scheduled runs can work in parallel on separate branches; fetch all branches and merge their work to main.

## 2026-11-06 — Run 1 (initial build)
**Done**
- Project set up: Vite 8, TypeScript, Phaser 4.2.1, Planck.js 1.5.1, Vitest, Playwright.
- Core: bridge design model, deterministic physics, 8 Farm Valley levels with stored solutions.
- Game: menu, level select, play scene (build, drive, slow-motion collapse, results, hint), art and sound drawn in code.

**Verified**
- `npm run check`: type check, 51 unit and level tests, production build (1.6 MB, about 420 KB gzipped).
- `npm run e2e`: real Chrome at 1280×720 and 844×390; menu, level select, build by drag, win with stars, loss, back to editing; zero console errors.

**Lessons**
- Hinged road beams in a straight line form a mechanism and sag: only triangles hold. This is the core puzzle, so keep it.
- Node bodies must not be too light (mass-ratio problems): node density 300 works.
- Joint reaction forces spike on impacts; break on a filtered load (0.92 per step), not the raw force.
- Vite 8 (Rolldown) needs `manualChunks` as a function.
- Browser test: favicon 404 counts as a console error, so keep `public/favicon.svg`.
