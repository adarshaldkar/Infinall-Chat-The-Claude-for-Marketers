// ============================================================
// MCP Adapter: Google Analytics 4 (GA4) Connector
// Supports Mock mode (deterministic offline) and Live mode
// ============================================================

export interface GA4MetricsQuery {
  startDate?: string;
  endDate?: string;
  dimensions?: string[];
  metrics?: string[];
}

export interface GA4MetricsResult {
  dateRange: string;
  summary: {
    sessions: number;
    activeUsers: number;
    conversions: number;
    conversionRate: string;
    cpa: string;
    totalRevenue: string;
  };
  channelBreakdown: Array<{
    channel: string;
    sessions: number;
    conversions: number;
    cpa: string;
    roas: string;
  }>;
}

export async function executeGA4Metrics(query: GA4MetricsQuery): Promise<GA4MetricsResult> {
  const isMock = process.env.MCP_MODE !== 'live';

  if (isMock) {
    // Deterministic mock fixtures for offline reliability
    return {
      dateRange: `${query.startDate ?? '2026-08-01'} to ${query.endDate ?? '2026-08-31'}`,
      summary: {
        sessions: 48_250,
        activeUsers: 34_120,
        conversions: 1_280,
        conversionRate: '2.65%',
        cpa: '$42.18',
        totalRevenue: '$148,500',
      },
      channelBreakdown: [
        { channel: 'Paid Search (Google Ads)', sessions: 18_400, conversions: 580, cpa: '$38.20', roas: '3.8x' },
        { channel: 'Paid Social (Meta Ads)', sessions: 14_200, conversions: 390, cpa: '$46.50', roas: '2.9x' },
        { channel: 'Organic Search', sessions: 11_150, conversions: 240, cpa: '$0.00', roas: 'N/A' },
        { channel: 'Direct / Referral', sessions: 4_500, conversions: 70, cpa: '$0.00', roas: 'N/A' },
      ],
    };
  }

  // Live MCP call to external GA4 service
  const base = process.env.GA4_MCP_ENDPOINT ?? 'https://api.infinall.ai/mcp/ga4';
  const res = await fetch(`${base}/metrics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GA4_API_KEY ?? ''}`,
    },
    body: JSON.stringify(query),
  });

  if (!res.ok) {
    throw new Error(`GA4 MCP query failed (${res.status}): ${await res.text()}`);
  }

  return res.json();
}
