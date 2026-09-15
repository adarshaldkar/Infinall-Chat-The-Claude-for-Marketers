// ============================================================
// /api/observability/metrics — Prometheus Telemetry Endpoint
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { defaultTracer } from '@/lib/observability/tracer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const metricsText = defaultTracer.exportPrometheusMetrics();
  return new NextResponse(metricsText, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    },
  });
}
