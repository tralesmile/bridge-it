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
- [x] Spring material (`spring`: soft, bouncy, never snaps; a Hooke force with damping, not a joint; drawn as a pink coil). Tests in `tests/spring.test.ts`. No level uses it yet
- [ ] World 5 Candy Mountain (15 levels): find a mechanic where springs are the clever choice. Probes that did NOT work (run 32): a car dropping onto a spring pad noses down and flips; ramp kickers flip the car; jelly anchors that bob (moving piers) do not need springs (a rigid post just swings with the jelly, and a spring soft enough to take the bob is too soft to hold the deck). Run 33 probe: springs as shock absorbers under a deck that a truck drops 1 m onto do NOT work either (the deck moves, the roads snap; wood X braces or steel posts win). Ideas left: a faster vehicle (ice-cream van) for real jumps, springs as landing pads after a down-ramp jump, a seesaw or counterweight
- [x] Per-world backdrop (sky, hills) in play and level select (`WORLD_BACKGROUNDS`; world 2 is canyon orange)
- [x] Per-world music (`src/core/music.ts`: one synth loop per world, Music switch in Settings) and themed world select cards (world colour and a small picture drawn in code)
- [x] Difficulty report (`npm run report`, `src/core/difficulty.ts`): solution cost vs budget, and which simple designs (bare road, wood/steel truss) win within budget. Min-cost search not done.
- [x] Retune w1-7 Hay Truck (gap 6, wood fails, steel top chord wins) and w1-13 Heavy Load (wood truss on the rock; steel truss now over budget). Saved designs that break new rules are dropped on load (`BridgeDesign.restore`)
- [x] Difficulty report: min-cost search per level (`trimSolution`, greedy: drop beams and swap to cheaper materials while it still wins with no breaks; `npm run report -- --trim`, about 2 minutes)
- [x] Loose 3-star budgets (w1-8, w1-9, w1-12, w1-14, w2-3, w2-5, w2-9, w3-1, w3-6): the hint is now the cheaper design (`trim` in the level spec), which sets the 3-star budget. The plain design still sets the money budget and earns 2 stars (tested). `npm run report -- --trim` shows no LOOSE level now

## M4 Meta and retention
- [x] Coin shop, cosmetic only (`src/core/shop.ts`, `ShopScene`): 8 paint jobs for every vehicle and 5 road colours, fixed prices in coins (coins come only from new stars; all items cost 1160 of 1800 possible coins). Shop button and coin count on the menu
- [x] Shop: wood and steel colours (5 beam skins, `frame` kind; wood stays warm and steel cool, tested). Shop is now 3 rows; all items cost 1550 of 1800 coins
- [x] Shop: car shapes as a coin use (`ride` kind: Moo Car free, Camper 90, Ice Cream van 120). Looks only: the small car keeps its size and weight, so every level and test stays the same; paint goes on top; truck and train keep their shape. Middle shop row is road colours + car shapes; all items cost 1760 of 1800 coins
- [ ] Shop: shapes for the truck and train too (needs more coins first: only 40 coins are left unspent; add with World 5)
- [x] Achievements: 20 (`src/core/achievements.ts`, progress from the save; play counters in `save.stats`), gold banner when one is earned (one banner when more than 2 at once), Trophies screen with progress bars
- [x] Achievements for the daily bridge (Daily Builder, Week of Bridges: best streak 7) and the stress test (Built Tough, Over-Engineered: 10 levels held); 24 in all, Trophies grid is 5 x 5
- [ ] Achievements for World 5 (when it exists)
- [x] Daily Bridge (`src/core/daily.ts`): a level a day from the date (local time), picked from 13 tested variants with a random name; streak counter, one free streak-saver per week (keeps the streak after one missed day), 20 coins for the first win of the day. Button on world select; daily wins do not count as world stars
- [x] Daily Bridge: 20 variants (added low dock, plank rock, tide pools, three drawbridges) and a calendar (📅 on world select: today and the 13 days before; old days give a tick only, no streak and no coins)
- [x] "Cheaper than about X% of players" on the win panel (`cheaperThanPercent` in `src/core/stats.ts`: a local guess from the level budgets; 3-star budget = 85%, 2-star = 50%, full budget = 5%)
- [ ] "Cheaper than X% of players" from real online data (needs a backend; later)
- [x] Stress Test mode (`src/core/stress.ts`): a "Stress test" button on the win panel runs the same bridge with the next heavier vehicle (car to truck, truck to train). Nothing is saved; edits in the test do not change the saved bridge
- [x] Stress Test: `save.held` keeps levels whose stress test held (the only save write in a stress test); gold 💪 badge on the level select button; 2 achievements
- [x] Stats screen (`statRows` in `src/core/stats.ts`, `StatsScene`, Stats button on the menu): levels, stars, worlds, attempts, wins, win rate, fails, broken beams, hints, cost, coins, achievements, daily streak

## M5 Creativity
- [x] Sandbox mode (`src/core/sandbox.ts`, `SandboxScene`, Sandbox button on the menu): pick gap (6/10/16/24 m), vehicle, far side (same, 2 m lower, 2 m higher) and helpers (rocks, high posts, both); every material, no money limit (cost shown), no stars. Nothing is scored (no coins, fails, stats); the bridge is saved per setup and can be shared as a code (share codes now read sandbox and daily ids). Tool bar gets narrower buttons when a level has 6 materials
- [x] Sandbox achievements: `save.sandboxWins` (setup ids crossed, the only sandbox save write), Tinkerer (5 different setups) and Mad Engineer (the train over 24 m; a steel-leg truss on rocks wins, tested). 26 achievements; the Trophies grid has 6 columns and long names shrink to fit
- [x] Level editor for players, first version (`src/core/custom.ts`, `EditorScene`, Editor button on the menu): gap 2-24 m, both cliff heights (-4 to +4 m), vehicle, materials (road always), money, and up to 16 rocks tapped on the grid. The whole level lives in its id (`custom-<data>`), so saved bridges and bridge codes work with no server. Test plays it; when your own bridge crosses, the cheapest cost is kept and "Copy level code" (`BL1.<data>.<check>`) unlocks; the maker's cost sets the 3-star budget. "Paste code" plays a friend's level. Player levels give no coins, stars or stats (no farming)
- [x] Level editor: "My levels" (up to 12 levels in `save.editor.levels`, old one-level saves move over): cards with gap, vehicle and the crossed cost; tap to open, + New level ("My Level 2", ...), bin twice to delete (never the last one); rename with the name button. "Edit a copy" on a friend's level result adds it as your own level (not crossed yet) and brings your bridge along. Levels with the same spec share a saved bridge; deleting or changing one keeps it for the other
- [x] Level editor: a 🔗 Share button per card in My levels (under the bin) copies a crossed level's code without opening it; off for levels not crossed yet. The main Copy button now names the level in its message
- [x] Level editor: ship lanes and the flag distance. "🪨 Rocks / 🚢 Ship lanes" switch under the grid: in lane mode a tap adds a 4 m lane around the tap (or removes the one tapped); up to 3, side by side for a wide one; Piston is added to the materials with the first lane; rocks cannot go inside a lane. "Flag" stepper (2 to 8 m). Level ids format version 2 only when a level has lanes or a moved flag, so old level ids and codes stay the same
- [x] Level editor: stars on friends' levels (`save.friendStars`, newest first, at most 40, `addFriendStars` / `readFriendStars` in core). The result panel says "New best!" or "Your best: N ★"; the play title shows ★★☆ once crossed. No coins or stats
- [x] Saved bridges of player levels are trimmed: `saveDesign` on a `custom-` id moves it to the end and drops the oldest ones that are not in My levels or `friendStars`, keeping the newest 20 (`staleCustomDesigns` in core)
- [x] Level editor achievements: Level Maker (cross a level you made), Level Designer (5 of them), Good Friend (cross a friend's level). 29 achievements
- [ ] Level editor: show 🚢 on My levels cards that have ship lanes; a "(copy)" name for Edit a copy
- [ ] Trophies grid fits 30 cards (6x5, 29 used): more achievements (World 5) need pages or smaller cards
- [x] Share codes core: `encodeBridge` / `decodeBridge` in `src/core/share.ts` (format `BI1.<levelId>.<data>.<check>`, checked against level rules; tested on all solutions)
- [x] Share codes UI: "Copy bridge code" on the win panel, "Paste code" button on the play scene (uses window.prompt; not covered by e2e)

## M6 Web portals
- [x] Build flavours: `npm run build` (web, no external requests), `build:crazygames` (dist-crazygames), `build:poki` (dist-poki). `vite.config.ts` adds only that portal's SDK script and sets `__PLATFORM__`; `npm run flavours` builds both and checks the scripts (in CI)
- [x] Ad timing rule (`src/core/adPolicy.ts`): no break in the first 5 minutes, at least 3 minutes between breaks, breaks only from the win panel; sound pauses during ads
- [x] CrazyGames SDK v3 adapter: init, loading start/stop, gameplay start/stop (never twice), midgame and rewarded ads; a missing SDK (ad blocker) never breaks the game. Tested with a fake SDK
- [x] Poki SDK adapter: init, gameLoadingFinished, gameplay start/stop, commercialBreak, rewardedBreak. Tested with a fake SDK
- [ ] Test both portal builds in the real portal tools (CrazyGames preview, Poki Inspector); needs the owner's accounts
- [ ] CrazyGames data module for the save (cloud save when logged in) and Poki share link for bridge codes
- [x] Bridge codes use an in-game HTML dialog (`src/game/codeDialog.ts`) instead of window.prompt, which portals and app web views may block. Keys typed in it do not reach the game. Copy falls back to the same dialog (code selected) when the clipboard is blocked. Tested in e2e
- [ ] Check the rotate card inside portal iframes (needs the real portal preview tools)
- [x] Size check in CI (`scripts/size-check.mjs`, part of `npm run check`; dist is 1.6 MB)
- [x] Loading screen (HTML bar shown while the script downloads, fades out when the menu starts)

## M7 Mobile apps
- [x] Capacitor 8 Android and iOS projects (`android/`, `ios/`, `capacitor.config.ts`, app id `com.tralesmile.bridgeit`, landscape only). `npm run app:sync` builds and copies the game, `scripts/app-check.mjs` checks ids, orientation and no network scripts. CI job `android` builds a debug APK (first run green on 2026-11-12, about 2 minutes; no Android SDK in the cloud runs)
- [x] App build flavour: `npm run build:app` (`--mode app`, `__PLATFORM__ = 'app'`, output `dist-app`, the Capacitor `webDir`). `npm run app:sync` uses it. Only this build carries the AdMob code (`npm run flavours` checks web and portal builds have none; `app-check` checks the apps have it)
- [x] App icon (square, round, adaptive layer) and splash screens drawn in code: `npm run app:icons` (`scripts/app-icons.mjs`, canvas 2D in Chrome) writes every Android density and the iOS icon and splash. PNGs are RGB with no alpha (App Store rule), only the round icon keeps see-through corners
- [ ] Look at the icon on a real phone home screen (owner) and in the Play Console preview
- [x] AdMob adapter (`AdMobPlatform` in `src/game/platform.ts`, `@capacitor-community/admob` 8.2.1): UMP consent form before any ad (EU and UK), iOS tracking prompt once, interstitial for breaks (our 5-minute rule still applies), rewarded for hints, ads preloaded, sound paused while an ad plays. A hint is free when no ad can be shown (consent refused, offline, no fill); only closing the ad early gives none. "Privacy choices" button in Settings when consent applies. Google's test app ids and ad units for now. Tested with a fake plugin (8 tests)
- [ ] Real AdMob ids (after the owner's account): app ids in `AndroidManifest.xml` and `Info.plist`, ad units in `ADMOB_UNITS` with `testing: false`; full SKAdNetwork list from Google in `Info.plist`; `app-ads.txt` on the owner's website
- [ ] Check the AdMob flow on a real phone (consent form, test ads show and close, hint after a rewarded ad); first on the CI debug APK
- [x] RevenueCat purchases (`src/game/store.ts`, `@revenuecat/purchases-capacitor` 13.8.0, app build only): Remove ads ($3.99: no breaks, hints without ads) and Supporter pack ($9.99: Remove ads plus 300 coins, once per save), Restore purchases. Prices come from the store in the player's currency. Pending payments unlock later through the update listener; a refund brings ads back but never takes coins. A double tap starts one payment. The saved state works offline. "Remove ads" button in Settings opens the Support window; hidden until the owner's RevenueCat keys are in `REVENUECAT_KEYS`. Tested with a fake plugin (13 tests); `npm run flavours` checks web and portal builds have no RevenueCat code
- [ ] RevenueCat keys and products (after the owner's accounts): public SDK keys in `REVENUECAT_KEYS`, products `remove_ads` and `supporter_pack` (non-consumable) in Play Console and App Store Connect, entitlements `no_ads` and `supporter` in RevenueCat; then test a sandbox purchase, a pending payment and restore on real phones
- [x] Shop items only for supporters: Rose Gold paint (`supporter: true` in `SHOP_ITEMS`). Not for coins; owned once the Supporter pack is seen and kept for good (like the coins, even after a refund). The card (gold ring, heart) shows only in the app with a store or once owned; tapping it opens the Support window. The paint row uses narrower cards when it has 9
- [x] Safe areas (the game box stays inside the notch insets), back step for Escape and the Android back button (`src/game/back.ts`: open windows close first, then the scene goes back; on the menu the app minimizes), haptics on placing beams, breaks and splashes (`src/game/native.ts`, follows the Screen shake switch; plugin code only loads in the app)
- [x] Codemagic config (`codemagic.yaml`): `ios-release` builds the .ipa on a cloud Mac and sends it to TestFlight; `android-release` builds a signed .aab (the signing block in `android/app/build.gradle` only turns on with Codemagic's keystore variables). Not run yet: needs the owner's accounts
- [ ] First real Codemagic run (after the owner connects the accounts); fix whatever it reports

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
