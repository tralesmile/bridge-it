# Run log

Newest first. Every run adds: what was done, how it was verified, and lessons for the next run.

## 2026-11-11 — Run 28
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Piston mechanism found: drawbridges. New level rule `shipLane` (no node or beam inside or across it; reason "Keep the ship lane clear"). The player builds the leaf standing up on the cliff; a piston from a post behind the hinge swings it down.
- Physics (only in levels that offer pistons): a road node that comes down onto a cliff edge or pier anchor locks there (`latch` event, small spark and clunk in the game). The pistons of that part of the bridge freeze at their current length. The vehicle waits with brakes on until the pistons are done. Pistons now grow between 0.25 s and 1.5 s.
- Draft World 4 River Town: Drawbridge, Twin Leaves, Lock Gate. Ship lane art. Difficulty report now includes draft levels and counts designs that break build rules as not buildable.
- 9 tests in `tests/drawbridge.test.ts`; e2e screenshots the three levels and a leaf swinging, and checks Lock Gate wins in the game.

**Verified**
- `npm run check` green (331 tests), `npm run e2e` no FAIL, screenshots checked on desktop and phone (moved the lane label and boat after they overlapped the tip text and the pier).

**Lessons**
- Without a piston, a leaf fell backwards, swung a full circle through the ground (roads do not hit terrain) and locked onto the far side from below. Locks now need the road end to be coming down, and never onto the part's own hinge or posts on the cliff top. Always probe "the solution minus the clever part".
- A grid search in a small Python script quickly showed that a 50% piston cannot turn a leaf exactly 90 degrees onto a grid point; a lock on contact removes the need for exact lengths.
- In e2e, `scene.getScene('play').scene.start('play', ...)` did not switch levels; the game-level `__bridgeit.scene.start('play', ...)` does. Check that the screenshot shows the level you meant.
- The difficulty test got slower with more levels; it now has a 30 s timeout.
- Probed a truck on the 4 m leaf (wood, steel, every wood/steel mix of the 4 braces): all lose. A truck leaf needs a new shape.
- Next: more River Town levels (truck leaf shape, longer leaf), then springs.

## 2026-11-11 — Run 27
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Pirate Bay levels 12-15: Cargo Hold (truck from a high ship down to a low dock; wood legs + steel braces), One Mast (12 m, one fan of three ropes is enough; a wood truss breaks), Deep Water (rocks 3 m down: a two-step wood tower beats steel legs), Pirate Finale (20 m truck; wood truss + a wood leg on every rock).
- World 3 moved from `DRAFT_WORLDS` into `WORLDS`, ocean/sand backdrop in `WORLD_BACKGROUNDS`, Pirate Bay removed from Coming soon. `DRAFT_WORLDS` is kept empty for World 4.
- e2e: screenshots all 15 Pirate Bay levels and the world 3 level select.

**Verified**
- `npm run check` green (307 tests), `npm run e2e` no FAIL, difficulty report: no simple design wins any w3 level within budget; screenshots checked (desktop and phone).

**Lessons**
- Again: wood is 2.25 m max, so a V from a rock 2 m down to deck joints 2 m away (2.83 m) is not buildable. Probe only buildable beams, or put a `canAdd` check in the probe.
- 1 m uphill to a higher dock over 2 m flips the car; on a 1 m grid there is no gentle uphill ramp. Avoid higher right cliffs.
- `game.scene.start('levels')` from e2e does not stop the running play scene (play draws on top). Start it from the play scene: `getScene('play').scene.start(...)`.
- Next: piston mechanism idea, then Springs and World 4.

## 2026-11-11 — Run 26
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- World 3 Pirate Bay drafts 3-8 (still in `DRAFT_WORLDS`): Plank Walk (one low rock between road joints, two planks), Crow's Nest (two masts, fan of ropes), Gangplank (car walks down from a 2 m high ship), Tide Pools (rocks between road joints, lean planks on them), Rum Barrels (truck down to a low dock, wood leg + steel diagonals from a deep rock), Shipwreck (a deep rock that is not worth using; a short leg on the high rock wins).
- Drafts 9-11: Treasure Island (16 m, two island rocks between road joints), Rope Ladder (three masts, two ropes each), Cannon Cart (truck down to a low dock; rope is offered but snaps).
- Bug found while probing: wood/steel/piston from one anchor to another (e.g. cliff top to the anchor below) threw a TypeError on the first step, so the game would freeze. Fixed in `Simulation.addBeam`, 1 test.
- e2e screenshots all 11 draft levels with the hint.

**Verified**
- `npm run check` green (272 tests), `npm run e2e` no FAIL, desktop and phone screenshots of the new levels checked.

**Lessons**
- Check beam lengths in a probe solution before running: a 2.83 m wood diagonal is over the 2.25 m limit, and only the "built within the rules" test catches it.
- Shell heredocs with `${...}` and `$` can trip the command safety check; write probe tests with the Write tool.
- For each new level, probe the solution, empty, road only and road + truss, and a few cheaper ideas; then pick the cheapest robust one as the stored solution.
- Probe odd player moves too (anchor to anchor, zero-length): that is how the crash was found.
- Next: 4 more Pirate Bay levels (still no piston-required idea), then move the world into `WORLDS`.

## 2026-11-10 — Run 25
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Physics bug: a car going down a 1 m slope at the end of a flat bridge flipped onto its roof. Cause: wheel motors braked at full torque downhill and pitched the car forward. Now a wheel faster than its target speed gets 10% torque. Level tests and difficulty report unchanged. New slope test (car and truck).
- Started World 3 Pirate Bay as a draft (`PIRATE` / `DRAFT_WORLDS` in `src/core/levels.ts`): w3-1 Low Dock (car, right dock 1 m lower) and w3-2 Ramp Foot (truck from a high cliff; wood legs break, steel only at the ramp foot wins; all-steel is over 3 stars). Drafts get all level tests, open by id, and are not in menus. e2e screenshots them.

**Verified**
- `npm run check` green (226 tests), `npm run e2e` no FAIL, screenshots of both new levels (desktop and phone) checked.

**Lessons**
- vitest hides `console.log` here; use `process.stdout.write` in probe tests.
- When a sensible design loses in a strange way, trace it before designing around it: the flip was a physics bug, not a level problem.
- Keep unfinished worlds in `DRAFT_WORLDS` so levels are tested without showing a half-empty world.
- e2e now takes over 2 minutes; run it with a longer timeout or in the background.
- Next: more Pirate Bay levels (a piston idea is still needed), min-cost search.

## 2026-11-10 — Run 24
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Retuned the two levels the report flagged. w1-7 Hay Truck: gap 4 → 6 (a wood truss now breaks under the truck; solution is wood diagonals + steel top chord, $3,246; all-steel is over budget). w1-13 Heavy Load: solution is a wood truss on the rock ($3,328; was a $6,992 steel truss); steel truss alone is over the new $4,400 budget.
- `BridgeDesign.restore` drops saved beams that break the current level rules, so old saves still load after a level changes. 1 test.

- Vehicle drops: new loss reason `flipped` (upside down for 0.5 s; never wins upside down), "Flipped!" panel with a ramp tip. Probing showed the old "drop" losses were unsupported deck ends, and the truck ramp break is a wood leg at the ramp foot. 5 tests in `tests/vehicle.test.ts`.
- Tried cutting motor torque on airborne wheels: no effect on the flips, so reverted.

**Verified**
- `npm run check` green (212 tests), `npm run e2e` no FAIL, screenshots of w1-7, w1-13 and the Flipped panel (phone size) checked.

**Lessons**
- When moving a gap in a probe, build the level with `build()` so the right cliff anchors move too.
- Trucks cross wood trusses only up to about 4 m spans; 6 m needs steel somewhere (or a 2 m tall wood truss).
- A trace (x, y, angle every 0.25 s) finds the cause of a loss faster than guessing at physics.
- Next: World 3 design, min-cost search, drop/ramp levels.

## 2026-11-10 — Run 23
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Share codes UI: "Copy bridge code" on the win panel (clipboard, prompt fallback), "Paste code" at top left while building (checks level id and rules, shows plain errors).

**Verified**
- `npm run check` green (206 tests), `npm run e2e` no FAIL; fixed two overlaps found in screenshots (Paste vs Back, Copy vs panel edge).

**Lessons**
- Always open the screenshot after adding UI: both new buttons overlapped on the first try.
- Paste/copy not in e2e (prompt and clipboard are browser dialogs). Could add a test with a stubbed prompt.
- Next: tighten w1-7 / w1-13 budgets, vehicle-drop physics, World 3 design.

## 2026-11-10 — Run 22
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Share codes core (`src/core/share.ts`): bridge to a short text code and back, with checksum and level-rule check. 3 tests. UI not done yet (new roadmap task).

**Verified**
- `npm run check` green (206 tests), `npm run e2e` no FAIL.

**Lessons**
- base64url contains `-`, so never use `-` as a separator in codes; use `.`.
- World 3 still needs a design idea; a pure-core task is a good fallback when a design task is blocked.
- Next: share codes UI, tighten w1-7 / w1-13 budgets, vehicle-drop physics, World 3.

## 2026-11-10 — Run 21
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Piston material (`piston` in `materials.ts`, `growPistons` in `simulation.ts`): rigid distance joint whose length grows 50% from 0.5 s to 2 s. Teal colour in the play scene and toolbar. Save loader accepts it. 2 tests.
- No World 3 level yet (see roadmap): probing showed a rigid leg under a ramp makes the car stick, and a bare ramp wins anyway.

**Verified**
- `npm run check` green (203 tests), `npm run e2e` no FAIL.

**Lessons**
- Do not change the number of "Coming soon" cards without a level in the new world: e2e clicks fixed card positions.
- Probe designs with a throwaway vitest file writing to the scratchpad, then delete it.
- Next: World 3 design where growth matters, tighten w1-7 / w1-13 budgets, vehicle-drop physics.

## 2026-11-10 — Run 20
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Found Little Train vehicle + level "Little Train" already on `main` (commit 5fb8094, run 19 ended before docs). Ticked roadmap.

**Verified**
- `npm run check` green (201 tests), `npm run e2e` all PASS.

**Lessons**
- Update docs in the same commit as the feature, so a cut-off run does not leave the roadmap stale.
- Train is one long body with 4 wheels, not separate cars.
- Next: tighten w1-7 / w1-13 budgets, vehicle-drop physics, hydraulic piston + World 3.

## 2026-11-10 — Run 19
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- World 2: 4 truck levels (Freight Rails, Ore Train, Iron Bridge, Tall Rocks) before the finale; helpers `rockPosts`, `rockLegs`. Level ids after w2-9 shifted by 4 (finale is w2-14); fine before launch.

**Verified**
- `npm run check` green (195 tests), `npm run e2e` all PASS.

**Lessons**
- Rocks must sit on the 2 m deck grid (x even); rocks at odd x made every design lose.
- Truck: wood truss + wood legs every 4 m wins; steel truss with wood legs loses (heavier); steel truss needs steel legs.
- vitest hides console.log here; write probe results to a file in the scratchpad.
- Next: train vehicle + 1 level, tighten w1-7 / w1-13 budgets, vehicle-drop physics.

## 2026-11-09 — Run 18
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Level select paging (15 per page) with helpers `pageCount`, `pageOfIndex` in `scoring.ts`; test added (171 total).

**Verified**
- `npm run check` green, `npm run e2e` no FAIL lines. Paging UI not visible in any current world (max 15 levels).

**Lessons**
- Tests use `test`, not `it` (vitest imports in `core.test.ts`).
- Next: truck-friendly World 2 levels, tighten w1-7 / w1-13 budgets, vehicle-drop physics.

## 2026-11-09 — Run 17
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Fixed world select locked card text: world name plus "Finish <previous world>".

**Verified**
- `npm run check` green, `npm run e2e` all PASS; looked at the worlds screenshot.

**Lessons**
- Small UI bugs: check the e2e screenshot (`e2e-shots/desktop-1c-worlds.png`) directly.
- Next: level select paging, truck-friendly World 2 levels, tighten w1-7 / w1-13 budgets.

## 2026-11-09 — Run 16
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Loading screen: `#loading` in `index.html` (title and moving bar), removed by `BootScene` once the menu starts. Shown while the script downloads.

**Verified**
- `npm run check` green (170 tests), `npm run e2e` all PASS, no FAIL lines.

**Lessons**
- The loading screen is HTML, so it shows before any JS runs; a true percentage is not possible for a module script, so the bar is a moving one.
- Next: truck-friendly World 2 levels, tighten w1-7 / w1-13 budgets, level select paging.

## 2026-11-09 — Run 15
**Done**
- Synced: only the old font/seam branches are unmerged; skipped (already in `main`).
- Per-world backdrop: `WORLD_BACKGROUNDS` in `theme.ts`; `addBackground(scene, world)`. World 2 has an orange canyon sky and rust hills in play and level select.

**Verified**
- `npm run check` green (170 tests), `npm run e2e` all PASS; looked at the World 2 screenshot.

**Lessons**
- Texture keys get a `-wN` suffix for worlds above 1; add a theme entry when adding a world.
- Next: truck-friendly World 2 levels, loading screen, tighten w1-7 / w1-13 budgets.

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
