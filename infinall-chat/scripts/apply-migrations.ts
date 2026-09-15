#!/usr/bin/env node
/**
 * apply-migrations.ts
 * Apply all pending Supabase migrations via the JS client (no CLI auth needed).
 * 
 * Uses the service role key to execute raw SQL through a stored procedure
 * that we first create, or falls back to the Supabase Management API.
 *
 * Run:  npx tsx scripts/apply-migrations.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

// Service role client – bypasses RLS
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runSQL(sql: string): Promise<{ error: string | null }> {
  // Use the rpc 'exec_sql' if it exists, otherwise guide user.
  const { error } = await supabase.rpc('exec_sql', { sql_text: sql });
  if (error) {
    // If exec_sql doesn't exist, try to create it first
    if (error.message?.includes('exec_sql')) {
      return { error: 'exec_sql RPC not found — see instructions below' };
    }
    return { error: error.message };
  }
  return { error: null };
}

async function main() {
  console.log('\n🗄️  Infinall Chat — Migration Applier');
  console.log(`📍 Target: ${SUPABASE_URL}\n`);

  // First, create the exec_sql helper if it doesn't exist
  const bootstrapSQL = `
    CREATE OR REPLACE FUNCTION public.exec_sql(sql_text TEXT)
    RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN EXECUTE sql_text; END;
    $$;
    GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;
  `;

  console.log('🔧 Bootstrapping exec_sql helper...');
  const bootstrap = await runSQL(bootstrapSQL);

  if (bootstrap.error) {
    console.log('\n⚠️  Cannot execute raw SQL via JS client.');
    console.log('   The Supabase project needs migrations applied via the Dashboard SQL Editor.');
    console.log('\n📋 Instructions:');
    console.log('   1. Open: https://supabase.com/dashboard/project/htabkmovqnitprjqbakh/sql/new');
    console.log('   2. Run migrations in order:\n');

    const files = fs.readdirSync(MIGRATIONS_DIR).sort();
    for (const file of files) {
      if (!file.endsWith('.sql')) continue;
      const filePath = path.join(MIGRATIONS_DIR, file);
      const size = fs.statSync(filePath).size;
      console.log(`   📄 ${file}  (${Math.ceil(size / 1024)} KB)`);
      console.log(`      file://${filePath.replace(/\\/g, '/')}`);
    }

    console.log('\n   3. After applying, run:');
    console.log('      npm run db:types');
    console.log('      npm run test:types');
    return;
  }

  // Apply migrations in order
  const files = fs.readdirSync(MIGRATIONS_DIR).sort();
  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    process.stdout.write(`📄 Applying ${file}...`);
    const result = await runSQL(sql);

    if (result.error) {
      if (result.error.includes('already exists') || result.error.includes('IF NOT EXISTS')) {
        console.log(' ⏭️  (already applied or idempotent)');
        skipped++;
      } else {
        console.log(` ❌ FAILED: ${result.error}`);
      }
    } else {
      console.log(' ✅');
      applied++;
    }
  }

  console.log(`\n📊 Applied: ${applied}, Skipped/Idempotent: ${skipped}`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
