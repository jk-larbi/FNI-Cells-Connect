import * as fs from 'fs';
import * as path from 'path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    envVars[key] = val.trim();
  }
});

const apiKey = envVars.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
const projectId = envVars.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

console.log('========================================================');
console.log('FORERUNNERS NETWORK INTERNATIONAL - FIREBASE STATUS CHECK');
console.log('========================================================\n');

if (!apiKey || !projectId || apiKey.includes('your-firebase')) {
  console.log('❌ Firebase is not yet connected to a project.');
  console.log('Current .env settings:');
  console.log(`  VITE_FIREBASE_API_KEY: "${apiKey || 'MISSING'}"`);
  console.log(`  VITE_FIREBASE_PROJECT_ID: "${projectId || 'MISSING'}"\n`);
  console.log('👉 To connect your Firebase project:');
  console.log('  1. Go to https://console.firebase.google.com and select or create your project.');
  console.log('  2. Click Project Overview (gear icon) -> Project settings.');
  console.log('  3. In "Your apps", add a Web app (</>) or copy existing SDK config.');
  console.log('  4. Copy apiKey, authDomain, projectId, storageBucket, appId into .env');
  console.log('========================================================');
  process.exit(0);
}

console.log(`🔗 Connecting to Firebase project: ${projectId}`);
console.log('✅ Firebase configuration keys detected in .env.');
console.log('========================================================');
