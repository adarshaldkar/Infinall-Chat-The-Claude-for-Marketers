// ============================================================
// Infinall Tool Registry — Unified Built-in & MCP Tool Index
// Runtime validation via Zod, deferred schema discovery,
// and safety classification (read-only vs mutation approval).
// ============================================================

import { z } from 'zod';
import { MARKETING_TOOL_CATALOG } from './catalog';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema for LLM function calling
  isMutation: boolean;                  // true = triggers Human-in-the-Loop approval gate
  zodSchema: z.ZodType<unknown>;        // runtime argument validation
}

// 1. Web Search
export const WebSearchArgsSchema = z.object({
  queries: z.array(z.string().min(1)).min(1).max(10).optional(),
  query: z.string().optional(),
  maxResults: z.number().optional(),
}).refine((data) => (data.queries && data.queries.length > 0) || !!data.query, {
  message: 'Either query or queries must be provided',
});

export type WebSearchArgs = z.infer<typeof WebSearchArgsSchema>;

// 2. Firecrawl Scraper
const FirecrawlScrapeArgsSchema = z.object({
  url: z.string().url(),
  formats: z.array(z.enum(['markdown', 'html'])).optional(),
});

// 3. GA4 Analytics
const GA4MetricsArgsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dimensions: z.array(z.string()).optional(),
  metrics: z.array(z.string()).optional(),
});

// 4. Meta Ads Read
const MetaAdsReadArgsSchema = z.object({
  accountId: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'ALL']).optional(),
});

// 5. Meta Ads Mutate (Write)
const MetaAdsMutateArgsSchema = z.object({
  accountId: z.string().min(1),
  campaignName: z.string().min(1),
  action: z.enum(['CREATE', 'UPDATE_BUDGET', 'PAUSE', 'UPDATE_AUDIENCE']),
  dailyBudget: z.number().positive().optional(),
  audienceTargeting: z.string().optional(),
  bidStrategy: z.string().optional(),
});

// 6. Google Ads Mutate (Write)
const GoogleAdsMutateArgsSchema = z.object({
  campaignId: z.string().min(1),
  targetKeyword: z.string().optional(),
  bidAmount: z.number().positive().optional(),
  action: z.enum(['UPDATE_BID', 'PAUSE_KEYWORD', 'APPLY_NEGATIVE']),
});

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  web_search: {
    name: 'web_search',
    description: MARKETING_TOOL_CATALOG.web_search.description,
    parameters: MARKETING_TOOL_CATALOG.web_search.parameters,
    isMutation: false,
    zodSchema: WebSearchArgsSchema,
  },
  firecrawl_scrape: {
    name: 'firecrawl_scrape',
    description: MARKETING_TOOL_CATALOG.firecrawl_scrape.description,
    parameters: MARKETING_TOOL_CATALOG.firecrawl_scrape.parameters,
    isMutation: false,
    zodSchema: FirecrawlScrapeArgsSchema,
  },
  ga4_metrics: {
    name: 'ga4_metrics',
    description: MARKETING_TOOL_CATALOG.ga4_metrics.description,
    parameters: MARKETING_TOOL_CATALOG.ga4_metrics.parameters,
    isMutation: false,
    zodSchema: GA4MetricsArgsSchema,
  },
  meta_ads_read: {
    name: 'meta_ads_read',
    description: MARKETING_TOOL_CATALOG.meta_ads_read.description,
    parameters: MARKETING_TOOL_CATALOG.meta_ads_read.parameters,
    isMutation: false,
    zodSchema: MetaAdsReadArgsSchema,
  },
  meta_ads_mutate: {
    name: 'meta_ads_mutate',
    description: MARKETING_TOOL_CATALOG.meta_ads_mutate.description,
    parameters: MARKETING_TOOL_CATALOG.meta_ads_mutate.parameters,
    isMutation: true,
    zodSchema: MetaAdsMutateArgsSchema,
  },
  google_ads_mutate: {
    name: 'google_ads_mutate',
    description: MARKETING_TOOL_CATALOG.google_ads_mutate.description,
    parameters: MARKETING_TOOL_CATALOG.google_ads_mutate.parameters,
    isMutation: true,
    zodSchema: GoogleAdsMutateArgsSchema,
  },
};

export function isMutationTool(toolName: string): boolean {
  return TOOL_REGISTRY[toolName]?.isMutation ?? false;
}

export function validateToolArgs(toolName: string, rawArgs: unknown): Record<string, unknown> {
  const tool = TOOL_REGISTRY[toolName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}. Available: ${Object.keys(TOOL_REGISTRY).join(', ')}`);
  }

  const result = tool.zodSchema.safeParse(rawArgs);
  if (!result.success) {
    const errorDetails = result.error.issues.map((e) => `${e.path.map(String).join('.')}: ${e.message}`).join('; ');
    throw new Error(`Tool parameter validation failed for ${toolName}: ${errorDetails}`);
  }

  return result.data as Record<string, unknown>;
}
