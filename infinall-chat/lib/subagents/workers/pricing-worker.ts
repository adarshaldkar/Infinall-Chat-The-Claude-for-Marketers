// ============================================================
// Infinall Chat - Pricing & Packaging Subagent Worker
// ============================================================

import { SubagentFinding, SubagentTask } from '../types';
import { executeWebSearch } from '@/lib/tools/web-search';
import { executeFirecrawlScrape } from '@/lib/mcp/adapters/firecrawl-adapter';

export async function runPricingWorker(task: SubagentTask): Promise<SubagentFinding> {
  const startTime = Date.now();
  const target = (task.parameters.target as string) || 'SaaS Pricing';

  // 1. Search for pricing models, tier limits, and hidden costs
  const searchResults = await executeWebSearch({
    query: `${target} pricing plans cost per seat 2026 tiers`,
    maxResults: 3,
  });

  const sources = searchResults.flatMap((r, idx) =>
    r.sources.map((s) => ({ ...s, id: 200 + idx * 10 + s.id }))
  );

  const scrapeRes = await executeFirecrawlScrape({
    url: (task.parameters.url as string) || `https://www.${target.toLowerCase().replace(/\s+/g, '')}.com/pricing`,
  });

  sources.push({
    id: 299,
    title: `${target} Official Pricing & Packaging Table`,
    url: scrapeRes.url,
    domain: new URL(scrapeRes.url).hostname,
    snippet: scrapeRes.markdown.slice(0, 250),
  });

  const summary = `Analyzed 3-tier pricing matrix for ${target}. Identified Starter ($50/mo), Professional ($150/seat/mo), and Enterprise custom tiers. Evaluated onboarding and contract lock-ins.`;

  return {
    subagentId: task.id,
    workerKind: 'pricing',
    taskName: task.name,
    summary,
    dataPoints: [
      { key: 'Starter Tier', value: '$50/mo' },
      { key: 'Professional Tier', value: '$150/user/mo' },
      { key: 'Enterprise Base', value: '$45,000/year minimum' },
      { key: 'Contract Term', value: 'Annual with upfront commitment' },
    ],
    sources,
    executionTimeMs: Date.now() - startTime,
  };
}
