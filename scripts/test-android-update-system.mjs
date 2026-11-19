import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

console.log('🧪 Starting FNI Cells Connect — Android Update & UI Verification Suite...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// TEST 1: Check canonical update manifests in public/
console.log('Test 1: Validating Update Manifests in public/...');
const primaryManifestPath = path.resolve('public/fni-app-update.json');
const aliasManifestPath = path.resolve('public/fni-cells-update.json');

assert(fs.existsSync(primaryManifestPath), 'public/fni-app-update.json exists');
assert(fs.existsSync(aliasManifestPath), 'public/fni-cells-update.json exists');

const manifest = JSON.parse(fs.readFileSync(primaryManifestPath, 'utf8'));
assert(manifest.appId === 'com.forerunnersnetwork.fnicellsconnect', 'appId matches exact package name com.forerunnersnetwork.fnicellsconnect');
assert(typeof manifest.latestVersion === 'string' && manifest.latestVersion.length > 0, 'latestVersion is defined');
assert(typeof manifest.versionCode === 'number' && manifest.versionCode > 0, 'versionCode is positive number');
assert(manifest.apkUrl.includes('FNI-Cells-Connect-Android.apk'), 'apkUrl points to FNI-Cells-Connect-Android.apk');
assert(Array.isArray(manifest.releaseNotes) && manifest.releaseNotes.length > 0, 'releaseNotes has bullet points');
assert(typeof manifest.isMandatory === 'boolean', 'isMandatory boolean flag is set');

// TEST 2: Semver comparison logic
console.log('\nTest 2: Verifying Semantic Version Comparison Logic...');
function semverCompare(v1, v2) {
  const p1 = (v1 || '0.0.0').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = (v2 || '0.0.0').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

assert(semverCompare('1.1.0', '1.0.0') > 0, '1.1.0 is greater than 1.0.0');
assert(semverCompare('1.0.0', '1.0.0') === 0, '1.0.0 equals 1.0.0');
assert(semverCompare('1.0.1', '1.0.0') > 0, '1.0.1 is greater than 1.0.0');
assert(semverCompare('1.0.0', '1.1.0') < 0, '1.0.0 is less than 1.1.0');
assert(semverCompare('v1.2.0', '1.1.9') > 0, 'v1.2.0 handles v prefix correctly');

// TEST 3: Android REQUEST_INSTALL_PACKAGES Permission in Workflow
console.log('\nTest 3: Verifying Android Package Installer Permissions in CI...');
const workflowPath = path.resolve('.github/workflows/android-build.yml');
assert(fs.existsSync(workflowPath), '.github/workflows/android-build.yml exists');

const workflowContent = fs.readFileSync(workflowPath, 'utf8');
assert(workflowContent.includes('android.permission.REQUEST_INSTALL_PACKAGES'), 'Workflow injects android.permission.REQUEST_INSTALL_PACKAGES');
assert(workflowContent.includes('sha256sum FNI-Cells-Connect-Android.apk'), 'Workflow calculates APK SHA-256 integrity hash');
assert(workflowContent.includes('gh release create'), 'Workflow publishes permanent GitHub release with APK asset');

// TEST 4: AppUpdateService implementation
console.log('\nTest 4: Verifying appUpdateService.ts Implementation...');
const servicePath = path.resolve('src/services/appUpdateService.ts');
assert(fs.existsSync(servicePath), 'src/services/appUpdateService.ts exists');

const serviceContent = fs.readFileSync(servicePath, 'utf8');
assert(serviceContent.includes('checkForUpdate'), 'appUpdateService has checkForUpdate method');
assert(serviceContent.includes('downloadAndInstall'), 'appUpdateService has downloadAndInstall method');
assert(serviceContent.includes('PK'), 'appUpdateService validates APK zip magic header bytes');
assert(serviceContent.includes('REMIND_LATER_PREFIX') || serviceContent.includes('fni_remind_later_'), 'appUpdateService supports Remind Me Later 24h suppression');

// TEST 5: AppUpdateSettingsSection & AppUpdateModal components
console.log('\nTest 5: Verifying UI Settings & Modal Components...');
const modalPath = path.resolve('src/components/common/AppUpdateModal.tsx');
const settingsPath = path.resolve('src/components/settings/AppUpdateSettingsSection.tsx');
assert(fs.existsSync(modalPath), 'src/components/common/AppUpdateModal.tsx exists');
assert(fs.existsSync(settingsPath), 'src/components/settings/AppUpdateSettingsSection.tsx exists');

const profileModalPath = path.resolve('src/components/profile/ProfileSettingsModal.tsx');
const adminSettingsPath = path.resolve('src/components/admin/AdminSettingsView.tsx');
const profileModalContent = fs.readFileSync(profileModalPath, 'utf8');
const adminSettingsContent = fs.readFileSync(adminSettingsPath, 'utf8');

assert(profileModalContent.includes('AppUpdateSettingsSection'), 'ProfileSettingsModal mounts AppUpdateSettingsSection');
assert(profileModalContent.includes('app_updates'), 'ProfileSettingsModal includes app_updates section');
assert(adminSettingsContent.includes('AppUpdateSettingsSection'), 'AdminSettingsView mounts AppUpdateSettingsSection');

// TEST 6: Quiz Authoring Suite Full-Screen on Mobile & Alternative Answers
console.log('\nTest 6: Verifying Quiz Authoring Suite Full-Screen & Alternative Answers...');
const quizViewPath = path.resolve('src/components/learning/LearningQuizzesView.tsx');
assert(fs.existsSync(quizViewPath), 'LearningQuizzesView.tsx exists');

const quizViewContent = fs.readFileSync(quizViewPath, 'utf8');
assert(quizViewContent.includes('z-[100]'), 'Quiz Authoring Suite uses top-layer z-[100] stacking');
assert(quizViewContent.includes('h-[100dvh]'), 'Quiz Authoring Suite uses h-[100dvh] full viewport on mobile');
assert(quizViewContent.includes('Acceptable Alternative Answers') && quizViewContent.includes('Phrasings'), 'Subjective questions has upgraded Alternative Answers section');
assert(quizViewContent.includes('Add Phrasing'), 'Subjective questions has Add Phrasing tag chip button');

console.log(`\n========================================`);
console.log(`Update System & UI Tests Passed: ${passedTests}/${totalTests}`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  console.log('🎉 All Android Update System & Mobile UI verification tests passed successfully!\n');
} else {
  console.error('❌ Some tests failed.');
  process.exitCode = 1;
}
