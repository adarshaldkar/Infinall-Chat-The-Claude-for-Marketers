// ============================================================
// Infinall Marketing Tool Catalog
// Single source of truth for built-in and MCP tool definitions
// ============================================================

export interface ToolCatalogDescriptor {
  name: string;
  category: 'research' | 'analytics' | 'campaign' | 'intelligence';
  displayName: string;
  description: string;
  source: 'builtin' | 'mcp';
  safety: 'read_only' | 'mutation_approval_required';
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  keywords: string[];
}

export const MARKETING_TOOL_CATALOG: Record<string, ToolCatalogDescriptor> = {
  web_search: {
    name: 'web_search',
    category: 'research',
    displayName: 'Web Search',
    description: 'Searches the live web for recent competitor news, industry trends, and pricing data.',
    source: 'builtin',
    safety: 'read_only',
    parameters: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: { type: 'string' },
          description: 'Search queries to execute in parallel',
        },
      },
      required: ['queries'],
    },
    keywords: ['search', 'google', 'news', 'find', 'research', 'competitor', 'pricing', 'industry', 'benchmark'],
  },

  firecrawl_scrape: {
    name: 'firecrawl_scrape',
    category: 'intelligence',
    displayName: 'Competitor Page Scraper',
    description: 'Scrapes full text, pricing tables, and feature matrices from competitor landing pages into clean Markdown.',
    source: 'mcp',
    safety: 'read_only',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The competitor URL to scrape' },
        formats: {
          type: 'array',
          items: { type: 'string', enum: ['markdown', 'html'] },
          description: 'Desired content formats',
        },
      },
      required: ['url'],
    },
    keywords: ['scrape', 'firecrawl', 'landing page', 'competitor website', 'extract pricing', 'url', 'webpage'],
  },

  ga4_metrics: {
    name: 'ga4_metrics',
    category: 'analytics',
    displayName: 'Google Analytics 4',
    description: 'Pulls sessions, conversions, CAC, and ROAS across paid and organic marketing channels.',
    source: 'mcp',
    safety: 'read_only',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dimensions (e.g. channelGrouping, campaignName)',
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Metrics (e.g. sessions, conversions, cpa, roas)',
        },
      },
    },
    keywords: ['ga4', 'google analytics', 'traffic', 'sessions', 'conversions', 'cac', 'roas', 'analytics', 'performance'],
  },

  meta_ads_read: {
    name: 'meta_ads_read',
    category: 'campaign',
    displayName: 'Meta Ads Manager (Read)',
    description: 'Fetches active Meta ad campaigns, monthly spend, CTR, CPC, and audience performance.',
    source: 'mcp',
    safety: 'read_only',
    parameters: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Meta Ad Account ID (e.g. act_892374921)' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ALL'], description: 'Filter by campaign status' },
      },
    },
    keywords: ['meta ads', 'facebook ads', 'instagram ads', 'campaigns', 'spend', 'ctr', 'cpc', 'ad sets'],
  },

  meta_ads_mutate: {
    name: 'meta_ads_mutate',
    category: 'campaign',
    displayName: 'Meta Ads Manager (Mutate)',
    description: 'Creates campaigns, reallocates ad budgets, or updates audience targeting. Requires user approval.',
    source: 'mcp',
    safety: 'mutation_approval_required',
    parameters: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Meta Ad Account ID' },
        campaignName: { type: 'string', description: 'Name of the campaign' },
        action: {
          type: 'string',
          enum: ['CREATE', 'UPDATE_BUDGET', 'PAUSE', 'UPDATE_AUDIENCE'],
          description: 'The mutation operation to perform',
        },
        dailyBudget: { type: 'number', description: 'Daily spend in USD' },
        audienceTargeting: { type: 'string', description: 'Target audience specification' },
        bidStrategy: { type: 'string', description: 'Bidding strategy (e.g. Cost Cap, Lowest Cost)' },
      },
      required: ['accountId', 'campaignName', 'action'],
    },
    keywords: ['reallocate budget', 'change spend', 'create campaign', 'update audience', 'scale ads', 'adjust budget', 'mutate'],
  },

  google_ads_mutate: {
    name: 'google_ads_mutate',
    category: 'campaign',
    displayName: 'Google Ads Manager (Mutate)',
    description: 'Adjusts Google Ads CPC keyword bids and target CPA settings. Requires user approval.',
    source: 'mcp',
    safety: 'mutation_approval_required',
    parameters: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'Google Ads Campaign ID' },
        targetKeyword: { type: 'string', description: 'Target keyword to adjust' },
        bidAmount: { type: 'number', description: 'Max CPC bid amount in USD' },
        action: { type: 'string', enum: ['UPDATE_BID', 'PAUSE_KEYWORD', 'APPLY_NEGATIVE'], description: 'Mutation action' },
      },
      required: ['campaignId', 'action'],
    },
    keywords: ['google ads', 'cpc bid', 'keyword bid', 'google spend', 'target cpa', 'adjust bids'],
  },
};
