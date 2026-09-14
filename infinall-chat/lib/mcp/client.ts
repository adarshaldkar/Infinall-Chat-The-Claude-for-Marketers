// ============================================================
// Infinall Unified MCP Client
// Uses Streamable HTTP as primary remote transport with SSE fallback,
// and secure stdio for local processes.
// ============================================================

import { StreamableHTTPTransport } from './transports/streamable-http';
import { SSEFallbackTransport } from './transports/sse-fallback';
import { StdioTransport } from './transports/stdio';

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPClientConfig {
  serverId: string;
  transportType: 'remote' | 'stdio';
  endpoint?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export class InfinallMCPClient {
  public readonly serverId: string;
  private primaryRemote?: StreamableHTTPTransport;
  private fallbackRemote?: SSEFallbackTransport;
  private stdioTransport?: StdioTransport;
  private isRemote: boolean;

  constructor(config: MCPClientConfig) {
    this.serverId = config.serverId;
    this.isRemote = config.transportType === 'remote';

    if (this.isRemote) {
      if (!config.endpoint) {
        throw new Error(`MCP Remote Server "${config.serverId}" missing endpoint URL.`);
      }
      this.primaryRemote = new StreamableHTTPTransport({
        endpoint: config.endpoint,
        headers: config.headers,
        timeoutMs: config.timeoutMs,
      });
      this.fallbackRemote = new SSEFallbackTransport({
        endpoint: config.endpoint,
        headers: config.headers,
        timeoutMs: config.timeoutMs,
      });
    } else {
      if (!config.command) {
        throw new Error(`MCP Stdio Server "${config.serverId}" missing executable command.`);
      }
      this.stdioTransport = new StdioTransport({
        command: config.command,
        args: config.args,
        env: config.env,
        timeoutMs: config.timeoutMs,
      });
    }
  }

  async listTools(): Promise<MCPToolInfo[]> {
    const result = await this.executeRpc('tools/list');
    const typed = result as { tools?: MCPToolInfo[] };
    return typed?.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }> {
    const result = await this.executeRpc('tools/call', { name, arguments: args });
    return result as { content: Array<{ type: string; text?: string }>; isError?: boolean };
  }

  private async executeRpc(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.isRemote && this.stdioTransport) {
      return this.stdioTransport.sendJsonRpc(method, params);
    }

    // Try primary Streamable HTTP transport first
    try {
      if (this.primaryRemote) {
        return await this.primaryRemote.sendJsonRpc(method, params);
      }
    } catch (primaryErr) {
      // Fall back to legacy SSE transport if primary Streamable HTTP fails
      if (this.fallbackRemote) {
        try {
          return await this.fallbackRemote.sendJsonRpc(method, params);
        } catch (fallbackErr) {
          throw new Error(
            `MCP Server "${this.serverId}" failed on both Streamable HTTP and SSE fallback. Streamable error: ${primaryErr instanceof Error ? primaryErr.message : String(primaryErr)}, Fallback error: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`
          );
        }
      }
      throw primaryErr;
    }
  }
}
