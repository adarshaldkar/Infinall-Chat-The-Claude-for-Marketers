import { NextResponse } from 'next/server';
import { MODEL_CATALOG } from '@/lib/gateway/catalog';
import { getToolMetrics } from '@/lib/tools/health-tracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const toolMetrics = getToolMetrics();
  const healthyTools = toolMetrics.filter((t) => t.status === 'healthy').length;

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    modelsAvailable: Object.keys(MODEL_CATALOG).length,
    toolsTelemetry: {
      totalRecorded: toolMetrics.length,
      healthyCount: healthyTools,
    },
    version: '1.0.0',
  });
}
