// ============================================================
// MCP Adapter: Google Analytics 4 (GA4) Connector
// Config-driven. Modes: off | sandbox | live (see lib/mcp/config.ts)
// Never fabricates data silently — sandbox data is always flagged.
// ============================================================

import { getConnectorSettings, assertConnectorReady, ConnectorSettings } from '../config';

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
  /** Present (true) only when the result is deterministic sandbox data. */
  isSandbox?: boolean;
}

const SETTINGS = (): ConnectorSettings =>
  getConnectorSettings('GA4', 'https://api.infinall.ai/mcp/ga4', ['GA4_API_KEY', 'GA4_SERVICE_ACCOUNT']);

export async function executeGA4Metrics(query: GA4MetricsQuery): Promise<GA4MetricsResult> {
  const settings = SETTINGS();
  assertConnectorReady(settings, 'GA4');
  const startDate = query.startDate ?? '2026-08-01';
  const endDate = query.endDate ?? '2026-08-31';

  if (settings.mode === 'sandbox') {
    return sandboxPayload(startDate, endDate);
  }

  const res = await fetch(`${settings.endpoint}/metrics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GA4_API_KEY ?? ''}`,
    },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`GA4 MCP query failed (${res.status}): ${await res.text()}`);
  }

  const payload = (await res.json()) as GA4MetricsResult;
  return { ...payload, isSandbox: false };
}

function sandboxPayload(startDate: string, endDate: string): GA4MetricsResult {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const validStart = !isNaN(start.getTime()) ? start : new Date('2026-08-01');
  const validEnd = !isNaN(end.getTime()) ? end : new Date('2026-08-31');
  
  const diffDays = Math.max(1, Math.round(Math.abs(validEnd.getTime() - validStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  // Deterministic seed from date strings to keep results consistent for identical queries
  const dateSeed = (validStart.getDate() * 31 + validEnd.getDate() * 7 + diffDays * 13) % 100;
  
  const dailySessions = 1450 + (dateSeed * 5);
  const totalSessions = Math.round(diffDays * dailySessions);
  const activeUsers = Math.round(totalSessions * (0.70 + (dateSeed % 5) * 0.01));
  const conversionRateNum = 2.45 + (dateSeed % 8) * 0.05;
  const conversions = Math.round(totalSessions * (conversionRateNum / 100));
  const avgOrderVal = 115 + (dateSeed % 25);
  const totalRevenueNum = Math.round(conversions * avgOrderVal);
  const baseCpa = 38.50 + (dateSeed % 9);

  // Proportional channel breakdowns that sum up dynamically
  const paidSearchSessions = Math.round(totalSessions * 0.382);
  const paidSearchConversions = Math.round(conversions * 0.453);
  const paidSocialSessions = Math.round(totalSessions * 0.294);
  const paidSocialConversions = Math.round(conversions * 0.305);
  const organicSessions = Math.round(totalSessions * 0.231);
  const organicConversions = Math.round(conversions * 0.187);
  const directSessions = Math.max(0, totalSessions - paidSearchSessions - paidSocialSessions - organicSessions);
  const directConversions = Math.max(0, conversions - paidSearchConversions - paidSocialConversions - organicConversions);

  return {
    dateRange: `${startDate} to ${endDate} (${diffDays} days)`,
    summary: {
      sessions: totalSessions,
      activeUsers,
      conversions,
      conversionRate: `${conversionRateNum.toFixed(2)}%`,
      cpa: `$${baseCpa.toFixed(2)}`,
      totalRevenue: `$${totalRevenueNum.toLocaleString()}`,
    },
    channelBreakdown: [
      {
        channel: 'Paid Search (Google Ads)',
        sessions: paidSearchSessions,
        conversions: paidSearchConversions,
        cpa: `$${(baseCpa * 0.92).toFixed(2)}`,
        roas: `${(3.4 + (dateSeed % 6) * 0.1).toFixed(1)}x`,
      },
      {
        channel: 'Paid Social (Meta Ads)',
        sessions: paidSocialSessions,
        conversions: paidSocialConversions,
        cpa: `$${(baseCpa * 1.10).toFixed(2)}`,
        roas: `${(2.6 + (dateSeed % 5) * 0.1).toFixed(1)}x`,
      },
      {
        channel: 'Organic Search',
        sessions: organicSessions,
        conversions: organicConversions,
        cpa: '$0.00',
        roas: 'N/A',
      },
      {
        channel: 'Direct / Referral',
        sessions: directSessions,
        conversions: directConversions,
        cpa: '$0.00',
        roas: 'N/A',
      },
    ],
    isSandbox: true,
  };
}