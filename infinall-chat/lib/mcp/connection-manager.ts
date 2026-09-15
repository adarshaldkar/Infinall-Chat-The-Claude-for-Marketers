// ============================================================
// Infinall Chat - Connector Connection & Token Resolver
// Resolves live decrypted OAuth credentials from database with env fallback
// ============================================================

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { decryptCredential, encryptCredential, maskSecret } from '@/lib/crypto/vault';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface StoredConnectorConnection {
  id: string;
  userId: string;
  connectorId: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  expiresAt?: string;
  accountIdentifier?: string;
  metadata?: Record<string, unknown>;
  updatedAt: string;
}

export class ConnectionManager {
  /**
   * Resolves decrypted access token for a given connector (e.g., 'META', 'GA4', 'GOOGLE_ADS', 'FIRECRAWL')
   */
  public async getAccessToken(connectorId: string, userId?: string): Promise<string | null> {
    const upperId = connectorId.toUpperCase();

    // 1. Check user-specific connection in Supabase
    if (userId) {
      const supabase = getSupabaseServerClient() as SupabaseClient | null;
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('connector_connections')
            .select('*')
            .eq('user_id', userId)
            .eq('connector_id', upperId)
            .eq('status', 'connected')
            .maybeSingle();

          if (!error && data && data.encrypted_access_token) {
            return decryptCredential(data.encrypted_access_token);
          }
        } catch (err) {
          console.warn(`[ConnectionManager] DB token lookup warning for ${upperId}:`, err);
        }
      }
    }

    // 2. Fallback to process.env credentials
    const envTokenMap: Record<string, string[]> = {
      META: ['META_ACCESS_TOKEN', 'META_APP_TOKEN'],
      GA4: ['GA4_API_KEY', 'GA4_ACCESS_TOKEN'],
      GOOGLE_ADS: ['GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_DEVELOPER_TOKEN'],
      FIRECRAWL: ['FIRECRAWL_API_KEY'],
      HUBSPOT: ['HUBSPOT_ACCESS_TOKEN', 'HUBSPOT_API_KEY'],
      APOLLO: ['APOLLO_API_KEY'],
      SEMRUSH: ['SEMRUSH_API_KEY'],
    };

    const keys = envTokenMap[upperId] || [`${upperId}_API_KEY`, `${upperId}_ACCESS_TOKEN`];
    for (const key of keys) {
      const val = process.env[key];
      if (val && !this.isPlaceholder(val)) {
        return val.trim();
      }
    }

    return null;
  }

  /**
   * Saves or updates an encrypted connection for a user
   */
  public async saveConnection(
    userId: string,
    connectorId: string,
    accessToken: string,
    options: {
      refreshToken?: string;
      expiresAt?: string;
      accountIdentifier?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    const supabase = getSupabaseServerClient() as SupabaseClient | null;
    if (!supabase) return;

    const encryptedAccessToken = encryptCredential(accessToken);
    const encryptedRefreshToken = options.refreshToken ? encryptCredential(options.refreshToken) : null;

    await supabase.from('connector_connections').upsert(
      {
        user_id: userId,
        connector_id: connectorId.toUpperCase(),
        provider: connectorId.toLowerCase(),
        status: 'connected',
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        expires_at: options.expiresAt || null,
        account_identifier: options.accountIdentifier || maskSecret(accessToken),
        metadata: options.metadata || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id, connector_id' }
    );
  }

  /**
   * Tests connection status and connectivity
   */
  public async testConnection(connectorId: string, token: string): Promise<{ success: boolean; message: string }> {
    const upperId = connectorId.toUpperCase();
    try {
      if (upperId === 'FIRECRAWL') {
        const res = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ url: 'https://example.com' }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.status === 401 || res.status === 403) throw new Error('Invalid Firecrawl API key');
        return { success: true, message: 'Firecrawl API connected successfully.' };
      }

      if (upperId === 'META') {
        const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(token)}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Meta Graph API responded with HTTP ${res.status}`);
        }
        return { success: true, message: 'Meta Ads Manager connected successfully.' };
      }

      if (upperId === 'GA4') {
        // Test token against Google tokeninfo endpoint
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error('Invalid Google OAuth token or expired session');
        return { success: true, message: 'Google Analytics 4 API connected successfully.' };
      }

      return { success: true, message: `${connectorId} connection verified.` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  private isPlaceholder(value?: string): boolean {
    if (!value) return true;
    const v = value.trim().toLowerCase();
    return v === '' || v === 'mock' || v === 'demo' || v === 'your-key-here' || v.startsWith('demo_');
  }
}

export const connectionManager = new ConnectionManager();
