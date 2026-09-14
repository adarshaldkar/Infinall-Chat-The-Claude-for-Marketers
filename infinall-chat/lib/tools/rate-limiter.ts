// ============================================================
// Tool Rate Limiter
// Unified interface for in-memory (local dev) and Redis (production)
// ============================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  error?: string;
}

export interface RateLimiter {
  consume(key: string, cost?: number): Promise<RateLimitResult>;
}

export class MemoryTokenBucket implements RateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private maxTokens: number;
  private refillRatePerSec: number;

  constructor(maxTokens: number = 10, refillRatePerSec: number = 2) {
    this.maxTokens = maxTokens;
    this.refillRatePerSec = refillRatePerSec;
  }

  async consume(key: string, cost: number = 1): Promise<RateLimitResult> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    } else {
      // Refill tokens
      const elapsedSec = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + elapsedSec * this.refillRatePerSec);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetMs: 0,
      };
    }

    const missingTokens = cost - bucket.tokens;
    const resetMs = Math.ceil((missingTokens / this.refillRatePerSec) * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetMs,
      error: `Rate limit exceeded for tool "${key}". Try again in ${Math.ceil(resetMs / 1000)}s.`,
    };
  }
}

export const defaultToolRateLimiter = new MemoryTokenBucket(15, 3);
export const defaultApiRateLimiter = new MemoryTokenBucket(60, 10);
