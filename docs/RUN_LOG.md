# Run log

Newest first. Every run adds: what was done, how it was verified, and lessons for the next run.

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
