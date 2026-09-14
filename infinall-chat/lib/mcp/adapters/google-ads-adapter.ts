// ============================================================
// MCP Adapter: Google Ads Connector
// Config-driven. Modes: off | sandbox | live (see lib/mcp/config.ts)
// Read queries = autonomous; mutations = approval gate.
// ============================================================

import { getConnectorSettings, assertConnectorReady, ConnectorSettings } from '../config';

export interface GoogleAdsQuery {
  keywords?: string[];
  campaignId?: string;
  category?: string;
}

export interface GoogleAdsMutationParams {
  campaignId: string;
  bidAmount?: number;
  budgetAmount?: number;
  status?: 'PAUSED' | 'ENABLED';
  targetRoas?: number;
}

export interface GoogleAdsReadResult {
  category: string;
  benchmarks: Array<{
    keyword: string;
    searchVolume: string;
    avgCpc: string;
    topOfPageBidHigh: string;
    competition: string;
  }>;
  recommendedBidStrategy: string;
  isSandbox?: boolean;
}

export interface GoogleAdsMutateResult {
  success: boolean;
  tool: string;
  campaignId: string;
  appliedBid?: string;
  appliedDailyBudget?: string;
  appliedStatus: string;
  targetRoas?: string;
  mutationId?: string;
  status: string;
  resourceName?: string;
  timestamp: string;
  isSandbox?: boolean;
}

const SETTINGS = (): ConnectorSettings =>
  getConnectorSettings('GOOGLE_ADS', 'https://api.infinall.ai/mcp/google-ads', ['GOOGLE_ADS_API_KEY', 'GOOGLE_ADS_DEVELOPER_TOKEN']);

const GOOGLE_ADS_STORE: Record<string, {
  campaignId: string;
  appliedBid?: string;
  appliedDailyBudget?: string;
  status: string;
  targetRoas?: string;
  updatedAt: string;
}> = {};

export async function executeGoogleAdsQuery(query: GoogleAdsQuery): Promise<GoogleAdsReadResult> {
  const settings = SETTINGS();
  assertConnectorReady(settings, 'Google Ads (read)');

  if (settings.mode === 'sandbox') return sandboxQuery(query);

  const res = await fetch(`${settings.endpoint}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GOOGLE_ADS_API_KEY ?? ''}`,
    },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Google Ads Query failed: ${await res.text()}`);
  return { ...((await res.json()) as GoogleAdsReadResult), isSandbox: false };
}

export async function executeGoogleAdsMutate(params: GoogleAdsMutationParams): Promise<GoogleAdsMutateResult> {
  const settings = SETTINGS();
  assertConnectorReady(settings, 'Google Ads (mutate)');

  if (settings.mode === 'sandbox') return sandboxMutate(params);

  const res = await fetch(`${settings.endpoint}/mutate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GOOGLE_ADS_API_KEY ?? ''}`,
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Google Ads Mutate failed: ${await res.text()}`);
  return { ...((await res.json()) as GoogleAdsMutateResult), isSandbox: false };
}

function sandboxQuery(query: GoogleAdsQuery): GoogleAdsReadResult {
  const category = query.category ?? 'B2B SaaS / CRM';
  const targetKeywords = query.keywords && query.keywords.length > 0
    ? query.keywords
    : ['b2b crm software', 'best sales automation tools', 'enterprise pipeline manager'];

  const benchmarks = targetKeywords.map((kw) => {
    const seed = kw.toLowerCase().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const monthlySearches = 1200 + (seed % 35) * 450;
    const baseCpc = 8.50 + (seed % 22) * 0.70;
    const topOfPage = baseCpc * (1.45 + (seed % 5) * 0.05);
    const compLevels = ['High', 'Medium', 'High', 'Low', 'Medium'];
    const comp = compLevels[seed % compLevels.length];

    return {
      keyword: kw,
      searchVolume: `${monthlySearches.toLocaleString()}/mo`,
      avgCpc: `$${baseCpc.toFixed(2)}`,
      topOfPageBidHigh: `$${topOfPage.toFixed(2)}`,
      competition: comp,
    };
  });

  const avgCpcOverall = benchmarks.reduce((acc, b) => acc + parseFloat(b.avgCpc.replace('$', '')), 0) / benchmarks.length;
  const targetCpaCeiling = (avgCpcOverall * 2.5).toFixed(2);

  return {
    category,
    benchmarks,
    recommendedBidStrategy: `Target CPA with $${targetCpaCeiling} ceiling`,
    isSandbox: true,
  };
}

function sandboxMutate(params: GoogleAdsMutationParams): GoogleAdsMutateResult {
  const appliedBid = params.bidAmount ? `$${params.bidAmount}` : undefined;
  const appliedDailyBudget = params.budgetAmount ? `$${params.budgetAmount}` : undefined;
  const targetRoas = params.targetRoas ? `${params.targetRoas}%` : undefined;
  const appliedStatus = params.status ?? 'ENABLED';

  GOOGLE_ADS_STORE[params.campaignId] = {
    campaignId: params.campaignId,
    appliedBid,
    appliedDailyBudget,
    status: appliedStatus,
    targetRoas,
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    tool: 'google_ads_mutate',
    campaignId: params.campaignId,
    appliedBid,
    appliedDailyBudget,
    appliedStatus,
    targetRoas,
    mutationId: `gads_mut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    status: 'MUTATION_APPLIED',
    resourceName: `customers/current/campaigns/${params.campaignId}`,
    timestamp: new Date().toISOString(),
    isSandbox: true,
  };
}