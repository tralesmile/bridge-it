// Checks the Capacitor app projects: same app id everywhere, landscape only,
// and the web game copied into both apps loads nothing from the network.
// Usage: npm run app:sync && node scripts/app-check.mjs
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];
const check = (cond, msg) => {
  console.log(cond ? 'PASS' : 'FAIL', msg);
  if (!cond) failures.push(msg);
};
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

const config = read('capacitor.config.ts');
const appId = /appId:\s*'([^']+)'/.exec(config)?.[1];
check(!!appId && /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(appId), `app id looks like a store id (${appId})`);

const gradle = read('android/app/build.gradle');
check(gradle.includes(`applicationId "${appId}"`), 'Android applicationId matches the app id');
const manifest = read('android/app/src/main/AndroidManifest.xml');
check(/android:screenOrientation="sensorLandscape"/.test(manifest), 'Android app is landscape only');

const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
const bundleIds = [...pbx.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((m) => m[1]);
check(bundleIds.length > 0 && bundleIds.every((id) => id === appId), `iOS bundle id matches the app id (${[...new Set(bundleIds)]})`);
const plist = read('ios/App/App/Info.plist');
const orientations = [...plist.matchAll(/<string>(UIInterfaceOrientation\w+)<\/string>/g)].map((m) => m[1]);
check(orientations.length > 0 && orientations.every((o) => o.includes('Landscape')), 'iOS app is landscape only');

// AdMob: the app crashes at start without an app id, and iOS needs the tracking prompt text.
const ADMOB_APP_ID = /^ca-app-pub-\d{16}~\d{10}$/;
const androidAdId = /com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value="([^"]+)"/.exec(manifest)?.[1];
check(ADMOB_APP_ID.test(androidAdId ?? ''), `Android has an AdMob app id (${androidAdId})`);
const iosAdId = /<key>GADApplicationIdentifier<\/key>\s*<string>([^<]+)<\/string>/.exec(plist)?.[1];
check(ADMOB_APP_ID.test(iosAdId ?? ''), `iOS has an AdMob app id (${iosAdId})`);
check(/<key>NSUserTrackingUsageDescription<\/key>\s*<string>[^<]{10,}<\/string>/.test(plist), 'iOS has the tracking prompt text');
check(plist.includes('cstr6suwn9.skadnetwork'), 'iOS lists Google\'s SKAdNetwork id');
const TEST_IDS = ['ca-app-pub-3940256099942544~3347511713', 'ca-app-pub-3940256099942544~1458002511'];
if ([androidAdId, iosAdId].some((id) => TEST_IDS.includes(id))) console.log('NOTE AdMob uses Google\'s test app ids (fine until the owner has an AdMob account)');

// The copied game: index.html plus its scripts, no external URLs in script or link tags.
for (const dir of ['android/app/src/main/assets/public', 'ios/App/App/public']) {
  const html = read(join(dir, 'index.html'));
  check(html.length > 0, `${dir} has the game (run npm run app:sync first)`);
  const external = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]);
  check(external.length === 0, `${dir} loads nothing from the network ${external.join(' ')}`);
  const assets = existsSync(join(dir, 'assets')) ? readdirSync(join(dir, 'assets')) : [];
  check(assets.some((f) => f.endsWith('.js')), `${dir} has the game scripts`);
  const scripts = assets.filter((f) => f.endsWith('.js')).map((f) => read(join(dir, 'assets', f))).join('');
  check(scripts.includes('AdMob'), `${dir} is the app build with AdMob (npm run build:app), not the web build`);
}

process.exit(failures.length ? 1 : 0);
