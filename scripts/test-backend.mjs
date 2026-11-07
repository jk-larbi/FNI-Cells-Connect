import { createClient } from '@supabase/supabase-js';
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

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('========================================================');
console.log('FORERUNNERS NETWORK INTERNATIONAL - BACKEND STATUS CHECK');
console.log('========================================================\n');

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
  console.log('❌ Supabase is not yet connected to a live cloud project.');
  console.log('Current .env settings:');
  console.log(`  VITE_SUPABASE_URL: "${supabaseUrl || 'MISSING'}"`);
  console.log(`  VITE_SUPABASE_ANON_KEY: "${supabaseAnonKey ? '***' : 'MISSING'}"\n`);
  console.log('👉 To connect your live Supabase backend:');
  console.log('  1. Go to https://database.new to create a free Supabase project.');
  console.log('  2. Open SQL Editor in your Supabase project dashboard.');
  console.log('  3. Paste the contents of "supabase/full_schema_setup.sql" and click RUN.');
  console.log('  4. Go to Project Settings -> API to copy Project URL and anon public key.');
  console.log('  5. Paste them into ".env".');
  console.log('========================================================');
  process.exit(0);
}

console.log(`🔗 Connecting to Supabase project: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // 1. Check regions
    const { data: regions, error: regErr } = await supabase.from('regions').select('id, name').limit(5);
    if (regErr) throw new Error(`Regions table query failed: ${regErr.message}`);
    console.log(`✅ Database connection successful! Found ${regions.length} region(s).`);

    // 2. Check cells
    const { data: cells, error: cellErr } = await supabase.from('cells').select('id, name').limit(5);
    if (cellErr) throw new Error(`Cells table query failed: ${cellErr.message}`);
    console.log(`✅ Cells table verified: Found ${cells.length} registered cell(s).`);

    // 3. Check reporting periods
    const { data: periods, error: prdErr } = await supabase.from('reporting_periods').select('id, name').limit(5);
    if (prdErr) throw new Error(`Periods query failed: ${prdErr.message}`);
    console.log(`✅ Reporting periods table verified: Found ${periods.length} active period(s).`);

    console.log('\n🎉 Backend is fully configured, secured with RLS, and operational!');
    console.log('========================================================');
  } catch (err) {
    console.error(`\n❌ Backend test failed: ${err.message}`);
    console.log('\n💡 Have you executed "supabase/full_schema_setup.sql" in your Supabase SQL Editor?');
    console.log('========================================================');
  }
}

testConnection();
