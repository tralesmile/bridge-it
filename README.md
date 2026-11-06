# Bridge It!

Build it. Break it. Laugh. Try again. A physics bridge-building puzzle for the web, Android and iOS.

## Run it
```bash
npm install
npm run dev      # open the printed local address
```

## Check it
```bash
npm run check    # type check + unit/level tests + production build
npm run e2e      # real-browser test at desktop and phone sizes
```

## Where things are
- `src/core` — rules and physics (no rendering): bridge design, simulation, levels, scoring
- `src/game` — Phaser scenes, art drawn in code, sound, UI, save, platform adapter
- `tests` — unit and level-solvability tests
- `scripts/e2e.mjs` — browser test
- `docs/PLAN.md` — full plan; `docs/ROADMAP.md` — task list; `docs/RUN_LOG.md` — progress; `docs/NEEDS_FROM_OWNER.md` — what the owner must do
