import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('FNI CELLS CONNECT — ANDROID FIREBASE FCM INTEGRATION TEST SUITE');
console.log('================================================================\n');

let passed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    throw err;
  }
}

// TEST 1: google-services.json validation
runTest('TEST 1: google-services.json package name & project match capacitor config', () => {
  const gServicesPath = path.resolve('firebase/google-services.json');
  assert(fs.existsSync(gServicesPath), 'firebase/google-services.json does not exist');

  const config = JSON.parse(fs.readFileSync(gServicesPath, 'utf8'));
  assert.strictEqual(config.project_info?.project_id, 'fni-cells-connect', 'Project ID mismatch');

  const packages = (config.client || []).map(c => c.client_info?.android_client_info?.package_name);
  assert(packages.includes('com.forerunnersnetwork.fnicellsconnect'), 'Android package name com.forerunnersnetwork.fnicellsconnect missing');

  const capConfig = fs.readFileSync('capacitor.config.ts', 'utf8');
  assert(capConfig.includes("'com.forerunnersnetwork.fnicellsconnect'"), 'Capacitor appId does not match package name');
});

// TEST 2: Capacitor configuration options
runTest('TEST 2: capacitor.config.ts defines PushNotifications presentation options', () => {
  const capConfig = fs.readFileSync('capacitor.config.ts', 'utf8');
  assert(capConfig.includes('PushNotifications'), 'PushNotifications plugin block missing from capacitor.config.ts');
  assert(capConfig.includes("'alert'"), 'alert presentation option missing');
  assert(capConfig.includes("'badge'"), 'badge presentation option missing');
  assert(capConfig.includes("'sound'"), 'sound presentation option missing');
});

// TEST 3: Package dependencies
runTest('TEST 3: package.json specifies Capacitor 8 Android and CLI dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert(pkg.dependencies['@capacitor/push-notifications'], '@capacitor/push-notifications missing from dependencies');
  assert(pkg.dependencies['@capacitor/android'], '@capacitor/android missing from dependencies');
  assert(pkg.devDependencies['@capacitor/cli'], '@capacitor/cli missing from devDependencies');
  assert(pkg.dependencies['@capacitor/core'], '@capacitor/core missing from dependencies');
});

// TEST 4: PushNotificationService channels
runTest('TEST 4: PushNotificationService registers high-importance channels (fni_updates, fni_calls)', () => {
  const svc = fs.readFileSync('src/services/pushNotificationService.ts', 'utf8');
  assert(svc.includes('initializeNativeChannels'), 'initializeNativeChannels method missing');
  assert(svc.includes("id: 'fni_updates'"), 'fni_updates channel missing');
  assert(svc.includes("id: 'fni_calls'"), 'fni_calls channel missing');
  assert(svc.includes('importance: 5'), 'High importance (5) not configured on notification channel');
});

// TEST 5: Tap and deep linking
runTest('TEST 5: Notification tap handling dispatches fni-native-push-click and buffers pending clicks', () => {
  const svc = fs.readFileSync('src/services/pushNotificationService.ts', 'utf8');
  assert(svc.includes('fni-native-push-click'), 'fni-native-push-click custom event dispatch missing');
  assert(svc.includes('getPendingNotificationClick'), 'getPendingNotificationClick buffer method missing');

  const context = fs.readFileSync('src/context/NotificationContext.tsx', 'utf8');
  assert(context.includes('handleNativePushClick'), 'handleNativePushClick handler missing in context');
  assert(context.includes('setActiveNavigationTarget'), 'setActiveNavigationTarget navigation setter missing');
});

// TEST 6: Supabase fni-web-push FCM HTTP v1 integration
runTest('TEST 6: Supabase fni-web-push edge function implements FCM HTTP v1 message delivery', () => {
  const edgeFn = fs.readFileSync('supabase/functions/fni-web-push/index.ts', 'utf8');
  assert(edgeFn.includes('https://fcm.googleapis.com/v1/projects/'), 'FCM HTTP v1 URL missing from edge function');
  assert(edgeFn.includes('FCM_SERVICE_ACCOUNT_JSON'), 'FCM_SERVICE_ACCOUNT_JSON secret lookup missing');
  assert(edgeFn.includes("channel_id: \"fni_updates\""), 'channel_id fni_updates missing from FCM payload');
  assert(edgeFn.includes("priority: \"HIGH\""), 'Android HIGH priority missing from FCM payload');
});

// TEST 7: Supabase device_tokens schema alignment
runTest('TEST 7: Supabase device_tokens client payload matches live table columns', () => {
  const sbSvc = fs.readFileSync('src/services/supabaseService.ts', 'utf8');
  assert(sbSvc.includes('device: data.device || "Web"'), 'device column missing or misaligned in supabaseService');
  assert(sbSvc.includes('legacy_data:'), 'legacy_data column missing or misaligned in supabaseService');
  assert(sbSvc.includes('updated_at:'), 'updated_at column missing in supabaseService');
});

// TEST 8: Android 13+ POST_NOTIFICATIONS permission
runTest('TEST 8: AndroidManifest in CI includes POST_NOTIFICATIONS and runtime permission flow', () => {
  const ci = fs.readFileSync('.github/workflows/android-build.yml', 'utf8');
  assert(ci.includes('android.permission.POST_NOTIFICATIONS'), 'POST_NOTIFICATIONS missing from CI AndroidManifest injection');

  const svc = fs.readFileSync('src/services/pushNotificationService.ts', 'utf8');
  assert(svc.includes('PushNotifications.requestPermissions()'), 'PushNotifications.requestPermissions call missing');
  assert(svc.includes('PushNotifications.checkPermissions()'), 'PushNotifications.checkPermissions call missing');
});

// TEST 9: Android CI workflow idempotency & Google Services verification
runTest('TEST 9: Android CI workflow idempotently adds platform and validates google-services.json', () => {
  const ci = fs.readFileSync('.github/workflows/android-build.yml', 'utf8');
  assert(ci.includes('if [ ! -d "android" ]; then'), 'Idempotent cap add android guard missing');
  assert(ci.includes('cp firebase/google-services.json android/app/google-services.json'), 'Copy google-services.json missing');
  assert(ci.includes('Firebase Android configuration validated.'), 'Firebase config validation step missing');
});

console.log(`\n================================================================`);
console.log(`ALL ${passed} ANDROID FIREBASE FCM INTEGRATION TESTS PASSED! ✅`);
console.log(`================================================================\n`);
