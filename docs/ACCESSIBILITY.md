# Accessibility review

First review: 2026-11-16 (run 52). Checked against the Game Accessibility Guidelines (basic level) and WCAG contrast for large text.

## What the game already does
- **Motion**: a Reduced motion switch in Settings stops the menu title bob, the car loop, cloud drift, the stress pulse, confetti and camera shake. A separate Screen shake switch. The loading bar and rotate card follow the device's `prefers-reduced-motion`.
- **New (run 52)**: a new save starts with Reduced motion on when the device asks for less motion.
- **Colour is never the only signal**: beam stress also makes the beam thicker and pulse; the cost bar has number text and star ticks; locked levels and trophies show a lock icon.
- **Sound**: no information is given only by sound (every sound has a picture: break sparks, splash, win panel). Sound and music have separate switches.
- **Time**: no timers. The drive pauses when the app is hidden and waits for a tap.
- **Text**: plain short English, 8 languages, rounded font with Cyrillic. Long words shrink instead of being cut.
- **Input**: everything works with one finger or a mouse (tap or drag; no multi-touch gestures needed). Escape and the Android back button close windows and go back. Space starts and stops the drive, Ctrl+Z undoes.
- **New (run 52)**: number keys pick the tools (1 = first button).
- **Screen readers**: the game is a canvas, so screen readers cannot read it (normal for web games). The bridge code dialog is real HTML with `aria-modal` and a label.
- **New (run 52)**: the page `lang` follows the game language, so browser translate and screen readers read the page title in the right language.

## Contrast (new in run 52)
- White labels on light buttons (green GO, orange, wood, steel, Sunny gold paint) were below 3:1. Every white button label now has a dark outline (the button shade pulled halfway to ink). `tests/a11y.test.ts` checks the outline has at least 4.5:1 with white for every button colour and every shop paint.
- Ink text on gold, cream and white: above 3:1 (tested).

## Known gaps (later)
- The smallest text (trophy goal texts, 12–16 px on a 720 px screen) is about 6–8 px tall on a small phone. A bigger Trophies layout (fewer cards per page) would help.
- Beam drawing is drag only. A tap-tap mode (tap one point, then the other) would help players with shaky hands and would also work with a keyboard cursor.
- No full keyboard play: placing beams still needs a pointer.
- Colour-blind check of the material colours: wood (brown) and rope (tan) are close; they differ in width (9 vs 5 px) and rope sags, so they stay apart, but a pattern on rope would be safer.
- Text size option (bigger UI text) is not there yet.
