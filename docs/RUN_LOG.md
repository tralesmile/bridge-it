# Run log

Newest first. Every run adds: what was done, how it was verified, and lessons for the next run.

## 2026-11-06 — Run 2
**Done**
- Fredoka (400 and 700, latin) bundled in `public/fonts` with its OFL licence; `@font-face` in `index.html`; BootScene waits up to 2 s for the font before the menu.
- Found a seam in the hills at x=1024 on the menu (added to roadmap).

**Verified**
- `npm run check` green (51 tests); `npm run e2e` all PASS; menu screenshot shows Fredoka.

**Lessons**
- Fonts via `@fontsource/*` npm packages work through the proxy; copy the woff2 files to `public/`.
- The session branch is `claude/practical-meitner-klj5rs`; push there (not main) when the run instructions name a branch.

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
