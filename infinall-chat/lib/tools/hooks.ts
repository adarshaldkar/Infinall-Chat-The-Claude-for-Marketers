// ============================================================
// Agent Tool Lifecycle Hooks
// Handles rate-limiting, parameter auditing, latency, and telemetry
// ============================================================

import { defaultToolRateLimiter } from './rate-limiter';

export interface PreToolUseContext {
  toolName: string;
  args: Record<string, unknown>;
  sessionId: string;
  timestamp: number;
}

export interface PostToolUseContext {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
  latencyMs: number;
  isError: boolean;
  sessionId: string;
}

export async function beforeToolExecution(ctx: PreToolUseContext): Promise<{ proceed: boolean; error?: string }> {
  // 1. Rate-limit check
  const rateLimit = await defaultToolRateLimiter.consume(ctx.toolName, 1);
  if (!rateLimit.allowed) {
    return { proceed: false, error: rateLimit.error };
  }

  // 2. Parameter sanity check (prevent prototype pollution by checking own keys)
  if (ctx.args && typeof ctx.args === 'object') {
    const ownKeys = Object.keys(ctx.args);
    if (ownKeys.includes('__proto__') || ownKeys.includes('constructor') || ownKeys.includes('prototype')) {
      return { proceed: false, error: 'Security Exception: Malicious prototype key detected.' };
    }
  }

  return { proceed: true };
}

export async function afterToolExecution(ctx: PostToolUseContext): Promise<unknown> {
  // 1. Output truncation watchdog (prevent huge payloads from blowing up context window)
  if (typeof ctx.result === 'string' && ctx.result.length > 25_000) {
    return ctx.result.slice(0, 25_000) + '\n\n[Warning: Tool output truncated to preserve token budget]';
  }

  // 2. Telemetry logging for observability
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Tool Audit] ${ctx.toolName} executed in ${ctx.latencyMs}ms (status: ${ctx.isError ? 'ERROR' : 'OK'})`);
  }

  return ctx.result;
}
