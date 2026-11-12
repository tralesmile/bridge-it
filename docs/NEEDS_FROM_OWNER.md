# Needs from the owner

Things only you can do. Each scheduled run adds to this list; nothing here blocks the build work. Ask Claude "what do you need from me?" to get this list.

## Now
- [x] Create the private GitHub repository `tralesmile/bridge-it` (done 2026-11-06).
- [ ] Play the web build when you get a chance and say what feels fun or annoying.

- [x] CI on GitHub Actions checked: the last 5 runs are green (2026-11-09).

## Before web launch (around milestone M6)
- [ ] Create a CrazyGames developer account (free). Then upload the folder made by `npm run build:crazygames` (`dist-crazygames`) to their preview tool and tell Claude what it reports.
- [ ] On Poki for Developers, open the Poki Inspector with the `npm run build:poki` folder (`dist-poki`) and tell Claude what it reports.
- [ ] Submit to Poki for Developers (free), or ask Claude for the pitch text.
- [ ] Decide the public name (Bridge It! may clash with existing apps; Claude will check store search before launch).

## Before mobile launch (around milestone M7)
- [ ] Confirm the app id `com.tralesmile.bridgeit` (used for Google Play and the App Store; it cannot change after the first upload). Say if you want another one, for example with your own domain.
- [ ] When you can: download the debug APK from the GitHub Actions run (artifact `bridge-it-debug-apk`), install it on an Android phone, and say if it starts and plays well.
- [ ] Google Play developer account: $25 once; verify identity and an Android phone.
- [ ] Recruit 12 testers for the 14-day closed test (friends, family).
- [ ] Apple Developer Program: $99 a year.
- [ ] AdMob account, and confirm AdMob, Google Play and Apple can pay a bank account in North Macedonia.
- [ ] Codemagic account (free) linked to the GitHub repo. The build steps are already in `codemagic.yaml`. In Codemagic add: an App Store Connect API key named `bridge-it-asc` (after the Apple account), and an Android upload keystore named `bridge-it-upload` (Codemagic can make one; keep a backup, a lost key is hard to replace).
- [ ] Ask a local accountant about registering (sole proprietor or DOO) and VAT on foreign digital sales.

## Marketing (from milestone M2)
- [ ] TikTok, YouTube and Instagram accounts for the game; post the clips Claude prepares.
