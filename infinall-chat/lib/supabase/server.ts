import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;


export const isSupabaseServerConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseServiceKey.includes('placeholder')
);

let serverClient: SupabaseClient<Database> | null = null;

export function getSupabaseServerClient(): SupabaseClient<Database> | null {
  if (!isSupabaseServerConfigured) return null;
  if (!serverClient && supabaseUrl && supabaseServiceKey) {
    serverClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return serverClient;
}
