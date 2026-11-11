# Bridge It! Full team plan

Bridge It! is built by a two-member team: you (owner: accounts, money, final decisions, real-device testing) and Claude (every other role below). The rule for every choice is the cheapest option that does not lower quality the player can see. Target: web launch on CrazyGames and Poki first, then Google Play and the App Store from the same code.

## 1. Roles and what each delivers

| Role | Owner | Delivers |
| --- | --- | --- |
| Producer | Claude | Roadmap, run log, weekly progress, risk list, "needs from owner" list |
| Game designer | Claude | Core loop, rules, economy, progression, difficulty curve |
| Level designer | Claude | 90+ levels, each with a machine-checked solution |
| Art director and UI designer | Claude | Design system, all art drawn in code (no paid assets), screens, store art |
| Engineer | Claude | Game code, physics, platform adapters, mobile builds, CI |
| QA | Claude | Unit tests, level solvability tests, browser tests on desktop and phone sizes, edge-case list below |
| Sound designer | Claude | Synthesized sound effects in code; music loops from free CC0 sources |
| Marketing | Claude drafts, owner posts | Clip ideas, captions, store text, press kit, trailer capture |
| Business | Claude advises, owner decides | Monetization rollout, pricing, KPIs, portal and publisher strategy |
| Owner | You | Create accounts, pay the $25 + $99 fees, test on your phone, post videos, sign agreements |

## 2. Gameplay that catches more players

**Core (built first)**
- Playable within 3 seconds of loading: no login, no long tutorial; level 1 teaches by doing.
- Build with road, wood and steel; triangles hold, squares bend; beams turn red under stress.
- Slow-motion collapse with sparks, wood chips and a splash: the moment people share.
- 3 stars per level: cross, cross under budget, cross under a tight budget.

**Hooks that bring players back**
- **Daily Bridge:** one new level a day, generated from the date so every player gets the same one; best cost shown against other players' results.
- **"Cheaper than X% of players":** after each win, show how your cost ranks. Strong motivation to retry for 3 stars.
- **Stress Test mode:** after you solve a level, send 10 cars, a bus and a cow parade over it. Pure fun, great clips.
- **Sandbox mode:** free building, unlimited budget, any vehicle. YouTubers love this.
- **Level editor with share codes:** players make levels and share a short code. Endless free content.
- **Vehicle collection:** Moo Car, Hay Truck, School Bus, Pizza Scooter, Monster Truck, Ice-Cream Van, Rocket Cart. Some unlock by stars, some by coins.
- **Bridge skins:** candy, neon, pirate rope, gold. Cosmetic only.
- **Achievements:** around 50, such as "Cheapskate" (3 stars under $1,000), "Overengineer" (spend the full budget), "Splash Zone" (fall 25 times).
- **Ghost replay:** your last attempt shown faintly while you edit.
- **Seasonal worlds:** Halloween, Winter and Summer themes as free updates.

**Worlds and new mechanics**

| World | New mechanic | Vehicle |
| --- | --- | --- |
| 1. Farm Valley | Road, wood, steel, rock pillars | Moo Car, Hay Truck |
| 2. Canyon Rails | Rope (tension only), long spans | Steam train |
| 3. Pirate Bay | Slopes to low docks, masts for ropes, deep rocks | Pirate ship, pizza scooter |
| 4. River Town | Hydraulic pistons: drawbridges over ship lanes | Delivery van |
| 5. Candy Mountain | Springs to jump gaps, wobbly jelly ground | Ice-cream van, school bus |
| 6. Space Port (update) | Low gravity | Moon rover |
| 7. Lava City (update) | Wood burns near lava | Fire truck |

(2026-11-11: pistons moved from Pirate Bay to their own world, River Town, because Pirate Bay was full of good slope and rope levels.)

## 3. First five minutes (the retention script)

1. **Second 0–3:** menu with a bouncing title; one big PLAY button.
2. **Level 1:** a 2 m gap; drag one road; the car crosses; 3 stars, confetti. The player feels clever in 20 seconds.
3. **Level 2:** a longer gap that sags until you prop it on a rock pillar.
4. **Level 3:** the first real lesson: "Triangles never bend." The first funny collapse happens here.
5. **Minutes 3–5:** first coins, first skin preview, first "Cheaper than 64% of players". No ads in the first 5 minutes.

## 4. Design system (all made by us, $0)

- **Style:** "chunky toy world": rounded shapes, soft shadows, a light rim highlight, warm saturated colours.
- **Colours:** one palette in `src/game/theme.ts`. Each world gets its own sky gradient, and bridges always contrast with the background.
- **Type:** Fredoka (free SIL Open Font licence), bundled locally so no external requests are made (portals prefer that). The fallback is a rounded system font.
- **Components:** chunky buttons with a pressed state, cream panels, star rows, toast messages, a cost bar with star ticks.
- **Motion:** squash and stretch on taps, Back.easeOut for rewards, 1.1 s slow motion on the first break, and small screen shakes that can be switched off.
- **Touch:** every target is at least 48 px on a phone, and drags start only from visible joints.
- **Accessibility:** stress shown by colour plus line thickness and pulsing (not only red), a reduced-motion setting, a sound toggle, and high-contrast text strokes.
- **Art pipeline:** every sprite is drawn with Canvas in `src/game/art.ts`, so there are no art files to buy and the download stays tiny. Store screenshots and the icon are rendered from the game itself.

## 5. Technical plan

- **Stack:**
  - TypeScript, Vite and Phaser 4.2.1 for rendering
  - Planck.js 1.5 (Box2D) for physics
  - Capacitor 8 for Android and iOS
  - Vitest and Playwright for tests
- **Architecture:** `src/core` holds the pure rules and physics with no rendering, so it is fully unit-tested. `src/game` holds the Phaser scenes, art, sound and UI. `src/game/platform.ts` is the one interface for portals and app stores.
- **Determinism:** fixed 1/120 s physics steps, so the same design gives the same result on every device. This is required for fair Daily Bridge rankings.
- **Quality gates (every change):**
  - type check
  - unit tests
  - level solvability tests (every level's stored solution must cross, and an empty bridge must fail)
  - production build
  - browser tests at desktop and phone sizes with zero console errors
- **Size budget:** first load under 3 MB (the limit is 8 MB for Poki). Today it is about 1.6 MB, or 420 KB gzipped.
- **Performance budget:** 60 fps on a 2019 mid-range Android phone. Physics catches up at most 8 steps per frame and long frames are clamped, so a slow phone slows down instead of exploding.
- **Saves:** versioned JSON in localStorage, cleaned on every load, with in-memory fallback when storage is blocked (common in portal iframes).
- **CI:** GitHub Actions (free for private repos up to 2,000 minutes a month) runs every gate on every push.

## 6. Edge cases we design and test for

**Input**
- [x] A second finger while dragging is ignored; only the first pointer builds.
- [x] Releasing a drag outside the canvas or the window cancels or finishes cleanly.
- [x] Taps on buttons never also place beams.
- [x] Dragging past a material's maximum length snaps back to the furthest valid grid point.
- [x] Building inside the ground, off the map, over budget, duplicate beams and zero-length beams are all refused with a clear message.
- [ ] Portrait phones: show a "rotate your phone" card, or switch to a portrait layout.
- [ ] Pinch zoom and pan on large levels; a two-finger pan must never place a beam.
- [ ] Android back button: back from a level to the menu, and confirm before quitting.

**Physics**
- [x] Impact spikes do not snap beams unfairly (the load is filtered over about 0.1 s).
- [x] Same input gives the same result (determinism test).
- [ ] Watch for NaN or exploding bodies; if detected, end the attempt as a collapse instead of freezing.
- [ ] Fast vehicles must not pass through thin roads (bullet bodies for the vehicle).
- [ ] A vehicle stuck or driving backwards ends the attempt within 3 seconds ("Stuck!"); this is built and needs more tests.

**App lifecycle**
- [x] A tab switch or a long frame never makes physics jump (frames clamped to 50 ms).
- [x] Sound pauses when the game is hidden.
- [ ] A phone call or app backgrounded mid-attempt: pause the attempt and resume on return.
- [ ] A very slow device: lower the effects quality automatically.

**Storage**
- [x] Blocked storage, a full quota and corrupted or edited saves never crash the game.
- [ ] Save version migration when the format changes.
- [ ] Cloud save for mobile, and cross-device play with CrazyGames accounts.

**Ads and purchases**
- [ ] An ad that fails to load, adblock or offline: the button says "No ad right now" and the game continues.
- [ ] An ad closed early gives no reward; a double tap never gives two rewards.
- [ ] No ad ever appears during an attempt or in the first 5 minutes.
- [ ] Restore purchases on iOS and Android; handle pending and refunded payments.
- [ ] Remove-ads also hides interstitials on every device of the same account.

**Platforms**
- [ ] Poki and CrazyGames SDKs load only in those builds; if an SDK fails, the game still runs.
- [ ] iOS safe areas (notch), the Android cut-out and the gesture bar.
- [ ] Safari audio unlock on the first tap (unlock is built; needs testing on a real iPhone).
- [ ] An iframe losing keyboard focus on portals.

**Language and legal**
- [ ] Text in 8 languages (English, German, Spanish, Portuguese, French, Turkish, Russian, Macedonian), with layouts that fit long words.
- [ ] GDPR consent through the ad SDK's consent form on mobile; the portals handle consent on web.
- [ ] Age rating 13+ (PEGI 3–7 content, but 13+ keeps normal ads legal); privacy policy page.
- [ ] No loot boxes, no fake timers, real-money prices shown (EU consumer rules).

## 7. Spending the least money

| Need | Free choice | Paid only if |
| --- | --- | --- |
| Engine, physics, tools | Phaser, Planck.js, Vite, VS Code | Never |
| Art | Drawn in code by Claude | A hit needs a mascot redesign |
| Font | Fredoka (SIL Open Font licence) | Never |
| Sound effects | Synthesized in code | Never |
| Music | CC0 loops (OpenGameArt, Pixabay Music) | A hit needs a signature theme |
| Hosting | Cloudflare Pages or GitHub Pages | Never |
| Domain | The pages.dev subdomain | Buy a domain (about $10 a year) at web launch |
| iOS builds | Codemagic, 500 free Mac minutes a month | Never at this size |
| Backend | Supabase or Firebase free tier | Over 50,000 monthly players |
| Analytics | GameAnalytics | Never |
| Store fees | Google $25 once, Apple $99 a year | Required |
| Marketing | TikTok, Shorts, Reels and Reddit, all organic | Only after D7 retention is proven |

**Cash needed for year one: about $124, plus about $10 for a domain.**

## 8. Marketing plan

- **From now:** post one clip a day once the game looks good: fail compilations, "can you solve it?", cheapest-bridge challenges, and a devlog ("Day 12 of making a bridge game alone in Macedonia").
- **Web launch:** posts on Reddit r/WebGames and r/IndieGaming, the CrazyGames launch, the Poki pitch, and a Product Hunt-style post on itch.io.
- **Mobile launch:** store pages tuned for search (keywords such as "bridge builder", "bridge constructor", "physics puzzle"); a first screenshot showing a funny collapse; then send the build to the self-serve test portals of Voodoo, Homa, SayGames and CrazyLabs.
- **Every update:** a new world clip, a request for Google Play and App Store featuring, and a short Daily Bridge highlight.

## 9. Business plan

- **Money order:**
  1. Portal ad revenue on web
  2. Rewarded ads on mobile (hint, skip, double coins)
  3. A remove-ads purchase for $3.99
  4. A Supporter pack for $9.99
  5. A cosmetic Builder Pass, only if D30 retention is above 5%
- **KPIs we watch:**
  - D1, D7 and D30 retention
  - average session length
  - level 1–10 funnel
  - ad views per daily player
  - rewarded ad opt-in rate
  - earnings per daily player
- **Decision gates:**
  - **Fun gate:** testers ask for "one more".
  - **Web gate:** D1 above 30% and over 10 minutes of play.
  - **Mobile gate:** D1 40%+ and D7 12%+, then talk to publishers.
- **Company and tax:** start as an individual; register a sole proprietorship or DOO in North Macedonia before payouts grow (personal income tax is a flat 10%). Ask a local accountant about VAT on foreign digital sales.

## 10. Release checklists

**Web**
- [ ] Build under 8 MB
- [ ] Platform SDK adapter
- [ ] Title, description, tags and 5 screenshots
- [ ] A 15-second gameplay video
- [ ] Icon at 512×512 and a cover image
- [ ] No external network requests
- [ ] Mobile web tested

**Google Play**
- [ ] AAB targeting API 36
- [ ] App icon and feature graphic at 1024×500
- [ ] 8 screenshots
- [ ] Privacy policy URL
- [ ] Data safety form
- [ ] Content rating
- [ ] 12 testers for 14 days
- [ ] Production review

**App Store**
- [ ] Built with Xcode 26 via Codemagic
- [ ] Screenshots at 6.9" and 6.5"
- [ ] Privacy labels
- [ ] Tracking prompt (ATT) text
- [ ] Age rating
- [ ] Review notes
- [ ] TestFlight round first
