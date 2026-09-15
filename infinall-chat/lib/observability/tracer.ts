// ============================================================
// Infinall Chat - OpenTelemetry Instrumentation & Tracing SDK
// Distributed tracing across API routes, LLM gateways, and vector search
// Supports parent-child span hierarchies and full execution graphs
// ============================================================

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status?: 'OK' | 'ERROR';
  attributes: Record<string, string | number | boolean>;
  children?: SpanContext[];
}

export interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

class OpenTelemetryTracer {
  private inMemoryMetrics: MetricData[] = [];
  private activeSpans: Map<string, SpanContext> = new Map();
  private completedSpans: SpanContext[] = [];

  /**
   * Start a new distributed trace span with optional parent span linking
   */
  startSpan(
    name: string,
    attributes: Record<string, string | number | boolean> = {},
    parentSpanId?: string
  ): { spanId: string; traceId: string } {
    let traceId = `trc_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;

    if (parentSpanId && this.activeSpans.has(parentSpanId)) {
      traceId = this.activeSpans.get(parentSpanId)!.traceId;
    }

    const spanId = `spn_${Math.random().toString(36).slice(2, 9)}`;

    const context: SpanContext = {
      traceId,
      spanId,
      parentSpanId,
      name,
      startTime: performance.now(),
      attributes: {
        'service.name': 'infinall-chat',
        'service.version': '2026.09.18',
        ...attributes,
      },
    };

    this.activeSpans.set(spanId, context);

    return { spanId, traceId };
  }

  /**
   * End span and record execution duration metric
   */
  endSpan(spanId: string, status: 'OK' | 'ERROR' = 'OK', extraAttributes: Record<string, any> = {}) {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    const endTime = performance.now();
    const durationMs = Math.round(endTime - span.startTime);

    span.endTime = endTime;
    span.durationMs = durationMs;
    span.status = status;
    span.attributes = {
      ...span.attributes,
      ...extraAttributes,
    };

    this.recordMetric(`span.duration_ms.${span.name}`, durationMs, {
      status,
      name: span.name,
      ...extraAttributes,
    });

    this.completedSpans.push({ ...span });
    if (this.completedSpans.length > 5000) {
      this.completedSpans = this.completedSpans.slice(-2500);
    }

    this.activeSpans.delete(spanId);
  }

  /**
   * Record a quantitative metric (Prometheus counter / gauge)
   */
  recordMetric(name: string, value: number, tags: Record<string, string> = {}) {
    this.inMemoryMetrics.push({
      name,
      value,
      tags,
      timestamp: Date.now(),
    });

    if (this.inMemoryMetrics.length > 10000) {
      this.inMemoryMetrics = this.inMemoryMetrics.slice(-5000);
    }
  }

  /**
   * Get complete hierarchical execution graph for a traceId
   */
  getTraceGraph(traceId: string): SpanContext[] {
    const matching = this.completedSpans.filter((s) => s.traceId === traceId);
    const spanMap = new Map<string, SpanContext>();
    const roots: SpanContext[] = [];

    matching.forEach((s) => {
      spanMap.set(s.spanId, { ...s, children: [] });
    });

    matching.forEach((s) => {
      const node = spanMap.get(s.spanId)!;
      if (s.parentSpanId && spanMap.has(s.parentSpanId)) {
        spanMap.get(s.parentSpanId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Wrap an async function in a trace span
   */
  async traceAsync<T>(
    name: string,
    fn: (spanId: string, traceId: string) => Promise<T>,
    attributes: Record<string, any> = {},
    parentSpanId?: string
  ): Promise<T> {
    const { spanId, traceId } = this.startSpan(name, attributes, parentSpanId);
    try {
      const result = await fn(spanId, traceId);
      this.endSpan(spanId, 'OK');
      return result;
    } catch (err: any) {
      this.endSpan(spanId, 'ERROR', { 'error.message': err.message });
      throw err;
    }
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const metricGroups: Record<string, { sum: number; count: number; lastValue: number; tags: Record<string, string> }> = {};

    for (const m of this.inMemoryMetrics) {
      if (!metricGroups[m.name]) {
        metricGroups[m.name] = { sum: 0, count: 0, lastValue: 0, tags: m.tags || {} };
      }
      metricGroups[m.name].sum += m.value;
      metricGroups[m.name].count += 1;
      metricGroups[m.name].lastValue = m.value;
    }

    let out = '# HELP infinall_metrics Infinall Chat telemetry metrics\n# TYPE infinall_metrics summary\n';
    for (const [name, stats] of Object.entries(metricGroups)) {
      const cleanName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      out += `${cleanName}_count ${stats.count}\n`;
      out += `${cleanName}_sum ${stats.sum}\n`;
      out += `${cleanName}_avg ${(stats.sum / Math.max(1, stats.count)).toFixed(2)}\n`;
      out += `${cleanName}_latest ${stats.lastValue}\n`;
    }

    return out;
  }
}

export const defaultTracer = new OpenTelemetryTracer();
