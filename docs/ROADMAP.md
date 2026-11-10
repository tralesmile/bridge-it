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
- [ ] Level idea: a lower right cliff (1 m drop) and a truck ramp level that needs a steel leg at the ramp foot
- [x] Rope material (tension only, 4.5 m, cheap, weak; `RopeJoint`), tested with a rope-braced truss
- [x] World select screen (`worlds` scene; later worlds show Coming soon; a world opens when the last level of the one before has a star)
- [x] World 2 Canyon Rails: 10 rope levels (hanger bridges, up to a 32 m gap)
- [x] World 2: 4 truck levels (12 to 24 m, wood truss on rocks every 4 m; levels 10-13, finale is now 14)
- [x] World 2: Little Train vehicle (long 4-wheel body, not multi-car) and level w2-14 Little Train (15 levels total; finale is w2-15)
- [ ] (partly: Sparse Posts and Long Cable mix truss and one rope) Rope level design: ropes cost more than a wood Warren truss when used as X braces; find a level where rope is the clever choice (long span, tension ties)
- [x] Hydraulic piston material (`piston`: 3.2 m max, 350/m, grows 50% between 0.5 s and 2 s of an attempt; tested)
- [ ] World 3 Pirate Bay (15 levels) with piston levels. Probing found no level where the piston is *required*: a rigid leg or prop under a ramp made the car get stuck, while the bare ramp won. Needs a design where growth matters (e.g. a gap that opens, or a start cliff lower than the road). Add `WORLD_BACKGROUNDS` entry and remove Pirate Bay from `COMING_SOON` (e2e positions depend on card count).
- [ ] Springs and World 4 Candy Mountain (15 levels)
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
