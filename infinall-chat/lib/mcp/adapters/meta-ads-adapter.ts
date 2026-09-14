// ============================================================
// MCP Adapter: Meta Ads Manager Connector
// Config-driven. Modes: off | sandbox | live (see lib/mcp/config.ts)
// Write mutations always ALSO pass through the approval gate.
// ============================================================

import { getConnectorSettings, assertConnectorReady, ConnectorSettings } from '../config';

export interface MetaCampaignReadQuery {
  accountId?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'ALL';
}

export interface MetaCampaignMutationParams {
  accountId: string;
  campaignName: string;
  action: 'CREATE' | 'UPDATE_BUDGET' | 'PAUSE' | 'UPDATE_AUDIENCE';
  dailyBudget?: number;
  audienceTargeting?: string;
  bidStrategy?: string;
}

export interface MetaAdsReadResult {
  accountId: string;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    dailyBudget: number;
    spendThisMonth: number;
    ctr: string;
    cpc: string;
    roas: string;
  }>;
  isSandbox?: boolean;
}

export interface MetaAdsMutateResult {
  success: boolean;
  transactionId?: string;
  campaignId?: string;
  campaignName: string;
  status?: string;
  appliedBudget?: string;
  appliedAudience?: string;
  executedAt?: string;
  raw?: unknown;
  isSandbox?: boolean;
}

interface StoredCampaign {
  id: string;
  name: string;
  status: string;
  dailyBudget: number;
  spendThisMonth: number;
  ctr: string;
  cpc: string;
  roas: string;
  audienceTargeting?: string;
}

const CAMPAIGN_STORE: Record<string, StoredCampaign[]> = {};

function getOrCreateCampaigns(accountId: string): StoredCampaign[] {
  if (!CAMPAIGN_STORE[accountId]) {
    const seed = accountId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    CAMPAIGN_STORE[accountId] = [
      {
        id: `camp_${(seed % 900) + 100}`,
        name: `Q3 Growth & Retargeting [${accountId.slice(-4)}]`,
        status: 'ACTIVE',
        dailyBudget: 250 + (seed % 150),
        spendThisMonth: 4800 + (seed % 2000),
        ctr: `${(1.75 + (seed % 10) * 0.05).toFixed(2)}%`,
        cpc: `$${(2.10 + (seed % 8) * 0.05).toFixed(2)}`,
        roas: `${(2.8 + (seed % 6) * 0.1).toFixed(1)}x`,
      },
      {
        id: `camp_${(seed % 900) + 101}`,
        name: `Top of Funnel Lookalikes [${accountId.slice(-4)}]`,
        status: 'ACTIVE',
        dailyBudget: 400 + (seed % 200),
        spendThisMonth: 8500 + (seed % 3000),
        ctr: `${(1.20 + (seed % 6) * 0.04).toFixed(2)}%`,
        cpc: `$${(1.80 + (seed % 5) * 0.05).toFixed(2)}`,
        roas: `${(2.2 + (seed % 5) * 0.1).toFixed(1)}x`,
      },
      {
        id: `camp_${(seed % 900) + 102}`,
        name: `Brand Awareness Video Views`,
        status: 'PAUSED',
        dailyBudget: 150,
        spendThisMonth: 1240,
        ctr: '2.85%',
        cpc: '$0.85',
        roas: '1.4x',
      },
    ];
  }
  return CAMPAIGN_STORE[accountId];
}

function sandboxRead(accountId: string, statusFilter?: 'ACTIVE' | 'PAUSED' | 'ALL'): MetaAdsReadResult {
  const allCampaigns = getOrCreateCampaigns(accountId);
  const filtered = statusFilter && statusFilter !== 'ALL'
    ? allCampaigns.filter((c) => c.status.toUpperCase() === statusFilter.toUpperCase())
    : allCampaigns;

  return {
    accountId,
    campaigns: filtered.map(({ id, name, status, dailyBudget, spendThisMonth, ctr, cpc, roas }) => ({
      id,
      name,
      status,
      dailyBudget,
      spendThisMonth,
      ctr,
      cpc,
      roas,
    })),
    isSandbox: true,
  };
}

function sandboxMutate(params: MetaCampaignMutationParams): MetaAdsMutateResult {
  const campaigns = getOrCreateCampaigns(params.accountId);
  const target = campaigns.find((c) => c.name === params.campaignName || c.id === params.campaignName);
  
  let targetCampaignId = target?.id;

  if (params.action === 'CREATE') {
    targetCampaignId = `camp_${Date.now().toString().slice(-4)}`;
    campaigns.push({
      id: targetCampaignId,
      name: params.campaignName,
      status: 'ACTIVE',
      dailyBudget: params.dailyBudget ?? 200,
      spendThisMonth: 0,
      ctr: '0.00%',
      cpc: '$0.00',
      roas: '0.0x',
      audienceTargeting: params.audienceTargeting,
    });
  } else if (target) {
    if (params.action === 'UPDATE_BUDGET' && params.dailyBudget) {
      target.dailyBudget = params.dailyBudget;
    } else if (params.action === 'PAUSE') {
      target.status = 'PAUSED';
    } else if (params.action === 'UPDATE_AUDIENCE' && params.audienceTargeting) {
      target.audienceTargeting = params.audienceTargeting;
    }
  } else {
    targetCampaignId = `camp_${Date.now().toString().slice(-4)}`;
    campaigns.push({
      id: targetCampaignId,
      name: params.campaignName,
      status: params.action === 'PAUSE' ? 'PAUSED' : 'ACTIVE',
      dailyBudget: params.dailyBudget ?? 250,
      spendThisMonth: 1500,
      ctr: '1.50%',
      cpc: '$2.00',
      roas: '2.5x',
      audienceTargeting: params.audienceTargeting,
    });
  }

  return {
    success: true,
    transactionId: `meta-tx-${Date.now()}`,
    campaignId: targetCampaignId ?? 'camp_001',
    campaignName: params.campaignName,
    status: params.action === 'PAUSE' ? 'PAUSED' : 'UPDATED',
    appliedBudget: params.dailyBudget ? `$${params.dailyBudget}/day` : undefined,
    appliedAudience: params.audienceTargeting,
    executedAt: new Date().toISOString(),
    isSandbox: true,
  };
}

const SETTINGS_READ = (): ConnectorSettings =>
  getConnectorSettings('META', 'https://api.infinall.ai/mcp/meta', ['META_ACCESS_TOKEN', 'META_APP_TOKEN']);

export async function executeMetaAdsRead(query: MetaCampaignReadQuery): Promise<MetaAdsReadResult> {
  const settings = SETTINGS_READ();
  assertConnectorReady(settings, 'Meta Ads (read)');

  if (settings.mode === 'sandbox') return sandboxRead(query.accountId ?? 'act_892374921', query.status);

  const res = await fetch(`${settings.endpoint}/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN ?? ''}`,
    },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Meta Ads Read failed: ${await res.text()}`);
  return { ...((await res.json()) as MetaAdsReadResult), isSandbox: false };
}

export async function executeMetaAdsMutate(
  params: MetaCampaignMutationParams
): Promise<MetaAdsMutateResult> {
  const settings = SETTINGS_READ();
  assertConnectorReady(settings, 'Meta Ads (mutate)');

  if (settings.mode === 'sandbox') return sandboxMutate(params);

  const res = await fetch(`${settings.endpoint}/mutate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN ?? ''}`,
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Meta Ads Mutation failed: ${await res.text()}`);
  return { ...((await res.json()) as MetaAdsMutateResult), isSandbox: false };
}