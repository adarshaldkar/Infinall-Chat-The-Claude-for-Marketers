// ============================================================
// MCP Adapter: Firecrawl Deep Web Scraper
// Config-driven. Modes: off | sandbox | live (see lib/mcp/config.ts)
// ============================================================

import { getConnectorSettings, assertConnectorReady, ConnectorSettings } from '../config';

export interface FirecrawlScrapeParams {
  url: string;
  formats?: ('markdown' | 'html')[];
  onlyMainContent?: boolean;
}

export interface FirecrawlScrapeResult {
  url: string;
  title: string;
  markdown: string;
  extractedPricing?: Array<{ tier: string; price: string; features: string[] }>;
  metadata: {
    statusCode: number;
    description: string;
    crawledAt: string;
  };
  isSandbox?: boolean;
}

const SETTINGS = (): ConnectorSettings =>
  getConnectorSettings('FIRECRAWL', 'https://api.firecrawl.dev/v1', ['FIRECRAWL_API_KEY']);

export async function executeFirecrawlScrape(params: FirecrawlScrapeParams): Promise<FirecrawlScrapeResult> {
  const settings = SETTINGS();
  assertConnectorReady(settings, 'Firecrawl');

  if (settings.mode === 'sandbox') return sandboxScrape(params.url);

  // Live mode — call the real Firecrawl API
  const res = await fetch(`${settings.endpoint}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY ?? ''}`,
    },
    body: JSON.stringify({
      url: params.url,
      formats: params.formats ?? ['markdown'],
      onlyMainContent: params.onlyMainContent ?? true,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Firecrawl scrape failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { data?: { markdown?: string; metadata?: { title?: string; description?: string } } };
  const markdown = data.data?.markdown ?? '';
  const title = data.data?.metadata?.title ?? params.url;
  const description = data.data?.metadata?.description ?? `Scraped content from ${params.url}`;

  return {
    url: params.url,
    title,
    markdown,
    metadata: {
      statusCode: 200,
      description,
      crawledAt: new Date().toISOString(),
    },
    isSandbox: false,
  };
}

function sandboxScrape(url: string): FirecrawlScrapeResult {
  const lowerUrl = url.toLowerCase();
  
  let domainName = 'Competitor';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostParts = parsed.hostname.replace('www.', '').split('.');
    if (hostParts.length > 0 && hostParts[0]) {
      domainName = hostParts[0].charAt(0).toUpperCase() + hostParts[0].slice(1);
    }
  } catch {
    domainName = 'Competitor';
  }

  let title = `${domainName} Pricing & Product Overview`;
  let markdown = `## ${domainName} Platform Analysis\n\n- **Core Product**: ${domainName} Cloud Software Suite\n- **Target Audience**: B2B Growth, Marketing, and Operations Teams\n- **Deployment**: Multi-tenant SaaS & Enterprise SSO\n\n### Key Highlights\n- Automated pipeline attribution\n- Real-time campaign ROI dashboards\n- Omnichannel integration ecosystem`;
  
  let extractedPricing: FirecrawlScrapeResult['extractedPricing'] = [
    { tier: 'Starter', price: '$29/user/mo', features: ['Core workspace access', 'Basic reporting', 'Standard integrations'] },
    { tier: 'Professional', price: '$89/user/mo', features: ['Custom dashboards', 'Advanced automation', 'Priority API limits'] },
    { tier: 'Enterprise', price: '$199/user/mo', features: ['Dedicated account manager', 'Custom SLA', 'Role-based access controls'] },
  ];

  if (lowerUrl.includes('hubspot')) {
    title = 'HubSpot Pricing & Plans 2026';
    markdown = `## HubSpot Sales Hub Pricing\n\n- **Starter**: $15/seat/month (Basic CRM, email tracking)\n- **Professional**: $90/seat/month (Sequences, custom reporting, e-signatures)\n- **Enterprise**: $150/seat/month (Custom objects, predictive lead scoring, advanced permissions)`;
    extractedPricing = [
      { tier: 'Starter', price: '$15/seat/mo', features: ['Email tracking', 'Simple deal pipeline'] },
      { tier: 'Professional', price: '$90/seat/mo', features: ['Sequences', 'Custom reports', 'Automated workflows'] },
      { tier: 'Enterprise', price: '$150/seat/mo', features: ['Custom objects', 'Predictive scoring', 'Multi-currency'] },
    ];
  } else if (lowerUrl.includes('salesforce')) {
    title = 'Salesforce Sales Cloud Pricing';
    markdown = `## Salesforce Sales Cloud Pricing\n\n- **Starter Suite**: $25/user/month (Simplified setup for small teams)\n- **Professional**: $80/user/month (Complete CRM for any size team)\n- **Enterprise**: $165/user/month (Deeply customizable sales CRM)\n- **Unlimited**: $330/user/month (Built-in AI & premier support)`;
    extractedPricing = [
      { tier: 'Starter Suite', price: '$25/user/mo', features: ['Simplified CRM setup'] },
      { tier: 'Professional', price: '$80/user/mo', features: ['Complete CRM', 'Any size team'] },
      { tier: 'Enterprise', price: '$165/user/mo', features: ['Deeply customizable', 'Advanced analytics'] },
      { tier: 'Unlimited', price: '$330/user/mo', features: ['Built-in AI', 'Premier support'] },
    ];
  }

  return {
    url,
    title,
    markdown,
    extractedPricing,
    metadata: {
      statusCode: 200,
      description: `Structured sandbox analysis for ${domainName} (${url}) — dynamically parsed`,
      crawledAt: new Date().toISOString(),
    },
    isSandbox: true,
  };
}