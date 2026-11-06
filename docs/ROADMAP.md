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
- [x] Fix visible seam in the hills at x=1024 (menu background tile edge)
- [ ] Ghost of the last attempt while editing
- [ ] Stress shown by thickness and pulsing as well as colour (colour-blind safe)
- [ ] Vehicle bullet bodies, NaN watchdog that ends an attempt as a collapse
- [ ] Driver face reacts (calm, worried, screaming) based on bridge stress
- [ ] Confetti and coin fly-in on win; star pop sounds
- [ ] Settings panel: sound, reduced motion, screen shake
- [ ] Portrait phone: rotate-device card
- [ ] Camera pan and zoom for levels wider than the screen
- [ ] Pause and resume an attempt when the app is hidden
- [ ] GitHub Actions CI running npm run check and the browser test

## M3 Content
- [ ] Level format supports different cliff heights, extra rocks and goal position; editor-friendly JSON
- [ ] World 1 expanded to 15 levels with a saw-tooth difficulty curve
- [ ] Rope material (tension only) and World 2 Canyon Rails with a train (15 levels)
- [ ] Hydraulic piston and World 3 Pirate Bay (15 levels)
- [ ] Springs and World 4 Candy Mountain (15 levels)
- [ ] World select screen with per-world themes (sky, hills, music)
- [ ] An automated "difficulty report": solution cost, min-cost search, and fail rate of simple designs per level

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
- [ ] Share codes (compact base64 level and bridge strings)

## M6 Web portals
- [ ] Build flavours: web, crazygames, poki (each picks its platform adapter)
- [ ] CrazyGames SDK v3 adapter (ads, gameplay events, data)
- [ ] Poki SDK adapter
- [ ] Size check in CI (fail if first load over 8 MB)
- [ ] Loading screen with progress bar

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
