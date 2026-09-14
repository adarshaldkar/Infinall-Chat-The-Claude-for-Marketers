// ============================================================
// /api/mcp/servers — MCP Server Health & Status Endpoint
// Returns registered MCP servers and connection mode
// ============================================================

import { NextResponse } from 'next/server';
import { MCP_SERVER_REGISTRY } from '@/lib/mcp/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const mode = process.env.MCP_MODE === 'live' ? 'live' : 'mock';

  const servers = Object.values(MCP_SERVER_REGISTRY).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    transport: s.transportType,
    allowedTools: s.allowedTools,
    trustLevel: s.trustLevel,
    status: s.enabled ? 'healthy' : 'disabled',
  }));

  return NextResponse.json({
    mode,
    activeServersCount: servers.length,
    servers,
  });
}
