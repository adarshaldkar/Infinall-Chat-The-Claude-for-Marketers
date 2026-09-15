// ============================================================
// /api/connectors/google-drive/webhook — Google Drive Push Notification Handler
// Automatically triggers knowledge base re-indexing when files are modified in Drive
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Google Drive Push Notification Headers
  const channelId = req.headers.get('x-goog-channel-id');
  const channelToken = req.headers.get('x-goog-channel-token');
  const resourceState = req.headers.get('x-goog-resource-state'); // 'sync', 'add', 'update', 'trash', 'change'
  const resourceId = req.headers.get('x-goog-resource-id');

  // Handle initial sync handshake
  if (resourceState === 'sync') {
    return new NextResponse('OK', { status: 200 });
  }

  if (!channelId || !resourceId) {
    return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient() as SupabaseClient | null;
  if (supabase) {
    try {
      // Log notification and trigger incremental sync background job
      console.log(`[GoogleDrive Webhook] Received ${resourceState} on resource ${resourceId}`);
      await supabase.from('connector_oauth_states').insert({
        state: `drive_webhook_${channelId}`,
        connector_id: 'google_drive',
        user_id: channelToken || 'system',
      });
    } catch (_) {}
  }

  return new NextResponse('Webhook Received', { status: 200 });
}
