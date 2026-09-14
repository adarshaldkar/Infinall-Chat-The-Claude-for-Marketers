// ============================================================
// Mutation Diff Builder
// Builds user-friendly operational before/after diffs for write tools
// ============================================================

import { MutationDiff } from '@/lib/gateway/types';

export function buildMutationDiff(toolName: string, args: Record<string, unknown>): { summary: string; diff: MutationDiff } {
  if (toolName === 'meta_ads_mutate') {
    const account = (args.accountId as string) ?? 'act_892374921';
    const campaignName = (args.campaignName as string) ?? 'Q3 SaaS Growth';
    const action = (args.action as string) ?? 'UPDATE_BUDGET';
    const dailyBudget = args.dailyBudget ? `$${args.dailyBudget}/day` : undefined;
    const audience = (args.audienceTargeting as string) ?? undefined;

    let summary = `Meta Ads: ${action} for "${campaignName}"`;
    let budgetChange = dailyBudget ? `Current: $250.00/day ──► Proposed: ${dailyBudget}` : undefined;

    if (action === 'CREATE') {
      summary = `Create new Meta campaign: "${campaignName}"`;
      budgetChange = dailyBudget ? `Initial Budget: ${dailyBudget}` : undefined;
    }

    return {
      summary,
      diff: {
        account,
        campaignName,
        budgetChange,
        audienceTargeting: audience ? `Audience: ${audience}` : undefined,
        dailySpend: dailyBudget,
        rawParams: args,
      },
    };
  }

  if (toolName === 'google_ads_mutate') {
    const campaignId = (args.campaignId as string) ?? 'camp_google_001';
    const keyword = (args.targetKeyword as string) ?? 'b2b crm software';
    const bid = args.bidAmount ? `$${args.bidAmount}` : undefined;
    const action = (args.action as string) ?? 'UPDATE_BID';

    return {
      summary: `Google Ads: ${action} on "${keyword}"`,
      diff: {
        account: campaignId,
        campaignName: `Keyword: ${keyword}`,
        budgetChange: bid ? `Max CPC Bid: ${bid}` : undefined,
        rawParams: args,
      },
    };
  }

  return {
    summary: `Execute mutation: ${toolName}`,
    diff: {
      account: 'default',
      rawParams: args,
    },
  };
}
