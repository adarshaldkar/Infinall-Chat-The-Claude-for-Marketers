// ============================================================
// Infinall Chat - Universal Tool Executor Router
// Routes 100+ marketing tools to real API executors, MCP adapters,
// or sandbox domain engines. Never returns fake success on unknown tools.
// ============================================================

import { executeMetaAdsTool } from './executors/meta-ads';
import { executeGoogleAdsTool } from './executors/google-ads';
import { executeGA4Tool } from './executors/ga4';
import { executeHubSpotTool } from './executors/hubspot';
import { executeSlackTool } from './executors/slack';
import { executeNotionTool } from './executors/notion';
import { executeWebSearch } from './web-search';
import { executeFirecrawlScrape } from '@/lib/mcp/adapters/firecrawl-adapter';
import { CategoryExecutors } from './executors/category-executors';
import { SourceCitation } from '@/lib/gateway/types';

export interface ToolExecutionResult {
  success: boolean;
  result: unknown;
  isMutation: boolean;
  isMock?: boolean;
  mode?: 'live' | 'sandbox';
  provider?: string;
  warnings?: string[];
  sources?: SourceCitation[];
}

export async function routeAndExecuteTool(
  toolName: string,
  args: Record<string, unknown>,
  accessToken?: string
): Promise<ToolExecutionResult> {
  const isMutation =
    toolName.includes('mutate') ||
    toolName.includes('update') ||
    toolName.includes('create') ||
    toolName.includes('delete') ||
    toolName.includes('pause') ||
    toolName.includes('post');

  // 1. Web Search & Scraping Builtins
  if (toolName === 'web_search') {
    try {
      const searchRes = await executeWebSearch(args as Parameters<typeof executeWebSearch>[0]);
      const sources: SourceCitation[] = searchRes.flatMap((r, i) =>
        r.sources.map((s) => ({ ...s, id: i * 10 + s.id }))
      );
      const summary = searchRes.map((r) => `Query: "${r.query}"\n${r.summary}`).join('\n\n');
      return { success: true, result: summary, isMutation: false, sources };
    } catch (err) {
      return {
        success: false,
        result: { error: err instanceof Error ? err.message : 'Web search failed' },
        isMutation: false,
      };
    }
  }

  if (toolName === 'firecrawl_scrape') {
    try {
      const scrapeRes = await executeFirecrawlScrape(args as unknown as Parameters<typeof executeFirecrawlScrape>[0]);
      const sources: SourceCitation[] = [
        {
          id: 1,
          title: scrapeRes.title,
          url: scrapeRes.url,
          domain: new URL(scrapeRes.url).hostname,
          snippet: scrapeRes.markdown.slice(0, 300),
        },
      ];
      return { success: true, result: scrapeRes.markdown, isMutation: false, sources };
    } catch (err) {
      return {
        success: false,
        result: { error: err instanceof Error ? err.message : 'Firecrawl scrape failed' },
        isMutation: false,
      };
    }
  }

  // 2. Direct Vendor Adapters (Meta, Google Ads, GA4, HubSpot, Slack, Notion)
  if (toolName.startsWith('meta_') || toolName === 'meta_ads_read' || toolName === 'meta_ads_mutate') {
    const res = await executeMetaAdsTool(toolName, args, accessToken);
    return { success: res.success, result: res.data, isMutation };
  }

  if (toolName.startsWith('google_ads_') || toolName === 'google_ads_mutate') {
    const res = await executeGoogleAdsTool(toolName, args, accessToken);
    return { success: res.success, result: res.data, isMutation };
  }

  if (toolName.startsWith('ga4_') || toolName === 'ga4_metrics') {
    const res = await executeGA4Tool(toolName, args, accessToken);
    return { success: res.success, result: res.data, isMutation };
  }

  if (toolName.startsWith('hubspot_')) {
    const res = await executeHubSpotTool(toolName, args, accessToken);
    return { success: res.success, result: res.data, isMutation };
  }

  if (toolName.startsWith('slack_')) {
    const res = await executeSlackTool(toolName, args, accessToken);
    return { success: res.success, result: res.data, isMutation };
  }

  if (toolName.startsWith('notion_')) {
    const res = await executeNotionTool(toolName, args, accessToken);
    return { success: res.success, result: res.data, isMutation };
  }

  // 3. Search & SEO (Ahrefs, Semrush, Moz, SerpAPI, ScreamingFrog, SpyFu)
  if (
    toolName.startsWith('ahrefs_') ||
    toolName.startsWith('semrush_') ||
    toolName.startsWith('moz_') ||
    toolName.startsWith('serpapi_') ||
    toolName.startsWith('screaming_frog_') ||
    toolName.startsWith('spyfu_') ||
    toolName.includes('seo') ||
    toolName.includes('keyword') ||
    toolName.includes('backlink')
  ) {
    const res = await CategoryExecutors.executeSeo(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 4. Paid Media & Ad Networks (LinkedIn, TikTok, Twitter, Pinterest)
  if (
    toolName.startsWith('tiktok_') ||
    toolName.startsWith('linkedin_') ||
    toolName.startsWith('pinterest_') ||
    toolName.startsWith('twitter_') ||
    toolName.includes('ad_network')
  ) {
    const res = await CategoryExecutors.executePaidMedia(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 5. Analytics & Attribution (Mixpanel, PostHog, Amplitude, Heap)
  if (
    toolName.startsWith('mixpanel_') ||
    toolName.startsWith('posthog_') ||
    toolName.startsWith('amplitude_') ||
    toolName.startsWith('heap_') ||
    toolName.includes('attribution')
  ) {
    const res = await CategoryExecutors.executeAnalytics(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 6. CRM & Lifecycle (Salesforce, Klaviyo, ActiveCampaign, Customer.io)
  if (
    toolName.startsWith('salesforce_') ||
    toolName.startsWith('klaviyo_') ||
    toolName.startsWith('activecampaign_') ||
    toolName.startsWith('customerio_') ||
    toolName.includes('lead')
  ) {
    const res = await CategoryExecutors.executeCrm(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 7. Content & Social (WordPress, Ghost, Buffer, Hootsuite, Sprout)
  if (
    toolName.startsWith('wordpress_') ||
    toolName.startsWith('ghost_') ||
    toolName.startsWith('buffer_') ||
    toolName.startsWith('hootsuite_') ||
    toolName.startsWith('sprout_') ||
    toolName.includes('social')
  ) {
    const res = await CategoryExecutors.executeSocial(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 8. Email & SMS (Sendgrid, Mailchimp, Twilio, Resend)
  if (
    toolName.startsWith('sendgrid_') ||
    toolName.startsWith('mailchimp_') ||
    toolName.startsWith('twilio_') ||
    toolName.startsWith('resend_') ||
    toolName.includes('email') ||
    toolName.includes('sms')
  ) {
    const res = await CategoryExecutors.executeEmailSms(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 9. Creative & Assets (Figma, Canva, Cloudinary, Midjourney)
  if (
    toolName.startsWith('figma_') ||
    toolName.startsWith('canva_') ||
    toolName.startsWith('cloudinary_') ||
    toolName.startsWith('midjourney_') ||
    toolName.includes('creative') ||
    toolName.includes('image_gen')
  ) {
    const res = await CategoryExecutors.executeCreative(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 10. Collaboration & Workflow (Asana, Monday, Linear, Trello)
  if (
    toolName.startsWith('asana_') ||
    toolName.startsWith('monday_') ||
    toolName.startsWith('linear_') ||
    toolName.startsWith('trello_') ||
    toolName.includes('workflow')
  ) {
    const res = await CategoryExecutors.executeCollaboration(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 11. CRO & Testing (Optimizely, VWO, Hotjar, CrazyEgg)
  if (
    toolName.startsWith('optimizely_') ||
    toolName.startsWith('vwo_') ||
    toolName.startsWith('hotjar_') ||
    toolName.startsWith('crazyegg_') ||
    toolName.includes('cro') ||
    toolName.includes('ab_test')
  ) {
    const res = await CategoryExecutors.executeCro(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 12. E-commerce & Retail (Shopify, Amazon Ads, WooCommerce, BigCommerce)
  if (
    toolName.startsWith('shopify_') ||
    toolName.startsWith('amazon_ads_') ||
    toolName.startsWith('woocommerce_') ||
    toolName.startsWith('bigcommerce_') ||
    toolName.includes('store') ||
    toolName.includes('product_feed')
  ) {
    const res = await CategoryExecutors.executeEcommerce(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 13. Influencer & Affiliate (Impact, Grin, AspireIQ, Upfluence)
  if (
    toolName.startsWith('impact_') ||
    toolName.startsWith('grin_') ||
    toolName.startsWith('aspire_') ||
    toolName.startsWith('upfluence_') ||
    toolName.includes('affiliate') ||
    toolName.includes('creator')
  ) {
    const res = await CategoryExecutors.executeInfluencer(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 14. Market Intelligence (BuiltWith, Clearbit, SimilarWeb, ZoomInfo)
  if (
    toolName.startsWith('builtwith_') ||
    toolName.startsWith('clearbit_') ||
    toolName.startsWith('similarweb_') ||
    toolName.startsWith('zoominfo_') ||
    toolName.includes('technographic')
  ) {
    const res = await CategoryExecutors.executeMarketIntel(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 15. Customer Support & Feedback (Zendesk, Intercom, Typeform, SurveyMonkey)
  if (
    toolName.startsWith('zendesk_') ||
    toolName.startsWith('intercom_') ||
    toolName.startsWith('typeform_') ||
    toolName.startsWith('surveymonkey_') ||
    toolName.includes('feedback') ||
    toolName.includes('csat')
  ) {
    const res = await CategoryExecutors.executeSupport(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // 16. Cloud Storage & Data Warehouse (Drive, Dropbox, Snowflake, BigQuery)
  if (
    toolName.startsWith('drive_') ||
    toolName.startsWith('dropbox_') ||
    toolName.startsWith('snowflake_') ||
    toolName.startsWith('bigquery_') ||
    toolName.includes('warehouse') ||
    toolName.includes('sql_query')
  ) {
    const res = await CategoryExecutors.executeDataWarehouse(toolName, args);
    return { success: res.success, result: res.data, isMutation, isMock: res.isMock, mode: res.mode, provider: res.provider, warnings: res.warnings };
  }

  // STRICT HONEST FAILURE: Unknown tools return an explicit error, NEVER synthetic success
  return {
    success: false,
    result: {
      error: `Tool "${toolName}" is not implemented or not recognized in the active MCP/Tool registry.`,
      code: 'TOOL_NOT_IMPLEMENTED',
    },
    isMutation,
  };
}
