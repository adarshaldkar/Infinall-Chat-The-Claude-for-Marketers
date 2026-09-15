// ============================================================
// /api/connectors/test — Live MCP Connector Verification Endpoint
// Tests live API connectivity against vendor endpoints
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { connectionManager } from '@/lib/mcp/connection-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await extractSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { connectorId, token } = body;

    if (!connectorId) {
      return NextResponse.json({ error: 'connectorId is required' }, { status: 400 });
    }

    // Use passed token or resolve from database
    const resolvedToken = token || (await connectionManager.getAccessToken(connectorId, session.userId));

    if (!resolvedToken) {
      return NextResponse.json(
        { success: false, message: `No credential found to test for ${connectorId}. Please provide an API key or token.` },
        { status: 400 }
      );
    }

    const result = await connectionManager.testConnection(connectorId, resolvedToken);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
