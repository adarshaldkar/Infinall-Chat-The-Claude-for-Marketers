// ============================================================
// Infinall Chat - Tool Execution Health & Latency Tracker
// Records real latency, EMA (exponential moving average), and
// status (healthy / degraded / failing) for all active & MCP tools.
// ============================================================

import { db, ToolMetricItem } from '@/lib/storage/db';

export function recordToolExecutionMetric(
  toolName: string,
  latencyMs: number,
  isError: boolean
): ToolMetricItem {
  const existing = db.toolMetrics.get(toolName);

  if (!existing) {
    const newMetric: ToolMetricItem = {
      id: toolName,
      totalCalls: 1,
      successCount: isError ? 0 : 1,
      failureCount: isError ? 1 : 0,
      avgLatencyMs: latencyMs,
      lastLatencyMs: latencyMs,
      lastCalledAt: new Date().toISOString(),
      status: isError ? 'degraded' : 'healthy',
    };
    db.toolMetrics.set(toolName, newMetric);
    return newMetric;
  }

  const totalCalls = existing.totalCalls + 1;
  const successCount = existing.successCount + (isError ? 0 : 1);
  const failureCount = existing.failureCount + (isError ? 1 : 0);
  // Exponential Moving Average (alpha = 0.2)
  const avgLatencyMs = Math.round(existing.avgLatencyMs * 0.8 + latencyMs * 0.2);

  const failureRate = failureCount / totalCalls;
  const status: 'healthy' | 'degraded' | 'failing' =
    failureRate > 0.4 ? 'failing' : failureRate > 0.1 || avgLatencyMs > 2000 ? 'degraded' : 'healthy';

  const updated: ToolMetricItem = {
    ...existing,
    totalCalls,
    successCount,
    failureCount,
    avgLatencyMs,
    lastLatencyMs: latencyMs,
    lastCalledAt: new Date().toISOString(),
    status,
  };

  db.toolMetrics.set(toolName, updated);
  return updated;
}

export function getToolMetrics(): ToolMetricItem[] {
  return db.toolMetrics.getAll();
}

export function getToolHealth(toolName: string): ToolMetricItem | undefined {
  return db.toolMetrics.get(toolName);
}
