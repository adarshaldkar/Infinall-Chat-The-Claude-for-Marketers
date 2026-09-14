// ============================================================
// /api/tools/health — Real-Time Tool Health & Latency Telemetry
// Returns live metrics, error rates, EMA latencies, and statuses
// ============================================================

import { NextResponse } from 'next/server';
import { getToolMetrics } from '@/lib/tools/health-tracker';
import { DIRECTORY_TOOLS } from '@/lib/tools/directory-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const recordedMetrics = getToolMetrics();
  const metricMap = new Map(recordedMetrics.map((m) => [m.id, m]));

  // Merge static catalog definitions with dynamic live telemetry
  const enrichedTools = DIRECTORY_TOOLS.map((tool) => {
    const live = metricMap.get(tool.id) || metricMap.get(tool.name);
    return {
      id: tool.id,
      name: tool.name,
      category: tool.category,
      status: live ? live.status : tool.status,
      latencyMs: live ? live.avgLatencyMs : tool.latencyMs,
      totalCalls: live ? live.totalCalls : 0,
      successRate: live ? (live.successCount / live.totalCalls) * 100 : 100,
      lastCalledAt: live ? live.lastCalledAt : null,
      tags: tool.tags,
      mcpServer: tool.mcpServer,
    };
  });

  const healthyCount = enrichedTools.filter((t) => t.status === 'active' || t.status === 'healthy').length;

  return NextResponse.json({
    totalTools: enrichedTools.length,
    healthyTools: healthyCount,
    tools: enrichedTools,
    timestamp: new Date().toISOString(),
  });
}
