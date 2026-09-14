// ============================================================
// MCP Transport: Legacy HTTP+SSE Fallback Transport
// For backwards compatibility with older MCP remote servers
// ============================================================

export interface SSEFallbackConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export class SSEFallbackTransport {
  private endpoint: string;
  private headers: Record<string, string>;
  private timeoutMs: number;

  constructor(config: SSEFallbackConfig) {
    this.endpoint = config.endpoint;
    this.headers = config.headers ?? {};
    this.timeoutMs = config.timeoutMs ?? 15_000;
  }

  async sendJsonRpc(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
          ...this.headers,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `sse-fallback-${Date.now()}`,
          method,
          params,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE Fallback MCP Error ${response.status}: ${await response.text()}`);
      }

      const text = await response.text();
      // Handle either direct JSON response or SSE-wrapped JSON
      let rawJson = text;
      if (text.startsWith('data: ')) {
        const line = text.split('\n').find((l) => l.startsWith('data: '));
        if (line) rawJson = line.slice(6);
      }

      const parsed = JSON.parse(rawJson);
      if (parsed.error) {
        throw new Error(`MCP RPC Error: ${parsed.error.message || JSON.stringify(parsed.error)}`);
      }

      return parsed.result;
    } finally {
      clearTimeout(timer);
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.sendJsonRpc('ping');
      return true;
    } catch {
      return false;
    }
  }
}
