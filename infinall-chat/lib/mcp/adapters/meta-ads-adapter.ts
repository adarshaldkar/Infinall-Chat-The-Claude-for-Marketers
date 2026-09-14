// ============================================================
// MCP Adapter: Meta Ads Manager Connector
// Supports read campaigns & write mutations (with mock/live modes)
// ============================================================

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

export async function executeMetaAdsRead(query: MetaCampaignReadQuery) {
  const isMock = process.env.MCP_MODE !== 'live';

  if (isMock) {
    return {
      accountId: query.accountId ?? 'act_892374921',
      campaigns: [
        {
          id: 'camp_001',
          name: 'Q3 SaaS Growth - Retargeting',
          status: 'ACTIVE',
          dailyBudget: 250,
          spendThisMonth: 5_420,
          ctr: '1.84%',
          cpc: '$2.14',
          roas: '3.1x',
        },
        {
          id: 'camp_002',
          name: 'Top of Funnel - Lookalike 1%',
          status: 'ACTIVE',
          dailyBudget: 400,
          spendThisMonth: 9_120,
          ctr: '1.22%',
          cpc: '$1.85',
          roas: '2.4x',
        },
      ],
    };
  }

  const base = process.env.META_MCP_ENDPOINT ?? 'https://api.infinall.ai/mcp/meta';
  const res = await fetch(`${base}/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN ?? ''}`,
    },
    body: JSON.stringify(query),
  });

  if (!res.ok) throw new Error(`Meta Ads Read failed: ${await res.text()}`);
  return res.json();
}

export async function executeMetaAdsMutate(params: MetaCampaignMutationParams) {
  const isMock = process.env.MCP_MODE !== 'live';

  if (isMock) {
    return {
      success: true,
      transactionId: `meta-tx-${Date.now()}`,
      campaignId: 'camp_001',
      campaignName: params.campaignName,
      status: 'UPDATED',
      appliedBudget: params.dailyBudget ? `$${params.dailyBudget}/day` : undefined,
      appliedAudience: params.audienceTargeting,
      executedAt: new Date().toISOString(),
    };
  }

  const base = process.env.META_MCP_ENDPOINT ?? 'https://api.infinall.ai/mcp/meta';
  const res = await fetch(`${base}/mutate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN ?? ''}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error(`Meta Ads Mutation failed: ${await res.text()}`);
  return res.json();
}
