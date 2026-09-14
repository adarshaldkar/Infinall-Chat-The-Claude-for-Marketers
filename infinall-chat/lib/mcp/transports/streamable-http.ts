// ============================================================
// MCP Transport: Streamable HTTP (Primary Remote Transport)
// Conforms to 2026-07-28 Model Context Protocol specification
// ============================================================

export interface StreamableHTTPConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export class StreamableHTTPTransport {
  private endpoint: string;
  private headers: Record<string, string>;
  private timeoutMs: number;

  constructor(config: StreamableHTTPConfig) {
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
          Accept: 'application/json, text/event-stream',
          ...this.headers,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          method,
          params,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Streamable HTTP MCP Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`MCP RPC Error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      return data.result;
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
