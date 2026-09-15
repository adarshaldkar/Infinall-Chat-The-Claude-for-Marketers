// ============================================================
// Infinall Chat - Supabase Server Client Gateway
// Explicitly separates authenticated user client from service-role admin client
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export const isSupabaseServerConfigured = Boolean(
  url && (anonKey || serviceKey) && !url.includes('placeholder')
);

let adminClientInstance: SupabaseClient<Database> | null = null;
let defaultServerClientInstance: SupabaseClient<Database> | null = null;

/**
 * Returns a Supabase client for user requests.
 * If a JWT is provided, requests execute under the authenticated user's identity and enforce RLS.
 */
export function getSupabaseServerClient(jwtToken?: string): SupabaseClient<Database> | null {
  if (!url || (!anonKey && !serviceKey)) return null;

  const keyToUse = anonKey || serviceKey!;

  if (jwtToken) {
    return createClient<Database>(url, keyToUse, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      },
    });
  }

  if (!defaultServerClientInstance) {
    defaultServerClientInstance = createClient<Database>(url, keyToUse, {
      auth: { persistSession: false },
    });
  }
  return defaultServerClientInstance;
}

/**
 * Returns a privileged Supabase client with the service-role key.
 * Use ONLY in background workers, scheduled cron jobs, and administrative operations.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  if (!url || !serviceKey) return null;

  if (!adminClientInstance) {
    adminClientInstance = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    });
  }
  return adminClientInstance;
}
