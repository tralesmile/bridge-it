# Needs from the owner

Things only you can do. Each scheduled run adds to this list; nothing here blocks the build work. Ask Claude "what do you need from me?" to get this list.

## Now
- [x] Create the private GitHub repository `tralesmile/bridge-it` (done 2026-11-06).
- [ ] Play the web build when you get a chance and say what feels fun or annoying.
- [ ] The game now has a Language button in Settings (8 languages; only the menu and Settings are translated so far). Please read the Macedonian text and say what sounds wrong; if you know someone who speaks German, Spanish, Portuguese, French, Turkish or Russian, ask them to look too.

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
- [ ] AdMob account, and confirm AdMob, Google Play and Apple can pay a bank account in North Macedonia. Then send Claude: the Android and iOS AdMob app ids, and one interstitial and one rewarded ad unit id for each (the app uses Google's test ids until then). In AdMob, set up the GDPR consent message (Privacy & messaging) for the EU and UK, and the IDFA message for iOS.
- [ ] When filling in Google Play "Data safety" and Apple "App privacy": the app shows Google AdMob ads, which use the advertising id (Android) and, only if the player allows it, the IDFA (iOS). Claude will write the full answers before submission.
- [ ] Decide who the game is for: everyone, or children too. If children are a main audience, Google Play's Families rules and Apple's Kids rules change which ads are allowed. Today ads are limited to the "General" rating, and the game is not marked as made for children.
- [ ] AdMob asks for an `app-ads.txt` file on the developer website listed in the stores. You need a simple website (a free GitHub Pages site is fine); Claude can write the file once you have the AdMob publisher id.
- [ ] RevenueCat account (free until real earnings). Create products in Google Play Console and App Store Connect as one-time (non-consumable) purchases: `remove_ads` ($3.99) and `supporter_pack` ($9.99). In RevenueCat add the two products, the entitlements `no_ads` (both products) and `supporter` (supporter pack only), then send Claude the public Android and iOS SDK keys. Until then the purchase buttons stay hidden in the app.
- [ ] Codemagic account (free) linked to the GitHub repo. The build steps are already in `codemagic.yaml`. In Codemagic add: an App Store Connect API key named `bridge-it-asc` (after the Apple account), and an Android upload keystore named `bridge-it-upload` (Codemagic can make one; keep a backup, a lost key is hard to replace).
- [ ] Ask a local accountant about registering (sole proprietor or DOO) and VAT on foreign digital sales.

## Marketing (from milestone M2)
- [ ] TikTok, YouTube and Instagram accounts for the game; post the clips Claude prepares.
