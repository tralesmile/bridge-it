# Run log

Newest first. Every run adds: what was done, how it was verified, and lessons for the next run.

## 2026-11-11 — Run 33
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Loose 3-star budgets fixed on 9 levels (w1-8, w1-9, w1-12, w1-14, w2-3, w2-5, w2-9, w3-1, w3-6). A level spec can now list `trim` beams: the hint is the solution without them and sets the 3-star budget; the full (plain) solution still sets the money budget and the 2-star budget, so the plain way earns 2 stars and the clever way 3. `LevelEntry.textbook` keeps the plain design.
- Big Valley: the greedy search left a loose beam hanging (its weight helped). Used a cleaner design instead (drop both end triangles, keep both posts), which is also cheaper.
- Spring probe (World 5): springs as shock absorbers under a deck a truck drops 1 m onto do not work (deck moves, roads snap). Written in the roadmap.
- Coin shop (M4): `src/core/shop.ts` (pure: buy, equip, fallback for bad saves), `ShopScene` with 8 paint jobs (every vehicle gets a texture per paint) and 5 road colours. Save keeps `owned` and `equipped` (sanitized). Menu has a Shop button and the coin count; the menu car now has turning wheels.
- Achievements (M4): 20 goals in `src/core/achievements.ts` (first win, first fall, 3 stars, hint, truck, half-budget win, finish and perfect each world, 50 and 150 stars, 50 GOs, 100 broken beams, shop buy, every paint). Save keeps `achievements` and `stats` (attempts, fails, broken, hints). A gold banner drops in when one is earned (checked after each attempt, a hint, in the shop and on the menu); more than 2 at once give one "N new achievements!" banner, so an old save does not queue 6 banners. Trophies button on the menu opens the list with progress bars.
- Daily Bridge (M4): `src/core/daily.ts` picks one of 13 tested variants (truss, rock legs for car or truck, rope hangers, masts) from a hash of the date key, with a random name. Streak with a free weekly streak-saver (one missed day), 20 coins for the first daily win of a day, stored in `save.daily`. Only today's daily design is kept in the save. Daily Bridge button and streak on world select; the win panel shows the streak and "Done".
- e2e: opens the daily level, builds its solution, wins, checks streak 1 and +20 coins and no daily key in world stars.
- e2e: buys Sky paint and Brick road with 100 coins, checks the save, a too-expensive item says "You need 80 more coins.", and the level uses `car-paint-sky`.
- Tests: each trimmed level's plain design wins, fits the budget and gets exactly 2 stars; the hint gets 3 stars with no break; `dropBeams` throws on a typo.

**Verified**
- `npm run check` green (503 tests), `npm run report -- --trim` shows no LOOSE level, `npm run e2e` exit 0 with no FAIL (47 checks); screenshots checked (High Cliff hint, shop and trophies on desktop and phone, painted car on a brick road).

**Lessons**
- `node probe/try.mjs <level> '<a> <b>' ...` (in the git-excluded `probe/`) tests a level's solution minus some beams in seconds. Faster than editing levels.ts for each idea.
- Greedy trimming can keep a beam with a free end because its weight helps. Remove dangling beams by hand and look for a symmetric design instead.
- `cmd | grep ...; ls` hides the exit code of `cmd`. e2e prints PASS/FAIL lines; grep for FAIL in a saved output file.
- A probe with a one-off Playwright script (`probe/shop-shot.mjs`: vite preview on its own port, seed localStorage, click, screenshot) shows a new screen in seconds, before writing the e2e check.
- Pure core modules (`shop`, `achievements`, `daily`) with their own tests first, then a thin scene, then one e2e path, kept each feature to about 30-45 minutes.
- Next: "Cheaper than X% of players" (local estimate), Stress Test mode, Stats screen. World 5 still needs a mechanic (try a faster vehicle).

## 2026-11-11 — Run 32
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Spring material: soft and bouncy, never snaps. It is a Hooke force with damping on its two nodes (not a planck soft joint, whose stiffness changes with node mass). Pink coil art. Added last in the share code material list, so old codes still work. No level uses it yet.
- Candy Mountain design probes (all failed, written in the roadmap): spring trampoline, ramp kicker, bobbing jelly piers.
- Music: one short synth loop per world (and one for Candy Mountain), note data in `src/core/music.ts`, played by a look-ahead scheduler in `audio.ts`. Starts from `addBackground`, so every scene gets its world's loop. New Music switch in Settings (saved).
- World select cards: each world has its own colour and a small picture drawn in code (barn, mesas, ship, drawbridge).
- e2e: checks the Music switch saves, and screenshots the world select with every world open (`9z-worlds-open`).
- Min-cost search for the difficulty report (`npm run report -- --trim`): 9 levels have loose 3-star budgets (listed in the roadmap). On High Cliff a road with one post wins at 49% of the 3-star cost.

**Verified**
- `npm run check` green (437 tests), `npm run e2e` no FAIL, screenshots checked on desktop and phone.

**Lessons**
- Probe a new mechanic before building levels or UI for it. Three ideas took about an hour and none worked; finding that out in a probe was cheap.
- The cars are slow (car about 3 m/s). Jumps and bounces need more speed or a gentle shape; a car going off a flat edge always noses down.
- Planck joints give a little, so a rigid post on a moving anchor does not snap. Do not design a puzzle around "rigid beams break when the ground moves".
- Roads hang like a chain between their pins, so a long road with a few posts can win without a truss. Check new levels with `npm run report -- --trim`.
- In `background.ts` a local variable was already called `sfx`; import the audio object under another name there.
- Next: decide the Candy Mountain mechanic (try a faster vehicle with springs as landing pads), or go on to M4 (coins and shop, achievements, daily bridge).

## 2026-11-11 — Run 31
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- Ship lanes are now a list (`shipLanes`); each lane gets its own band and boat. Level JSON with one old `shipLane` still loads.
- River Town w4-12 to w4-15: Harbour Mast (leaf onto a pier, then a road hung from one mast), Two Canals (two lanes, a leaf over each, a truss between the piers), Grain Barges (the same with the truck), River Finale (20 m, truck, two canals and two rock legs).
- World 4 River Town moved into `WORLDS` (15 levels), river backdrop colours, world select cards shrink to fit 5 and put two-word names on two lines.
- Fix: on 20 m levels with a 5 m flag distance (Pirate Finale, River Finale) the flag was off the right edge. The view now leaves room for the flag.
- Animated ship: at GO each boat sails up the lane into the distance while the pistons work (Less motion: it just disappears); it comes back on Edit. e2e checks the boat fades.
- Tests: two-lane rules, old JSON, no-piston loses for all 15, Grain Barges loses with the light bridge, River Finale needs its legs, Harbour Mast needs its ropes. e2e shots all 15 River Town levels, the world 4 level select and world select.

**Verified**
- `npm run check` green (428 tests), `npm run e2e` no FAIL (31 checks), screenshots checked on desktop and phone.

**Lessons**
- New levels built only from proven parts (`leaf`, `truckLeaf`, `fanRopes`, trusses on rocks) won on the first try with 0 breaks. When a mechanic is hard to tune, combine tested parts in new layouts first.
- In e2e, `__bridgeit.scene.start('worlds')` (game level) runs the new scene on top of the old one without stopping it; use `getScene('<current>').scene.start(...)` inside `{ }` so `page.evaluate` returns nothing (returning the scene plugin fails with "object reference chain is too long").
- Check the right edge of wide levels in screenshots: the flag had been hidden since Pirate Finale and nobody saw it.
- Next: springs and World 5 Candy Mountain.

## 2026-11-11 — Run 30
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- River Town drafts w4-8 to w4-11: Toll Bridge (truck; Lock Gate shape with the strong leaf), Rope Market (12 m; a rope fan from a mast holds the fixed road, cheaper than a truss), Ferry Train (train on two strong leaves), Long Wharf (16 m; two masts, leaf at the far end; a wood truss alone breaks).
- Tests: no-piston loses for all 11 levels; light leaves lose Toll Bridge and Ferry Train; Rope Market and Long Wharf lose without ropes. e2e screenshots the 4 new levels.

**Verified**
- `npm run check` green (385 tests), `npm run e2e` no FAIL, screenshots checked (desktop and phone).

**Lessons**
- The e2e "Lock Gate wins in the game" check runs on the last level of the screenshot loop. Keep `w4-3` last when adding levels to that list.
- Probe harness: `probe/` (listed in `.git/info/exclude`) with its own `vitest.config.ts`; run `npx vitest run --config probe/vitest.config.ts`. A helper that adds each beam with `BridgeDesign.add` reports too-long beams, so a probe never "wins" with an unbuildable design (a 5 m rope did).
- Leaf onto a lower bank: the geometry works (Python check of piston ratio and that it grows the whole way), but the leaf swings too fast and breaks the hinge brace. Wins that keep a broken beam are luck; only keep designs with 0 breaks.
- Next: 4 more River Town levels (6 m leaf, lower bank, finale), then move it into `WORLDS`.

## 2026-11-11 — Run 29
**Done**
- Synced: only old font/seam branches unmerged (already in `main`); skipped.
- River Town drafts w4-4 to w4-7: Heavy Leaf (truck, 4 m leaf with the extra brace that closes the top triangle, steel on the hinge brace and long brace), Market Canal (car, 12 m, lane in the middle, fixed roads each on one wood leg from a rock, leaf from the right pier), Ferry Road (truck, two strong leaves onto a pier), Mill Wharf (Market Canal with the truck).
- Physics fix: a leaf with no piston fell over, swung round and locked onto the far side, so it won. Now only a part with a piston locks on, and only until 0.5 s after the pistons are done.
- Tests: no-piston loses for all 7 River Town levels, the open steel leaf loses Heavy Leaf, Market Canal loses without the rock legs, no lock without a piston. e2e screenshots the 4 new levels.

**Verified**
- `npm run check` green (358 tests), `npm run e2e` no FAIL, screenshots checked.

**Lessons**
- The truck broke the 4 m leaf because the middle road joint hung on one diagonal. One more brace (top node to middle road joint) made even all-wood win. Look at which beam breaks first (`break` events) before trying stronger materials.
- Probe "the solution minus the piston" again after every leaf change: the closed leaf has a different swing and found a new way to lock.
- A probe test needs `console.log` replaced by writing a file (vitest hid the output) and a long timeout for big searches. Keep probes out of `tests/` when running `npm run check` (tsc checks them).
- 6 m leaf: all 256 wood/steel mixes with one piston break a beam while the leaf hangs; it needs a new idea.
- Next: more River Town levels (6 m leaf, high cliff, rope + leaf, finale), then move it into `WORLDS`.

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
