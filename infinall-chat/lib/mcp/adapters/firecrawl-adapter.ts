// ============================================================
// MCP Adapter: Firecrawl Deep Web Scraper
// Scrapes competitor landing pages into clean Markdown
// ============================================================

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
}

export async function executeFirecrawlScrape(params: FirecrawlScrapeParams): Promise<FirecrawlScrapeResult> {
  const isMock = process.env.MCP_MODE !== 'live';

  if (isMock) {
    const isHubSpot = params.url.toLowerCase().includes('hubspot');
    const isSalesforce = params.url.toLowerCase().includes('salesforce');

    return {
      url: params.url,
      title: isHubSpot ? 'HubSpot Pricing & Plans 2026' : isSalesforce ? 'Salesforce Sales Cloud Pricing' : 'Competitor Product Overview',
      markdown: isHubSpot
        ? `## HubSpot Sales Hub Pricing\n\n- **Starter**: $15/seat/month (Basic CRM, email tracking)\n- **Professional**: $90/seat/month (Sequences, custom reporting, e-signatures)\n- **Enterprise**: $150/seat/month (Custom objects, predictive lead scoring, advanced permissions)`
        : isSalesforce
        ? `## Salesforce Sales Cloud Pricing\n\n- **Starter Suite**: $25/user/month (Simplified setup for small teams)\n- **Professional**: $80/user/month (Complete CRM for any size team)\n- **Enterprise**: $165/user/month (Deeply customizable sales CRM)\n- **Unlimited**: $330/user/month (Built-in AI & premier support)`
        : `## Competitor Feature Matrix\n\n- Core Offering: B2B Marketing Intelligence Platform\n- Pricing: Custom quote based on ad spend volume ($1,500/mo minimum)`,
      extractedPricing: isHubSpot
        ? [
            { tier: 'Starter', price: '$15/seat/mo', features: ['Email tracking', 'Simple deal pipeline'] },
            { tier: 'Professional', price: '$90/seat/mo', features: ['Sequences', 'Custom reports', 'Automated workflows'] },
            { tier: 'Enterprise', price: '$150/seat/mo', features: ['Custom objects', 'Predictive scoring', 'Multi-currency'] },
          ]
        : [
            { tier: 'Starter', price: '$25/user/mo', features: ['Lead & account management', 'Basic analytics'] },
            { tier: 'Professional', price: '$80/user/mo', features: ['Pipeline management', 'Forecast tracking'] },
            { tier: 'Enterprise', price: '$165/user/mo', features: ['Workflow automation', 'Custom apps'] },
          ],
      metadata: {
        statusCode: 200,
        description: 'Scraped competitor landing page',
        crawledAt: new Date().toISOString(),
      },
    };
  }

  const base = process.env.FIRECRAWL_MCP_ENDPOINT ?? 'https://api.infinall.ai/mcp/firecrawl';
  const res = await fetch(`${base}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY ?? ''}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error(`Firecrawl Scrape failed: ${await res.text()}`);
  return res.json();
}
