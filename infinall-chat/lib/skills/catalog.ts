// ============================================================
// Infinall Chat - Built-in Marketing Skills Catalog
// ============================================================

import { CompleteSkill } from './types';

export const BUILTIN_SKILLS: CompleteSkill[] = [
  {
    slug: '/ad-copy',
    name: 'Direct-Response Ad Copywriter',
    category: 'paid_media',
    description: 'Generates 5-part direct-response ad variations using AIDA, PAS, and Hook-Story-Offer frameworks.',
    triggerKeywords: ['ad copy', 'meta ad', 'facebook ad', 'google ad', 'headline variations', 'hook', 'creative copy'],
    icon: 'Megaphone',
    estimatedTokens: 620,
    suggestedTools: ['meta_ads_read', 'google_ads_read'],
    defaultArtifactType: 'markdown',
    rules: [
      {
        id: 'hook_density',
        name: 'High-Impact First 3 Seconds',
        instruction: 'Every ad variation must begin with a scroll-stopping hook targeting a specific emotional trigger or contrarian belief.',
      },
      {
        id: 'structured_frameworks',
        name: 'Multi-Framework Output',
        instruction: 'Provide variations categorized by Framework: 1. PAS (Problem-Agitate-Solve), 2. AIDA, 3. Social Proof/Case Study, 4. Contrarian Hook.',
      },
    ],
    systemPromptInjection: `### ACTIVE SKILL: DIRECT-RESPONSE AD COPYWRITER
You are operating in specialized Direct-Response Copywriting mode.
- Generate 5 distinct, high-converting ad copy variations tailored to the target audience.
- For each variation, include:
  1. **Primary Text Hook** (First 125 characters optimized for mobile feed truncation)
  2. **Body Story / Value Mechanism** (Agitation, credibility, benefit bullet points)
  3. **Headline** (Punchy <40 char conversion hook)
  4. **Description & CTA Button recommendation** (e.g. Learn More, Get Offer)
- Always deliver the copy in a clean structured markdown artifact.`,
  },
  {
    slug: '/brand-voice',
    name: 'Brand Voice & Messaging Strategist',
    category: 'strategy',
    description: 'Enforces rigorous brand tone guidelines, core value propositions, and positioning pillars.',
    triggerKeywords: ['brand voice', 'tone of voice', 'positioning', 'value prop', 'messaging pillars', 'tagline'],
    icon: 'Sparkles',
    estimatedTokens: 480,
    suggestedTools: ['web_search'],
    defaultArtifactType: 'docx',
    rules: [
      {
        id: 'tone_dimensions',
        name: 'Tone Spectrum Definition',
        instruction: 'Define the brand across 4 spectrums: Formal vs Casual, Technical vs Accessible, Assertive vs Empathetic, Serious vs Playful.',
      },
    ],
    systemPromptInjection: `### ACTIVE SKILL: BRAND VOICE & POSITIONING STRATEGIST
You are operating as a Senior VP of Brand Marketing.
- Analyze and define messaging across three core pillars:
  1. **Core Value Proposition**: The single undeniable outcome provided to customers.
  2. **Do / Do-Not Vocabulary**: Words to embrace vs words to strictly avoid (jargon bans).
  3. **Competitor Differentiation Matrix**: Clear contrast showing why the brand is the only choice.`,
  },
  {
    slug: '/seo-audit',
    name: 'SEO Content & SERP Strategist',
    category: 'seo_content',
    description: 'Maps organic search intent, clusters high-value keywords, and creates technical content briefs.',
    triggerKeywords: ['seo', 'serp', 'keyword research', 'search intent', 'content brief', 'meta tags', 'ranking'],
    icon: 'Search',
    estimatedTokens: 580,
    suggestedTools: ['web_search', 'firecrawl_scrape'],
    defaultArtifactType: 'markdown',
    rules: [
      {
        id: 'search_intent_mapping',
        name: 'Intent Classification',
        instruction: 'Categorize all keywords into Informational, Commercial Investigation, or Transactional intent.',
      },
    ],
    systemPromptInjection: `### ACTIVE SKILL: SEO CONTENT & SERP STRATEGIST
You are operating as an Enterprise SEO Director.
- Structure recommendations with:
  1. **Primary Keyword & Secondary LSI Clusters** (Search volume & intent)
  2. **SERP Competitor Gap Analysis** (What ranking pages miss)
  3. **H1/H2/H3 Outline Architecture** with optimal word count targets
  4. **Optimized Meta Title (<60 chars) & Meta Description (<155 chars)**`,
  },
  {
    slug: '/gtm-planner',
    name: 'GTM Launch Architect',
    category: 'strategy',
    description: 'Builds comprehensive 90-day Go-To-Market launch roadmaps, channel budget splits, and KPI models.',
    triggerKeywords: ['gtm', 'go to market', 'launch plan', 'product launch', 'marketing roadmap', 'budget allocation'],
    icon: 'Target',
    estimatedTokens: 750,
    suggestedTools: ['ga4_metrics', 'meta_ads_read', 'google_ads_read'],
    defaultArtifactType: 'xlsx',
    rules: [
      {
        id: 'timeline_phasing',
        name: '3-Phase Launch Timing',
        instruction: 'Structure launch across Phase 1 (Pre-launch Foundation), Phase 2 (Hard Launch Momentum), Phase 3 (Scale & Optimization).',
      },
    ],
    systemPromptInjection: `### ACTIVE SKILL: GTM LAUNCH ARCHITECT
You are operating as a Chief Growth Officer building a Go-To-Market strategy.
- Deliver an executive GTM blueprint including:
  1. **Ideal Customer Profile (ICP) & Persona Matrix**
  2. **Channel Mix & Budget Allocation by Percentage**
  3. **90-Day Sequential Timeline & Milestone Goals**
  4. **Target KPI Scorecard (CAC, Payback Period, Blended ROAS, MQLs)**`,
  },
  {
    slug: '/email-sequence',
    name: 'Lifecycle Email Strategist',
    category: 'crm_retention',
    description: 'Designs 7-day onboarding, nurture, and win-back email drip campaigns with subject line A/B tests.',
    triggerKeywords: ['email sequence', 'drip campaign', 'onboarding email', 'klaviyo', 'newsletter', 'nurture flow'],
    icon: 'Mail',
    estimatedTokens: 520,
    suggestedTools: [],
    defaultArtifactType: 'docx',
    rules: [
      {
        id: 'subject_line_variants',
        name: 'A/B Test Subject Lines',
        instruction: 'Provide two distinct subject lines per email: Variant A (Curiosity/Short) and Variant B (Benefit/Action).',
      },
    ],
    systemPromptInjection: `### ACTIVE SKILL: LIFECYCLE EMAIL STRATEGIST
You are operating as a Retention Marketing Director.
- Create automated email lifecycle flows with:
  1. **Trigger Condition & Delay Cadence** (e.g. Immediately on Signup, +24h, +48h)
  2. **Dual Subject Line A/B Test Variations & Preview Text**
  3. **Single Focused Call-to-Action (CTA)** per email with high-contrast button copy`,
  },
  {
    slug: '/cro-teardown',
    name: 'Landing Page CRO Teardown',
    category: 'cro_conversion',
    description: 'Evaluates landing pages for conversion rate optimization, friction points, and CTA hierarchy.',
    triggerKeywords: ['cro', 'conversion rate', 'landing page teardown', 'above the fold', 'hero section', 'friction'],
    icon: 'Zap',
    estimatedTokens: 640,
    suggestedTools: ['firecrawl_scrape', 'web_search'],
    defaultArtifactType: 'html',
    rules: [
      {
        id: 'above_the_fold_rubric',
        name: '5-Second Test Rubric',
        instruction: 'Assess whether a visitor understands what is offered, who it is for, and how to get it in under 5 seconds.',
      },
    ],
    systemPromptInjection: `### ACTIVE SKILL: LANDING PAGE CRO TEARDOWN
You are operating as a Conversion Rate Optimization Lead.
- Conduct a rigorous conversion audit:
  1. **Above-the-Fold Assessment** (Headline clarity, visual eye path, primary CTA)
  2. **Friction & Anxiety Analysis** (Form fields, risk reversal, page speed factors)
  3. **Social Proof & Trust Architecture** (Customer logos, verified metric badges)
  4. **Concrete Wireframe / Component Redesign Suggestions**`,
  },
];
