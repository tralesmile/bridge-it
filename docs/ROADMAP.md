# Roadmap

Each scheduled run takes the first unchecked tasks from the top, finishes and verifies them, then ticks them here. Tasks are small enough for one run. Add new tasks you discover under the right milestone.

## M1 Core prototype (done)
- [x] Vite + TypeScript + Phaser 4 + Planck.js project
- [x] Bridge design model: grid snap, beam rules, budget, undo, erase
- [x] Deterministic physics: beams break by filtered force, vehicles with motors and suspension
- [x] World 1 Farm Valley: 8 levels, each with a verified solution
- [x] Menu, level select, play scene, results with stars, hint after 2 fails
- [x] Art drawn in code: sky, hills, clouds, cliffs, water, car, truck, anchors, stars, particles
- [x] Synthesized sound effects; save system safe against blocked or corrupted storage
- [x] Unit tests, level solvability tests, browser end-to-end test at desktop and phone sizes

## M2 Game feel and polish
- [x] Bundle Fredoka font locally (OFL licence file included) and use it everywhere
- [x] Fix visible seam in menu hills (whole-number frequencies, rim on top edge only)
- [x] Ghost of the last attempt while editing (red glow under beams that broke or were near breaking)
- [x] Stress shown by thickness and pulsing as well as colour (colour-blind safe)
- [x] Vehicle bullet bodies, NaN watchdog that ends an attempt as a collapse
- [x] Driver face reacts (calm, worried, screaming) based on bridge stress
- [x] Confetti and coin fly-in on win; star pop sounds
- [x] Settings panel: sound, reduced motion, screen shake
- [x] Portrait phone: rotate-device card (CSS overlay in index.html)
- [x] Zoom-out to fit levels wider than the screen (play scene `ppm`, min 28 px/m)
- [ ] Pan for levels wider than ~40 m (only needed past the zoom limit; no such level yet)
- [x] Pause and resume an attempt when the app is hidden
- [x] GitHub Actions CI running npm run check and the browser test (`.github/workflows/ci.yml`; first real run not yet seen)

## M3 Content
- [x] Bug: world select lock text fixed (world name on the card, "Finish <previous world>" below)
- [x] Level format supports different cliff heights and goal distance (rocks are anchors; no separate rock type needed)
- [x] Editor-friendly JSON export/import of levels (`levelToJson`, `levelFromJson` with checks; round-trip tested)
- [x] First level with uneven cliffs and a wide gap (w1-9 High Cliff, 16 m; fits the screen without zoom-out, so zoom-out is still unseen)
- [x] World 1 expanded to 15 levels with a saw-tooth difficulty curve (10 Long Haul, 11 Little Brook, 12 Two Rocks, 13 Heavy Load, 14 Deep Gorge, 15 Farm Finale)
- [x] Level select pages when a world has more than 15 levels (`LEVELS_PER_PAGE`, ◀ ▶ at top right; opens on the page of the first unstarred level; no world has >15 yet, so not seen in e2e)
- [x] Vehicle drops understood (`tests/vehicle.test.ts`): a 1 m drop is fine; a 2 m drop tips the vehicle over (front wheels drop first), which now loses as "Flipped!" instead of winning on its roof. A truck on a raised-start ramp breaks a wood leg at the ramp foot (it carries the whole truck); steel legs win.
- [x] Level idea: lower right cliff (w3-1 Low Dock) and truck ramp that needs a steel leg at the ramp foot (w3-2 Ramp Foot). Both in `DRAFT_WORLDS` (tested, opened by id, not in menus yet)
- [x] Bug: cars flipped going down a 1 m slope (wheel motors braked at full torque). Motors now coast downhill (10% brake torque)
- [x] Rope material (tension only, 4.5 m, cheap, weak; `RopeJoint`), tested with a rope-braced truss
- [x] World select screen (`worlds` scene; later worlds show Coming soon; a world opens when the last level of the one before has a star)
- [x] World 2 Canyon Rails: 10 rope levels (hanger bridges, up to a 32 m gap)
- [x] World 2: 4 truck levels (12 to 24 m, wood truss on rocks every 4 m; levels 10-13, finale is now 14)
- [x] World 2: Little Train vehicle (long 4-wheel body, not multi-car) and level w2-14 Little Train (15 levels total; finale is w2-15)
- [ ] (partly: Sparse Posts and Long Cable mix truss and one rope) Rope level design: ropes cost more than a wood Warren truss when used as X braces; find a level where rope is the clever choice (long span, tension ties)
- [x] Hydraulic piston material (`piston`: 3.2 m max, 350/m, grows 50% between 0.25 s and 1.5 s of an attempt; tested)
- [x] Bug: a beam between two anchors crashed the attempt (planck joint between two static bodies); such beams now get no joint. Test in `tests/core.test.ts`
- [x] World 3 Pirate Bay: 15 levels in `WORLDS` (12 Cargo Hold, 13 One Mast, 14 Deep Water, 15 Pirate Finale added this run), ocean backdrop, world select card
- [x] Piston mechanism: drawbridges. Levels can have a `shipLane` (no node or beam inside or across it). The bridge is built standing up on the cliff; a piston swings it down; a road end that comes down onto a cliff edge or pier anchor locks there (`latch` event) and that part's pistons freeze. In piston levels the vehicle waits until the pistons are done. Tests in `tests/drawbridge.test.ts`
- [x] Draft World 4 River Town (`DRAFT_WORLDS`): w4-1 Drawbridge, w4-2 Twin Leaves (two leaves onto a pier), w4-3 Lock Gate (fixed span to a pier + drawbridge). Ship lane art (pale band, dashed edges, sailboat)
- [x] River Town w4-4 to w4-7: Heavy Leaf (truck leaf: close the top triangle, steel at the hinge and long brace), Market Canal (fixed roads on rock legs + drawbridge from a pier), Ferry Road (two truck leaves onto a pier), Mill Wharf (Market Canal with the truck)
- [x] Latch rule: only a part that has a piston can lock on, and only until 0.5 s after the pistons are done (a closed leaf with no piston fell over, swung round and locked onto the far side)
- [x] River Town w4-8 to w4-11: Toll Bridge (Lock Gate with the truck, strong leaf), Rope Market (rope fan from a mast on the fixed road + leaf; ropes beat a truss), Ferry Train (train on two strong leaves), Long Wharf (16 m, two masts + leaf at the far end)
- [x] World 4 River Town complete: w4-12 Harbour Mast (leaf first, then a rope fan), w4-13 Two Canals, w4-14 Grain Barges (truck), w4-15 River Finale (20 m, truck, two canals). In `WORLDS` with a river backdrop and a world select card (cards now shrink to fit 5)
- [ ] Drawbridge ideas for later: 6 m leaf; leaf onto a lower bank (its hinge brace breaks from the swing speed, so it needs a slower swing or a damper)
- [x] Ship lane list: `shipLanes` (old share codes with one `shipLane` still load)
- [x] Bug: the finish flag was off-screen on 20 m levels with a 5 m flag distance; the view now leaves room for the flag
- [x] Animated ship: at GO each lane's boat sails up into the distance (smaller, fading) while the pistons work; hidden at once with Less motion; back when you edit (visual only)
- [ ] Springs and World 5 Candy Mountain (15 levels)
- [x] Per-world backdrop (sky, hills) in play and level select (`WORLD_BACKGROUNDS`; world 2 is canyon orange)
- [ ] Per-world music and themed world select cards
- [x] Difficulty report (`npm run report`, `src/core/difficulty.ts`): solution cost vs budget, and which simple designs (bare road, wood/steel truss) win within budget. Min-cost search not done.
- [x] Retune w1-7 Hay Truck (gap 6, wood fails, steel top chord wins) and w1-13 Heavy Load (wood truss on the rock; steel truss now over budget). Saved designs that break new rules are dropped on load (`BridgeDesign.restore`)
- [ ] Difficulty report: min-cost search per level (to check 3-star budgets are not too loose)

## M4 Meta and retention
- [ ] Coins, vehicle collection and bridge skins shop (cosmetic only)
- [ ] Achievements (start with 20)
- [ ] Daily Bridge generated from the date, with a streak counter and a weekly free streak-saver
- [ ] "Cheaper than X% of players" (local estimate first, online later)
- [ ] Stress Test mode after a level is solved
- [ ] Stats screen

## M5 Creativity
- [ ] Sandbox mode
- [ ] Level editor for players
- [x] Share codes core: `encodeBridge` / `decodeBridge` in `src/core/share.ts` (format `BI1.<levelId>.<data>.<check>`, checked against level rules; tested on all solutions)
- [x] Share codes UI: "Copy bridge code" on the win panel, "Paste code" button on the play scene (uses window.prompt; not covered by e2e)

## M6 Web portals
- [ ] Build flavours: web, crazygames, poki (each picks its platform adapter)
- [ ] CrazyGames SDK v3 adapter (ads, gameplay events, data)
- [ ] Poki SDK adapter
- [x] Size check in CI (`scripts/size-check.mjs`, part of `npm run check`; dist is 1.6 MB)
- [x] Loading screen (HTML bar shown while the script downloads, fades out when the menu starts)

## M7 Mobile apps
- [ ] Capacitor 8 Android and iOS projects
- [ ] AdMob rewarded and interstitial with consent form and ATT prompt
- [ ] RevenueCat purchases: remove ads, supporter pack; restore purchases
- [ ] Safe areas, Android back button, haptics, splash screen and icons
- [ ] Codemagic config for iOS builds without a Mac

## M8 Quality and reach
- [ ] Localization system and 8 languages
- [ ] GameAnalytics events (level start, complete, fail, hint, ad, purchase)
- [ ] Automatic low-effects mode on slow devices
- [ ] Accessibility review

## M9 Store and marketing assets
- [ ] Screenshot generator script (renders store screenshots from the game)
- [ ] Trailer capture script (records gameplay clips with Playwright)
- [ ] Store texts, press kit, privacy policy page
- [ ] Owner checklist for posting

## M10 Launch and live ops
- [ ] Release candidate builds for web, Android and iOS
- [ ] Launch-day checklist and first update plan
