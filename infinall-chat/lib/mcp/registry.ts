// ============================================================
// MCP Server Configuration Registry
// Manages trusted MCP servers and connector bindings
// ============================================================

import { InfinallMCPClient } from './client';

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  transportType: 'remote' | 'stdio';
  endpoint?: string;
  command?: string;
  args?: string[];
  allowedTools: string[];
  trustLevel: 'verified' | 'sandboxed';
  enabled: boolean;
}

export const MCP_SERVER_REGISTRY: Record<string, MCPServerConfig> = {
  'ga4-analytics': {
    id: 'ga4-analytics',
    name: 'Google Analytics 4',
    description: 'Pulls sessions, conversion rates, and ROAS by channel',
    transportType: 'remote',
    endpoint: process.env.GA4_MCP_ENDPOINT ?? 'https://api.infinall.ai/mcp/ga4',
    allowedTools: ['ga4_metrics'],
    trustLevel: 'verified',
    enabled: true,
  },
  'meta-ads': {
    id: 'meta-ads',
    name: 'Meta Ads Manager',
    description: 'Reads active ad campaigns and updates budgets/audiences',
    transportType: 'remote',
    endpoint: process.env.META_MCP_ENDPOINT ?? 'https://api.infinall.ai/mcp/meta',
    allowedTools: ['meta_ads_read', 'meta_ads_mutate'],
    trustLevel: 'verified',
    enabled: true,
  },
  'firecrawl-scraper': {
    id: 'firecrawl-scraper',
    name: 'Firecrawl Web Scraper',
    description: 'Deep competitor landing page extraction to Markdown',
    transportType: 'remote',
    endpoint: process.env.FIRECRAWL_MCP_ENDPOINT ?? 'https://api.infinall.ai/mcp/firecrawl',
    allowedTools: ['firecrawl_scrape'],
    trustLevel: 'verified',
    enabled: true,
  },
};

export function getMcpClient(serverId: string): InfinallMCPClient {
  const config = MCP_SERVER_REGISTRY[serverId];
  if (!config) {
    throw new Error(`MCP Server "${serverId}" is not registered.`);
  }

  return new InfinallMCPClient({
    serverId: config.id,
    transportType: config.transportType,
    endpoint: config.endpoint,
    command: config.command,
    args: config.args,
  });
}
