# Phase 4: Progressive Skills, Subagent Research Orchestrator & Multimodal Engine Specification

**Project**: Infinall Chat — The Claude for Marketers  
**Phase**: Phase 4 — Progressive Skills, Multi-Agent Research Orchestrator, Tools Directory & Multimodal Ingestion  
**Target Root**: `c:\Users\shrut\Desktop\Infianl.ai_2`  
**API Gateway**: `https://llm.ganeshnayak.in/`

---

## 1. Executive Summary & Objective

Phase 1 established Claude-parity visual ergonomics, streaming chat, and collapsible split panes. Phase 2 delivered the autonomous multi-turn agent loop, Model Context Protocol (MCP) data connectivity, deferred tool discovery, and cryptographic mutation safety. Phase 3 delivered the universal multi-format artifact engine (HTML/React apps, WYSIWYG documents, native DOCX/XLSX/PPTX/PDF generation, and version diffing).

**Phase 4** elevates **Infinall Chat** into an **Autonomous Multi-Agent Marketing Team**:
1. **3-Level Progressive Disclosure Skills Architecture**: Slash commands (`/skill`, `/research`, `/goal`, `/schedule`, `/grill-me`, `/learn`), automatic fuzzy intent matching, and deferred skill rule injection to prevent system prompt context bloat.
2. **Deep Research Mode & Isolated Subagent Orchestrator**: Multi-agent research pipeline spawning parallel worker subagents (Competitor Intelligence, Pricing Analysis, SEO & SERP Trends, Ad Creative Benchmarks) with real-time streaming progress trees.
3. **Enterprise 100+ Tools Directory Modal**: Comprehensive visual directory with category filtering (Paid Media, SEO, Analytics, CRM, Scraping), live health pings, latency monitors, and interactive query builders.
4. **Multimodal Ingestion & Creative Vision Studio**: Drag-and-drop asset analysis for ad creatives, landing page screenshots, PDF strategy decks, and audio sales recordings with OCR and visual hook analysis.
5. **Deterministic Benchmark & Regression Suite**: 12 deterministic criteria validating skill discovery, subagent concurrency, error isolation, multimodal parsing, and tools directory search.

---

## 2. Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       User Composer & Input Multi-Modal Hub                     │
│  - Text Prompt + Slash Command (/research, /ad-copy) + Creative Image / PDF     │
└──────────────┬──────────────────────────────────────────────────▲───────────────┘
               │ 1. Multipart Request / Chat Stream Payload       │
               ▼                                                  │ 8. Canonical SSE
┌───────────────────────────────────────────────────────────────┐ │    (Progress Tree,
│                Step 4 Planning & Routing Engine               │ │     Subagent Deltas,
│  - Parses Slash Commands & Multimodal Attachments             │ │     Multimodal Vision)
│  - Selects Skills & Resolves Research Depth Mode              │ │
└──────────────┬────────────────────────────────────────────────┘ │
               │ 2. Subagent Spawning Matrix                      │
               ▼                                                  │
┌───────────────────────────────────────────────────────────────┐ │
│            Multi-Agent Subagent Research Orchestrator         │─┘
│                                                               │
│   ┌───────────────────────────────────────────────────────┐   │
│   │ Master Coordinator Agent (Claude Sonnet 4.6 / Opus)   │   │
│   │ - Deconstructs marketing objective into sub-tasks     │   │
│   │ - Spawns and supervises worker subagents              │   │
│   └───────┬───────────────┬───────────────┬───────────────┘   │
│           │               │               │                   │
│           ▼               ▼               ▼                   │
│   ┌───────────────┐┌───────────────┐┌───────────────┐         │
│   │ Competitor    ││ Pricing & Tier││ SEO & SERP    │         │
│   │ Worker (MCP)  ││ Worker (MCP)  ││ Worker (MCP)  │         │
│   │ - Firecrawl   ││ - Scraper     ││ - Google Ads  │         │
│   │ - Web Search  ││ - Value Model ││ - Search Vol  │         │
│   └───────┬───────┘└───────┬───────┘└───────┬───────┘         │
│           │               │               │                   │
│           └───────────────┼───────────────┘                   │
│                           ▼                                   │
│   ┌───────────────────────────────────────────────────────┐   │
│   │ Synthesis & Cross-Verification Layer                  │   │
│   │ - Jaccard source de-duplication & claim validation    │   │
│   │ - Emits unified intelligence briefing + Artifact      │   │
│   └───────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure & Module Blueprint

```text
c:\Users\shrut\Desktop\Infianl.ai_2\infinall-chat\
├── app/
│   ├── api/
│   │   ├── skills/
│   │   │   └── route.ts                        # Skills manifest, directory & metadata search
│   │   ├── research/
│   │   │   └── stream/route.ts                 # Dedicated subagent research orchestration stream
│   │   ├── upload/
│   │   │   └── route.ts                        # Multimodal asset ingestion (Images, PDF, Audio)
│   │   └── directory/
│   │       └── tools/route.ts                  # 100+ Tools directory catalog & health checks
├── components/
│   ├── skills/
│   │   ├── SkillsMenuPopover.tsx               # Slash command (/ ) popover & autocomplete menu
│   │   ├── SkillBadgePill.tsx                  # Active skill indicator tag in composer
│   │   └── SkillDetailModal.tsx                # Skill instructions, rules, and example prompts
│   ├── research/
│   │   ├── ResearchModeToggle.tsx              # Deep Research Mode toggle in composer
│   │   ├── ResearchProgressTree.tsx            # Live visual tree of active subagent workers
│   │   └── SubagentTaskCard.tsx                # Individual subagent status, query & source pills
│   ├── directory/
│   │   ├── ToolsDirectoryModal.tsx             # 100+ Tools Directory with category sidebar
│   │   ├── ToolCard.tsx                        # Tool metadata, MCP server status & run tester
│   │   └── CategoryFilterTabs.tsx              # Filter by Paid Ads, SEO, Analytics, CRM
│   └── multimodal/
│       ├── FileDropzoneOverlay.tsx             # Drag-and-drop file upload overlay
│       ├── AttachmentPreviewBar.tsx            # Image/PDF thumbnail previews in composer
│       └── CreativeVisionInspector.tsx         # Ad creative breakdown & visual contrast audit
├── lib/
│   ├── skills/
│   │   ├── catalog.ts                          # Built-in marketing skills (SEO, Copy, GTM, Ads)
│   │   ├── resolver.ts                         # 3-level progressive disclosure loader
│   │   └── types.ts                            # Skill manifest, rule schema & prompt templates
│   ├── subagents/
│   │   ├── orchestrator.ts                     # Multi-agent worker spawner & aggregation harness
│   │   ├── types.ts                            # Subagent task, state, progress & result schemas
│   │   └── workers/
│   │       ├── competitor-worker.ts            # Parallel competitor analysis subagent
│   │       ├── pricing-worker.ts               # Parallel pricing & packaging subagent
│   │       └── serp-worker.ts                  # Keyword trends & SERP intelligence subagent
│   └── multimodal/
│       ├── parser.ts                           # PDF/DOCX text & tabular extractor
│       ├── vision.ts                           # Ad creative image analysis & OCR pipeline
│       └── audio.ts                            # Audio transcription adapter
├── tests/
│   └── phase4-suite.ts                         # Automated verification test suite for Phase 4
```

---

## 4. Technical Specifications & Implementation Details

### 4.1. 3-Level Progressive Disclosure Skills Architecture

Loading hundreds of marketing instructions into the LLM system prompt wastes context and degrades attention. Phase 4 implements **Progressive Disclosure**:

```text
Level 1: Manifest Discovery (<50 tokens per skill)
- Name, description, trigger keywords, and slash command slug.
- Loaded into the Step 4 Planner pass.
        ↓
Level 2: Deferred Instruction Loading (On-Demand)
- Injected into system prompt ONLY when the user invokes `/skill-slug` or intent matches.
- Contains specialized rules, output formats, and copywriting frameworks.
        ↓
Level 3: Custom Workspace Skills (Repository / Team Defined)
- Custom marketing rules stored in `.infinall/skills/*.md` or UI skill builder.
```

#### TypeScript Types & Schema (`lib/skills/types.ts`)
```typescript
export type SkillCategory = 'strategy' | 'paid_media' | 'seo_content' | 'crm_retention' | 'cro_conversion';

export interface SkillManifest {
  slug: string; // e.g. '/ad-copy'
  name: string;
  category: SkillCategory;
  description: string;
  triggerKeywords: string[];
  icon: string;
  estimatedTokens: number;
}

export interface SkillRule {
  id: string;
  name: string;
  instruction: string;
  enforceFormat?: string;
  exampleOutputs?: string[];
}

export interface CompleteSkill extends SkillManifest {
  systemPromptInjection: string;
  rules: SkillRule[];
  suggestedTools: string[];
  defaultArtifactType?: 'html' | 'markdown' | 'docx' | 'pptx' | 'xlsx';
}
```

#### Canonical Built-In Marketing Skills Catalog (`lib/skills/catalog.ts`)

| Skill Slug | Name | Category | Primary Capability | System Prompt Tokens |
| :--- | :--- | :--- | :--- | :--- |
| `/brand-voice` | **Brand Voice & Positioning** | Strategy | Enforces tone guidelines, core value propositions, and messaging pillars. | ~450 |
| `/ad-copy` | **Direct-Response Copywriter** | Paid Media | 5-part direct response ad copy variations (AIDA, PAS, Hook-Story-Offer). | ~620 |
| `/seo-audit` | **SEO Content & SERP Strategist** | SEO & Content | Search intent mapping, keyword clustering, and technical meta tags. | ~580 |
| `/gtm-planner` | **GTM Launch Architect** | Strategy | Full 90-day launch roadmap, channel mix, budget split, and KPI scorecard. | ~750 |
| `/email-sequence`| **Lifecycle Email Sequence** | CRM & Retention | 7-day onboarding & win-back drip email sequences with subject lines. | ~510 |
| `/cro-teardown` | **Landing Page CRO Teardown** | CRO & Conversion | Above-the-fold audit, friction reduction, CTA contrast, and social proof. | ~640 |

---

### 4.2. Deep Research Mode & Multi-Agent Subagent Orchestrator

When the user activates **Deep Research Mode** (or executes `/research [prompt]`), Infinall Chat dispatches an autonomous multi-agent hierarchy:

#### Subagent Execution Invariants (`lib/subagents/orchestrator.ts`)
1. **Isolated Context Windows**: Each worker subagent maintains its own conversation history and tool execution loop to eliminate context bloat.
2. **Parallel Concurrency**: Workers execute concurrently using `Promise.allSettled()` with individual 45-second execution timeouts.
3. **Cross-Source Synthesis Layer**:
   - Calculates Jaccard token similarity across findings to remove duplicate claims.
   - Assigns canonical numbered citation IDs (`[1]`, `[2]`, `[3]`).
   - Produces an executive synthesis report with side-by-side comparison tables.

#### Canonical Subagent Progress SSE Protocol (`lib/subagents/types.ts`)
```typescript
export type SubagentEventType =
  | 'subagent_spawn'
  | 'subagent_progress'
  | 'subagent_complete'
  | 'subagent_error'
  | 'synthesis_start'
  | 'synthesis_complete';

export interface SubagentSpawnPayload {
  subagentId: string;
  taskName: string;
  assignedWorker: 'competitor' | 'pricing' | 'serp' | 'general';
  goal: string;
}

export interface SubagentProgressPayload {
  subagentId: string;
  currentStep: string;
  sourcesFound: number;
  elapsedMs: number;
}

export interface SubagentCompletePayload {
  subagentId: string;
  findings: string;
  sources: Array<{ id: number; title: string; url: string; domain: string; snippet: string }>;
}
```

---

### 4.3. 100+ Tools Directory Modal & Ecosystem Management

A full-screen interactive directory accessible from the sidebar (`/tools` or clicking the "Analytics & Tools" tab):

#### Directory Features:
- **Category Filter Tabs**:
  - `All Tools` (100+)
  - `Paid Acquisition` (Meta Ads, Google Ads, TikTok Ads, LinkedIn Campaign Manager, Amazon Ads)
  - `Analytics & Attribution` (GA4, Mixpanel, Amplitude, Segment, PostHog)
  - `SEO & Scraping` (Firecrawl, SEMrush, Ahrefs, SERP API, Google Search Console)
  - `CRM & Marketing Automation` (HubSpot, Salesforce, Klaviyo, Customer.io, ActiveCampaign)
- **Live Connection Status**: Visual status pills (`🟢 Active MCP`, `🟡 Mock Mode`, `⚪ Configure API Key`).
- **Interactive Query Tester**: Run diagnostic queries directly in the modal to test tool responses before starting a chat.

---

### 4.4. Multimodal Ingestion & Creative Vision Studio

Enables marketers to upload creative assets for instant AI analysis:

#### 1. Ad Creative & Landing Page Vision Analysis (`lib/multimodal/vision.ts`)
- Upload formats: PNG, JPG, WebP, SVG.
- **Visual Contrast & Hierarchy Audit**: Analyzes headline readability, focal point, and CTA prominence.
- **Hook & Copy Critique**: Evaluates direct-response hook effectiveness and messaging alignment.
- **Meta/Google Ad Compliance Check**: Detects prohibited claims, excessive text-to-image ratios, and platform-specific policy risks.

#### 2. Strategy Deck & Document Ingestion (`lib/multimodal/parser.ts`)
- Upload formats: PDF, DOCX, CSV.
- Extracts tabular data and structural text to attach as conversation memory without manual copy-pasting.

---

## 5. API Routes & Endpoint Specifications

### 5.1. Skills Manifest Endpoint: `GET /api/skills`
- Query parameters: `category?: string`, `query?: string`
- Returns array of `SkillManifest` objects with search filtering.

### 5.2. Research Orchestrator Stream: `POST /api/research/stream`
- Body: `{ prompt: string, depth: 'fast' | 'deep', targetCompetitors?: string[] }`
- Streams subagent progress events (`subagent_spawn`, `subagent_progress`, `subagent_complete`, `synthesis_complete`) via Server-Sent Events (SSE).

### 5.3. Multimodal Upload Endpoint: `POST /api/upload`
- Accepts `multipart/form-data` with files up to 25MB.
- Validates MIME types, extracts text/vision blocks, and returns canonical attachments payload.

### 5.4. Tools Directory Endpoint: `GET /api/directory/tools`
- Returns the 100+ tools registry with category tags, authentication requirements, and current server latency.

---

## 6. Deterministic Acceptance & Benchmark Test Matrix

Phase 4 includes a 12-test automated regression suite (`tests/phase4-suite.ts`):

| Test ID | Area | Target Assertion | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **S01** | **Skills Engine** | Slash Command Autocomplete | `/` matches registered slugs (`/ad-copy`, `/brand-voice`, `/seo-audit`). |
| **S02** | **Skills Engine** | Deferred Rule Injection | Model receives full skill instructions only after explicit invocation. |
| **S03** | **Skills Engine** | Custom Skill Serialization | User-defined skill files parse valid frontmatter and system prompt fragments. |
| **S04** | **Subagent Orchestrator** | Parallel Worker Spawning | Spawns multiple concurrent subagents without thread collisions. |
| **S05** | **Subagent Orchestrator** | Task Progress SSE Events | Emits `subagent_spawn`, `subagent_progress`, and `subagent_complete` in order. |
| **S06** | **Subagent Orchestrator** | Synthesis & Citation Deduplication | Merges disparate worker citations into a deduplicated numbered reference list. |
| **S07** | **Subagent Orchestrator** | Worker Timeout & Error Isolation | A failing subagent does not abort sibling workers or crash master synthesis. |
| **S08** | **Tools Directory** | Category Filtering | Filter by category returns exact matching subset of tools. |
| **S09** | **Tools Directory** | Health Check & Latency Ping | Diagnostics endpoint returns latency and connection status. |
| **S10** | **Multimodal Vision** | Image Payload Structuring | Image upload converts to valid vision content block format. |
| **S11** | **Multimodal Parser** | PDF / Document Text Extraction | PDF parser extracts clean textual paragraphs and table structures. |
| **S12** | **End-to-End Flow** | Combined Skill + Research + Artifact | `/research` + `/ad-copy` outputs structured intelligence report with artifact deliverable. |

---

## 7. Implementation Roadmap & Execution Checklist

- [ ] **Step 1: Progressive Skills Architecture**
  - Implement `lib/skills/catalog.ts`, `lib/skills/resolver.ts`, and `types.ts`.
  - Build `SkillsMenuPopover.tsx` with slash command auto-complete in composer.
- [ ] **Step 2: Multi-Agent Research Orchestrator**
  - Implement `lib/subagents/orchestrator.ts` and specialized workers (`competitor`, `pricing`, `serp`).
  - Build `ResearchModeToggle.tsx` and `ResearchProgressTree.tsx`.
- [ ] **Step 3: 100+ Tools Directory Modal**
  - Implement `ToolsDirectoryModal.tsx`, `ToolCard.tsx`, and `CategoryFilterTabs.tsx`.
  - Connect `/api/directory/tools` health check route.
- [ ] **Step 4: Multimodal Ingestion & Creative Vision Studio**
  - Implement `FileDropzoneOverlay.tsx`, `AttachmentPreviewBar.tsx`, and `lib/multimodal/vision.ts`.
  - Add image/PDF upload handlers in `/api/upload`.
- [ ] **Step 5: Automated Regression & Benchmark Verification**
  - Build and execute `tests/phase4-suite.ts` (12/12 assertions passing).
  - Verify live research mode, skills menu, and file uploads in browser.

---

*This specification defines the complete production blueprint for Phase 4: Progressive Skills, Subagent Research Orchestrator & Multimodal Engine.*
