import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isConfigured = Boolean(
    url && key && !url.includes('placeholder') && !key.includes('placeholder')
  );

  return { url, key, isConfigured };
}

export const isSupabaseServerConfigured = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)
);

let serverClient: SupabaseClient<Database> | null = null;

export function getSupabaseServerClient(): SupabaseClient<Database> | null {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured || !url || !key) return null;

  if (!serverClient) {
    serverClient = createClient<Database>(url, key, {
      auth: {
        persistSession: false,
      },
    });
  }
  return serverClient;
}
