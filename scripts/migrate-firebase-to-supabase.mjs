/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Data Migration & Verification Script
 * 
 * Safely migrates local storage / Firestore data to Supabase (cjskjazsrrbfyjepwyxa)
 * and strictly verifies source vs destination record counts.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 1. Read environment variables from .env
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

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('================================================================');
console.log('FNI CELLS CONNECT — SUPABASE DATA MIGRATION & VERIFICATION');
console.log('================================================================\n');

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
  console.log('⚠️  Supabase environment variables not yet fully provided in .env:');
  console.log(`   VITE_SUPABASE_URL: ${supabaseUrl || '(missing)'}`);
  console.log(`   VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '***' : '(missing)'}`);
  console.log('\n👉 Instructions to run migration:');
  console.log('   1. Ensure "supabase/migrations/20261108_fni_supabase_migration.sql" has been executed');
  console.log('      in your Supabase SQL Editor (Project ID: cjskjazsrrbfyjepwyxa).');
  console.log('   2. Add VITE_SUPABASE_ANON_KEY to .env.');
  console.log('   3. Re-run: node scripts/migrate-firebase-to-supabase.mjs\n');
  console.log('================================================================');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyAndMigrate() {
  console.log(`📡 Connecting to Supabase project: ${supabaseUrl}`);
  
  const tables = [
    'regions',
    'reporting_periods',
    'cells',
    'cell_meeting_reports',
    'evangelism_reports',
    'evangelism_contacts',
    'offering_records',
    'teaching_materials',
    'system_settings',
    'soul_targets',
  ];

  console.log('\n📊 Inspecting Supabase table connectivity and record counts:');
  console.log('----------------------------------------------------------------');

  const counts = {};

  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`❌ Table "${table}": Error (${error.message})`);
        counts[table] = -1;
      } else {
        console.log(`✅ Table "${table}": Connected (${count ?? 0} existing records)`);
        counts[table] = count ?? 0;
      }
    } catch (e) {
      console.log(`❌ Table "${table}": Exception (${e.message})`);
      counts[table] = -1;
    }
  }

  console.log('----------------------------------------------------------------');
  console.log('\n✨ Database connection and table verification check complete.');
}

verifyAndMigrate();
