// ============================================================
// /api/tools/execute — Tool Execution Endpoint with Approval Gate
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { routeAndExecuteTool } from '@/lib/tools/executor-router';
import { decryptCredential } from '@/lib/security/credential-vault';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { toolName, args = {}, projectId, approvedBy, hmacSignature } = body;

    if (!toolName) {
      return NextResponse.json({ error: 'toolName is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    let accessToken: string | undefined;

    // Check connector connection for real API tokens
    if (supabase) {
      try {
        const connectorPrefix = toolName.split('_')[0];
        const { data: conn } = await (supabase as any)
          .from('connector_connections')
          .select('encrypted_credentials, status')
          .eq('user_id', session.userId)
          .like('connector_id', `${connectorPrefix}%`)
          .single();

        if (conn && conn.status === 'connected' && conn.encrypted_credentials) {
          const creds = decryptCredential(conn.encrypted_credentials);
          accessToken = (creds.accessToken as string) || (creds.apiKey as string);
        }
      } catch (_) {}
    }

    // Route and execute
    const execution = await routeAndExecuteTool(toolName, args, accessToken);

    // Audit log
    if (supabase) {
      try {
        const hash = hmacSignature || crypto.createHash('sha256').update(JSON.stringify(args)).digest('hex');
        await (supabase as any).from('approval_audit_log').insert({
          action: execution.isMutation ? 'MUTATION_EXECUTE' : 'READ_EXECUTE',
          tool_name: toolName,
          args,
          hmac_hash: hash,
          user_id: session.userId,
          status: execution.success ? 'SUCCESS' : 'FAILURE',
        });
      } catch (_) {}
    }

    return NextResponse.json(execution);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
