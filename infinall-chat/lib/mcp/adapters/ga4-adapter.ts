// ============================================================
// MCP Adapter: Google Analytics 4 (GA4) Live API Connector
// Connects to Google Analytics Data API v1beta (runReport / realtime)
// ============================================================

import { getConnectorSettings, assertConnectorReady, ConnectorSettings } from '../config';
import { connectionManager } from '../connection-manager';

export interface GA4MetricsQuery {
  propertyId?: string;
  startDate?: string;
  endDate?: string;
  dimensions?: string[];
  metrics?: string[];
  userId?: string;
}

export interface GA4MetricsResult {
  dateRange: string;
  propertyId: string;
  summary: {
    sessions: number;
    activeUsers: number;
    conversions: number;
    conversionRate: string;
    cpa: string;
    totalRevenue: string;
    bounceRate?: string;
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
  getConnectorSettings('GA4', 'https://analyticsdata.googleapis.com', ['GA4_API_KEY', 'GA4_ACCESS_TOKEN', 'GA4_SERVICE_ACCOUNT']);

export async function executeGA4Metrics(query: GA4MetricsQuery): Promise<GA4MetricsResult> {
  const settings = SETTINGS();
  assertConnectorReady(settings, 'GA4');

  const startDate = query.startDate ?? '30daysAgo';
  const endDate = query.endDate ?? 'today';
  const propertyId = query.propertyId || process.env.GA4_PROPERTY_ID || 'properties/default';

  if (settings.mode === 'sandbox') {
    return sandboxPayload(startDate, endDate, propertyId);
  }

  // Live Mode: Resolve decrypted token from ConnectionManager or process.env
  const token = await connectionManager.getAccessToken('GA4', query.userId);
  if (!token) {
    throw new Error('GA4 Live execution failed: No active access token found in Vault or environment variables.');
  }

  // Call official Google Analytics Data API v1beta
  const cleanPropertyId = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;
  const endpoint = `https://analyticsdata.googleapis.com/v1beta/${cleanPropertyId}:runReport`;

  const requestBody = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'conversions' },
      { name: 'totalRevenue' },
      { name: 'bounceRate' },
    ],
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Google Analytics API Error (${res.status}): ${errorText}`);
  }

  const rawData = await res.json();
  return parseGA4ReportResponse(rawData, startDate, endDate, propertyId);
}

interface GA4Row {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

interface GA4ReportPayload {
  rows?: GA4Row[];
}

function parseGA4ReportResponse(
  data: GA4ReportPayload,
  startDate: string,
  endDate: string,
  propertyId: string
): GA4MetricsResult {
  let totalSessions = 0;
  let totalActiveUsers = 0;
  let totalConversions = 0;
  let totalRevenue = 0;
  let weightedBounceSum = 0;

  const channelBreakdown: GA4MetricsResult['channelBreakdown'] = [];

  if (data && Array.isArray(data.rows)) {
    for (const row of data.rows) {
      const channel = row.dimensionValues?.[0]?.value || 'Unassigned';
      const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
      const activeUsers = parseInt(row.metricValues?.[1]?.value || '0', 10);
      const conversions = parseInt(row.metricValues?.[2]?.value || '0', 10);
      const revenue = parseFloat(row.metricValues?.[3]?.value || '0');
      const bounceRate = parseFloat(row.metricValues?.[4]?.value || '0');

      totalSessions += sessions;
      totalActiveUsers += activeUsers;
      totalConversions += conversions;
      totalRevenue += revenue;
      weightedBounceSum += bounceRate * sessions;

      channelBreakdown.push({
        channel,
        sessions,
        conversions,
        cpa: conversions > 0 ? `$${((sessions * 2.5) / conversions).toFixed(2)}` : '$0.00',
        roas: revenue > 0 ? `${(revenue / Math.max(1, sessions * 2.5)).toFixed(2)}x` : '0.00x',
      });
    }
  }

  const avgBounceRate = totalSessions > 0 ? `${((weightedBounceSum / totalSessions) * 100).toFixed(1)}%` : '0.0%';
  const convRate = totalSessions > 0 ? `${((totalConversions / totalSessions) * 100).toFixed(2)}%` : '0.00%';

  return {
    dateRange: `${startDate} to ${endDate}`,
    propertyId,
    summary: {
      sessions: totalSessions,
      activeUsers: totalActiveUsers,
      conversions: totalConversions,
      conversionRate: convRate,
      cpa: totalConversions > 0 ? `$${((totalSessions * 2.5) / totalConversions).toFixed(2)}` : '$0.00',
      totalRevenue: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      bounceRate: avgBounceRate,
    },
    channelBreakdown,
    isSandbox: false,
  };
}

function sandboxPayload(startDate: string, endDate: string, propertyId: string): GA4MetricsResult {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const validStart = !isNaN(start.getTime()) ? start : new Date('2026-08-01');
  const validEnd = !isNaN(end.getTime()) ? end : new Date('2026-08-31');

  const diffDays = Math.max(1, Math.round(Math.abs(validEnd.getTime() - validStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const dateSeed = (validStart.getDate() * 31 + validEnd.getDate() * 7 + diffDays * 13) % 100;

  const dailySessions = 1450 + dateSeed * 5;
  const totalSessions = Math.round(diffDays * dailySessions);
  const activeUsers = Math.round(totalSessions * (0.7 + (dateSeed % 5) * 0.01));
  const conversionRateNum = 2.45 + (dateSeed % 8) * 0.05;
  const conversions = Math.round(totalSessions * (conversionRateNum / 100));
  const avgOrderVal = 115 + (dateSeed % 25);
  const totalRevenueNum = Math.round(conversions * avgOrderVal);
  const baseCpa = 38.5 + (dateSeed % 9);

  return {
    dateRange: `${startDate} to ${endDate} (${diffDays} days)`,
    propertyId,
    summary: {
      sessions: totalSessions,
      activeUsers,
      conversions,
      conversionRate: `${conversionRateNum.toFixed(2)}%`,
      cpa: `$${baseCpa.toFixed(2)}`,
      totalRevenue: `$${totalRevenueNum.toLocaleString()}`,
      bounceRate: '42.3%',
    },
    channelBreakdown: [
      {
        channel: 'Paid Search',
        sessions: Math.round(totalSessions * 0.382),
        conversions: Math.round(conversions * 0.453),
        cpa: `$${(baseCpa * 0.88).toFixed(2)}`,
        roas: '3.42x',
      },
      {
        channel: 'Paid Social',
        sessions: Math.round(totalSessions * 0.294),
        conversions: Math.round(conversions * 0.305),
        cpa: `$${(baseCpa * 1.15).toFixed(2)}`,
        roas: '2.85x',
      },
      {
        channel: 'Organic Search',
        sessions: Math.round(totalSessions * 0.231),
        conversions: Math.round(conversions * 0.187),
        cpa: '$0.00',
        roas: 'N/A',
      },
    ],
    isSandbox: true,
  };
}