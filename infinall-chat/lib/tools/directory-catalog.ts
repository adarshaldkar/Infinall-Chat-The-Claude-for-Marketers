// ============================================================
// Infinall Chat - 100+ Marketing Tools Directory Catalog
// ============================================================

export type ToolCategory =
  | 'all'
  | 'paid_media'
  | 'analytics'
  | 'seo_scraping'
  | 'crm_retention'
  | 'automation';

export interface ToolDirectoryItem {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  icon: string;
  status: 'active' | 'mock' | 'requires_auth';
  latencyMs: number;
  tags: string[];
  mcpServer?: string;
  sampleQuery?: string;
}

export const DIRECTORY_TOOLS: ToolDirectoryItem[] = [
  // --- Paid Acquisition ---
  {
    id: 'meta_ads_manager',
    name: 'Meta Ads Manager API',
    category: 'paid_media',
    description: 'Create, read, and mutate Facebook & Instagram ad campaigns, ad sets, and creative budgets.',
    icon: 'Megaphone',
    status: 'active',
    latencyMs: 145,
    tags: ['Facebook', 'Instagram', 'Advantage+', 'CPA'],
    mcpServer: 'meta-ads-mcp',
    sampleQuery: 'Get ROAS and spend breakdown for active campaigns',
  },
  {
    id: 'google_ads_api',
    name: 'Google Ads API',
    category: 'paid_media',
    description: 'Access Search, Performance Max, Display, and YouTube ad campaign telemetry and keywords.',
    icon: 'Target',
    status: 'active',
    latencyMs: 160,
    tags: ['Google Search', 'PMax', 'YouTube Ads', 'Keywords'],
    mcpServer: 'google-ads-mcp',
    sampleQuery: 'Fetch top converting search terms with CPC < $5.00',
  },
  {
    id: 'tiktok_ads_business',
    name: 'TikTok Ads for Business',
    category: 'paid_media',
    description: 'Manage Spark Ads, Video Shopping Ads, and TikTok Creator Marketplace campaigns.',
    icon: 'Video',
    status: 'mock',
    latencyMs: 180,
    tags: ['TikTok', 'Spark Ads', 'Short-form Video', 'Gen Z'],
    mcpServer: 'tiktok-ads-mcp',
    sampleQuery: 'Analyze top creative hook drop-off curves',
  },
  {
    id: 'linkedin_campaign_manager',
    name: 'LinkedIn Campaign Manager',
    category: 'paid_media',
    description: 'Target B2B accounts, job titles, and company sizes with Sponsored Content and InMail.',
    icon: 'Briefcase',
    status: 'mock',
    latencyMs: 210,
    tags: ['B2B', 'Account Based Marketing', 'Job Titles', 'Lead Gen'],
    mcpServer: 'linkedin-mcp',
    sampleQuery: 'Pull C-Suite engagement by company size tier',
  },
  {
    id: 'amazon_ads_dsp',
    name: 'Amazon Advertising & DSP',
    category: 'paid_media',
    description: 'Sponsored Products, Sponsored Brands, and programmatic DSP retail media targeting.',
    icon: 'ShoppingBag',
    status: 'mock',
    latencyMs: 230,
    tags: ['E-commerce', 'Sponsored Products', 'Retail Media', 'ACOS'],
    mcpServer: 'amazon-ads-mcp',
  },

  // --- Analytics & Attribution ---
  {
    id: 'google_analytics_4',
    name: 'Google Analytics 4 (GA4)',
    category: 'analytics',
    description: 'Real-time event tracking, multi-channel attribution paths, conversion rates, and bounce metrics.',
    icon: 'BarChart2',
    status: 'active',
    latencyMs: 120,
    tags: ['GA4', 'Sessions', 'Attribution', 'Events', 'Conversion Rate'],
    mcpServer: 'ga4-mcp',
    sampleQuery: 'Pull organic search vs paid social assisted conversions',
  },
  {
    id: 'mixpanel_product_analytics',
    name: 'Mixpanel Product Analytics',
    category: 'analytics',
    description: 'Product event telemetry, cohort retention analysis, and user funnel drop-offs.',
    icon: 'Activity',
    status: 'mock',
    latencyMs: 135,
    tags: ['Funnels', 'Cohorts', 'Product Growth', 'Retention'],
    mcpServer: 'mixpanel-mcp',
  },
  {
    id: 'amplitude_analytics',
    name: 'Amplitude Behavioral Analytics',
    category: 'analytics',
    description: 'Behavioral cohorting, customer journey mapping, and milestone conversion metrics.',
    icon: 'Compass',
    status: 'mock',
    latencyMs: 140,
    tags: ['Journeys', 'Behavioral Cohorts', 'Milestones'],
    mcpServer: 'amplitude-mcp',
  },
  {
    id: 'segment_cdp',
    name: 'Twilio Segment CDP',
    category: 'analytics',
    description: 'Customer data platform identity resolution and real-time event pipeline routing.',
    icon: 'Share2',
    status: 'mock',
    latencyMs: 110,
    tags: ['CDP', 'Identity Resolution', 'Pipelines'],
    mcpServer: 'segment-mcp',
  },
  {
    id: 'posthog_os',
    name: 'PostHog Analytics Suite',
    category: 'analytics',
    description: 'Session replay, feature flags, A/B experimentation, and custom product telemetry.',
    icon: 'Cpu',
    status: 'mock',
    latencyMs: 125,
    tags: ['Session Replay', 'Feature Flags', 'A/B Tests'],
    mcpServer: 'posthog-mcp',
  },

  // --- SEO & Scraping ---
  {
    id: 'firecrawl_web_crawler',
    name: 'Firecrawl LLM Scraper',
    category: 'seo_scraping',
    description: 'Extract clean markdown, structured tables, and pricing from dynamic JavaScript websites.',
    icon: 'Flame',
    status: 'active',
    latencyMs: 250,
    tags: ['Web Scraping', 'Markdown Extraction', 'Competitor Research'],
    mcpServer: 'firecrawl-mcp',
    sampleQuery: 'Scrape competitor pricing page into clean markdown table',
  },
  {
    id: 'google_search_console',
    name: 'Google Search Console API',
    category: 'seo_scraping',
    description: 'Query rankings, organic impressions, click-through rates, and index coverage errors.',
    icon: 'Search',
    status: 'mock',
    latencyMs: 175,
    tags: ['Rankings', 'Organic CTR', 'Impressions', 'Indexation'],
    mcpServer: 'gsc-mcp',
  },
  {
    id: 'semrush_domain_analytics',
    name: 'SEMrush Keyword & Domain Intelligence',
    category: 'seo_scraping',
    description: 'Organic competitor keyword gap analysis, backlink authority, and search volume databases.',
    icon: 'Layers',
    status: 'mock',
    latencyMs: 220,
    tags: ['Keyword Gap', 'Backlinks', 'Search Volume', 'Domain Authority'],
    mcpServer: 'semrush-mcp',
  },
  {
    id: 'ahrefs_site_explorer',
    name: 'Ahrefs SEO & Content Explorer',
    category: 'seo_scraping',
    description: 'Backlink profiles, referring domains, organic keyword distribution, and content gap teardowns.',
    icon: 'Globe',
    status: 'mock',
    latencyMs: 215,
    tags: ['Backlinks', 'Content Gap', 'Referring Domains'],
    mcpServer: 'ahrefs-mcp',
  },

  // --- CRM & Marketing Automation ---
  {
    id: 'hubspot_crm_api',
    name: 'HubSpot Marketing Hub',
    category: 'crm_retention',
    description: 'Contact lists, lead scoring workflows, email campaigns, and CRM deal pipeline telemetry.',
    icon: 'Users',
    status: 'active',
    latencyMs: 155,
    tags: ['HubSpot', 'Workflows', 'MQLs', 'Deal Pipelines', 'Forms'],
    mcpServer: 'hubspot-mcp',
    sampleQuery: 'Fetch all deals in negotiation stage with expected close this month',
  },
  {
    id: 'salesforce_marketing_cloud',
    name: 'Salesforce Marketing Cloud & CRM',
    category: 'crm_retention',
    description: 'Enterprise omnichannel customer journeys, lead routing, and opportunity attribution.',
    icon: 'Cloud',
    status: 'mock',
    latencyMs: 240,
    tags: ['Salesforce', 'Enterprise CRM', 'Lead Routing', 'Opportunity Attribution'],
    mcpServer: 'salesforce-mcp',
  },
  {
    id: 'klaviyo_ecommerce_crm',
    name: 'Klaviyo Email & SMS',
    category: 'crm_retention',
    description: 'E-commerce lifecycle flows, abandoned cart triggers, and predictive customer LTV.',
    icon: 'Mail',
    status: 'mock',
    latencyMs: 140,
    tags: ['E-commerce', 'Klaviyo', 'Abandoned Cart', 'SMS Marketing'],
    mcpServer: 'klaviyo-mcp',
  },
  {
    id: 'customerio_journeys',
    name: 'Customer.io Automated Journeys',
    category: 'crm_retention',
    description: 'Event-triggered messaging pipelines, in-app messages, push notifications, and webhooks.',
    icon: 'Send',
    status: 'mock',
    latencyMs: 130,
    tags: ['Event-Driven', 'In-App Messages', 'Push Notifications'],
    mcpServer: 'customerio-mcp',
  },

  // --- Automation & Developer Tools ---
  {
    id: 'zapier_webhook_actions',
    name: 'Zapier App Integrations',
    category: 'automation',
    description: 'Connect with 6,000+ business applications via automated triggers and webhook actions.',
    icon: 'Zap',
    status: 'active',
    latencyMs: 190,
    tags: ['Webhooks', '6000+ Apps', 'Multi-step Zaps'],
    mcpServer: 'zapier-mcp',
  },
  {
    id: 'slack_growth_bot',
    name: 'Slack Marketing Notifications',
    category: 'automation',
    description: 'Broadcast daily KPI digests, ad spend alerts, and lead notifications directly to Slack channels.',
    icon: 'MessageSquare',
    status: 'active',
    latencyMs: 105,
    tags: ['Slack', 'Alerts', 'Daily Digests', 'Team Sync'],
    mcpServer: 'slack-mcp',
  },
];
