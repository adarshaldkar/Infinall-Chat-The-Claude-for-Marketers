// ============================================================
// Infinall Chat - Observability Middleware Helper
// Measures API execution latency and reports spans
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { defaultTracer } from './tracer';

export async function withObservability(
  req: NextRequest,
  routeHandler: () => Promise<NextResponse>,
  routeLabel: string
): Promise<NextResponse> {
  const { spanId } = defaultTracer.startSpan(`http.request.${routeLabel}`, {
    'http.method': req.method,
    'http.url': req.url,
  });

  try {
    const res = await routeHandler();
    defaultTracer.endSpan(spanId, res.ok ? 'OK' : 'ERROR', {
      'http.status_code': res.status,
    });
    return res;
  } catch (err: any) {
    defaultTracer.endSpan(spanId, 'ERROR', {
      'error.message': err.message,
    });
    throw err;
  }
}
