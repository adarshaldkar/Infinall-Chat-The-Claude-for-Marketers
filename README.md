# Infinall Chat — The Claude for Marketers

<div align="center">

![Infinall Chat Banner](https://raw.githubusercontent.com/adarshaldkar/Infinall-Chat-The-Claude-for-Marketers/main/public/banner.png)

### Autonomous Marketing Operating System
**Claude-tier Strategy · 100+ Marketing Tools · pgvector Brand Brain · Deep Research Swarms · Cryptographic Governance · Universal Multi-Format Artifacts**

[![Next.js](https://img.shields.io/badge/Next.js-15.2_App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector_%2B_RLS-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.0-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![MCP](https://img.shields.io/badge/MCP-Standard_Runtime-9333ea?style=for-the-badge)](https://modelcontextprotocol.io/)

</div>

---

## 📑 Table of Contents

1. [Executive Overview](#-executive-overview)
2. [Key Capabilities & Subsystems](#-key-capabilities--subsystems)
   - [1. Autonomous Agent Loop & Pre-Flight Planning Pass](#1-autonomous-agent-loop--pre-flight-planning-pass)
   - [2. Model Catalog & Intent-Based Auto-Routing](#2-model-catalog--intent-based-auto-routing)
   - [3. Multi-Tenant Brand Brain & Hybrid RAG Retrieval](#3-multi-tenant-brand-brain--hybrid-rag-retrieval)
   - [4. Universal Multi-Format Deliverable Artifacts](#4-universal-multi-format-deliverable-artifacts)
   - [5. 100+ Enterprise Marketing MCP Tool Ecosystem](#5-100-enterprise-marketing-mcp-tool-ecosystem)
   - [6. Zero-Accident Safety Gate & Approval Center](#6-zero-accident-safety-gate--approval-center)
   - [7. Deep Research Subagent Swarms](#7-deep-research-subagent-swarms)
   - [8. Multimodal Marketing Intelligence (Vision, Audio, Video)](#8-multimodal-marketing-intelligence)
   - [9. Progressive Skills System & Supabase Custom Skills](#9-progressive-skills-system--supabase-custom-skills)
   - [10. Session Lifecycle, Postgres FTS & 30-Day Retention](#10-session-lifecycle-postgres-fts--30-day-retention)
3. [System Architecture Diagram](#-system-architecture-diagram)
4. [Repository Structure](#-repository-structure)
5. [Getting Started & Local Setup](#-getting-started--local-setup)
6. [Environment Variables Reference](#-environment-variables-reference)
7. [Automated Test & Benchmark Matrix](#-automated-test--benchmark-matrix)
8. [Production Security & Invariants](#-production-security--invariants)
9. [License & Credits](#-license--credits)

---

## 🌟 Executive Overview

**Infinall Chat** is a specialized, autonomous AI workspace designed specifically for Chief Marketing Officers, growth operators, performance media buyers, and brand strategists.

Traditional chat interfaces are passive text streams. **Infinall Chat** functions as an **Autonomous Marketing Operating System**:
- **It plans before executing**, formulating structured pre-flight strategies and selecting optimal foundation models.
- **It grounds every word in your Brand Brain**, combining dense vector embeddings with sparse BM25/FTS full-text search under strict multi-tenant Row Level Security.
- **It generates production-ready deliverables**, building interactive apps, spreadsheets with formulas, formatted slide decks, executive Word memos, and print PDFs.
- **It enforces cryptographic human-in-the-loop safety**, requiring signed, single-use HMAC approval tokens before mutating ad spend, CRM workflows, or live campaigns.
- **It scales research with subagent swarms**, orchestrating 3–6 parallel workers to map competitor matrices, teardown landing pages, and synthesize market intelligence.

---

## ⚡ Key Capabilities & Subsystems

### 1. Autonomous Agent Loop & Pre-Flight Planning Pass
- **Discrete Context Assembly**: Injects isolated XML blocks (`<brand_context>`, `<memory_context>`, `<knowledge_context>`, `<connected_tools>`, `<active_artifact>`, and `<chat_history>`).
- **Structured JSON Planning Output**: Emits machine-readable execution plans (`intent`, `recommended_model`, `matched_skill_id`, `requires_research_mode`, `estimated_turns`, `expected_deliverables`).
- **Resilient Multi-Turn Agent Loop**: Parallel tool execution with `Promise.allSettled()`, token budget management, dynamic schema discovery, and automatic Zod schema recovery loops.

### 2. Model Catalog & Intent-Based Auto-Routing
Enforces a PRD-compliant model roster mapped strictly by domain heuristics:
- **`Auto`**: Intelligent dynamic router based on intent classification, token budget, and complexity.
- **`Claude Sonnet 4.6`**: Primary workhorse for high-converting copywriting, email nurturing, and multi-channel campaign drafting.
- **`Claude Opus 5`**: Flagship cognitive engine for 90-day GTM roadmaps, deep strategic positioning, and multi-subagent research synthesis.
- **`GPT-5.6`**: Analytical specialist for financial modeling, attribution math, and second-opinion validation.

### 3. Multi-Tenant Brand Brain & Hybrid RAG Retrieval
- **Hybrid Reciprocal Rank Fusion (RRF)**: Merges dense vector embeddings (`text-embedding-3-small` 1536-d) with sparse PostgreSQL `tsvector` full-text search ($k=60$).
- **Multi-Tenant RLS Isolation**: Every query, memory, document, and chunk is strictly scoped by `user_id` and `project_id` via PostgreSQL Row Level Security.
- **Autonomous Brand Memory Extraction**: LLM background extraction pipeline classifying brand voice, target audience personas, messaging pillars, positioning rules, approved claims, and competitive intelligence.
- **Conflict Resolver**: Detects semantic brand conflicts, assigns confidence weights, and maintains immutable audit revision trails.

### 4. Universal Multi-Format Deliverable Artifacts
- **Dual-Channel Stream Parser**: Intercepts `<antArtifact>` XML tags in real time, rendering conversation tokens to the chat thread while simultaneously streaming live deliverables to the workspace panel.
- **Rich Document Editor**: Full markdown editing toolbar (H1–H3, Bold, Italic, Strikethrough, Code block, Tables, Lists, Quotes), **Split View** (side-by-side editing and live rendered preview), keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+K), and word/reading-time statistics.
- **Interactive Web Apps (`html`/`app`)**: Sandboxed iframe execution environment with Desktop, Tablet, and Mobile viewport modes.
- **Tabular Spreadsheets (`table`/`spreadsheet`)**: In-browser multi-tab spreadsheet viewer with automatic formula parsing.
- **Dynamic Charts & Diagrams**: Interactive Recharts visualizations and Mermaid.js flowcharts with SVG export.
- **Binary Document Generator Suite**:
  - `DOCX`: Professional executive Word strategy documents.
  - `XLSX`: Native multi-sheet workbooks with live Excel formulas (`SUM`, `AVERAGE`, `VLOOKUP`).
  - `PPTX`: 16:9 widescreen presentation slide decks with metrics cards.
  - `PDF`: Clean print-ready documents with pagination.

### 5. 100+ Enterprise Marketing MCP Tool Ecosystem
Encompasses 14 core marketing categories:
1. **Search & SEO**: Ahrefs, Semrush, Moz, SerpAPI, ScreamingFrog, SpyFu.
2. **Paid Media & Ad Networks**: Meta Ads, Google Ads, TikTok Ads, LinkedIn Campaign Manager, Pinterest Ads.
3. **Analytics & Attribution**: Google Analytics 4, Mixpanel, PostHog, Amplitude, Heap.
4. **CRM & Marketing Automation**: HubSpot, Salesforce, Klaviyo, ActiveCampaign, Customer.io.
5. **Content & Social Media**: WordPress, Ghost, Buffer, Hootsuite, Sprout Social.
6. **Email & SMS Messaging**: SendGrid, Mailchimp, Twilio, Resend.
7. **Creative & Visual Assets**: Figma, Canva, Cloudinary, Midjourney.
8. **Collaboration & Workflow**: Slack, Notion, Asana, Monday.com, Linear, Trello.
9. **CRO & A/B Testing**: Optimizely, VWO, Hotjar, CrazyEgg.
10. **E-commerce & Retail**: Shopify, Amazon Ads, WooCommerce, BigCommerce.
11. **Influencer & Affiliate**: Impact.com, Grin, AspireIQ, Upfluence.
12. **Market Intelligence**: BuiltWith, Clearbit, SimilarWeb, ZoomInfo.
13. **Customer Support & Feedback**: Zendesk, Intercom, Typeform, SurveyMonkey.
14. **Cloud Storage & Data Warehouses**: Google Drive, Dropbox, Snowflake, BigQuery.

> **Honest Execution Transparency**: Live connectors (Meta Ads, Google Ads, GA4, HubSpot, Slack, Notion, Firecrawl) execute live vendor APIs. Remaining catalog tools run in sandboxed domain simulation mode with `isMock: true` and `mode: 'sandbox'` clearly labeled.

### 6. Zero-Accident Safety Gate & Approval Center
- **HMAC-SHA256 Signatures**: All state-mutating actions (ad budget changes, campaign publishing, email broadcasts) generate cryptographic tamper-proof tokens.
- **Single-Use Invariant & 300s TTL**: Tokens expire after 5 minutes and cannot be replayed.
- **Interactive Visual Diff Cards**: Side-by-side parameter diffs, live countdown clocks, and instant rejection feedback loops triggering agent replanning.

### 7. Deep Research Subagent Swarms
- **Objective Decomposition**: Deconstructs complex briefs into 3–6 focused subagent objectives (`Competitor Breakdown`, `Audience ICP`, `Pricing Analysis`, `Channel Strategy`).
- **Parallel Subagent Orchestration**: Real-time SSE streaming tree UI displaying concurrent worker queries, progress, and source synthesis.

### 8. Multimodal Marketing Intelligence
- **Vision Auditing**: Real-time vision model inspection analyzing visual contrast, font hierarchy, CTA prominence, and brand color compliance.
- **Video Diagnostics**: Frame extraction via ffmpeg, timestamp seeking (`01:42` $\to$ `102s`), scene narrative pacing, and hook retention analysis.
- **Audio & Speech Analysis**: Diarized transcription, buying intent scoring, pain point categorization, and competitor mention tracking.

### 9. Progressive Skills System & Supabase Custom Skills
- **3-Level Progressive Disclosure**: Manifests (<50 tokens) loaded in planning pass; full instructions and rules injected only when triggered.
- **18+ Built-in Marketing Skills**: `/ad-copy`, `/gtm-planner`, `/seo-audit`, `/cro-teardown`, `/email-sequence`, `/competitor-matrix`, `/content-calendar`, etc.
- **Supabase Custom Skills Persistence**: User-created skills persist directly to the PostgreSQL `custom_skills` table with `personal`, `team`, and `catalog` scopes.

### 10. Session Lifecycle, Postgres FTS & 30-Day Retention
- **Non-Destructive Incremental Persistence**: Real-time upserts preserving message IDs, sequence numbers, and models used.
- **PostgreSQL Full-Text Search**: Server-side `tsvector` search via `search_chat_history` RPC.
- **30-Day Quarantine & Undo**: Soft-delete archive with instant 1-click Undo recovery and automated retention purge.

---

## 🏛️ System Architecture Diagram

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT WORKSPACE                                  │
│  Composer · Model Selector · Skills Slash Commands · Resizable Split Panes       │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ POST /api/chat (SSE Stream)
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            FAST ROUTER & PLANNING PASS                           │
│  Brand Context · Memory Context · Knowledge RAG · Active Artifact · Chat History │
│                                        │                                         │
│                      Emits Structured Execution Plan                             │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          AUTONOMOUS AGENT LOOP                                   │
│  Token Budget Monitor · Deferred Tool Discovery · Multi-Turn Zod Validation      │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│          READ TOOLS (Autonomous)       │       WRITE TOOLS (Safety Gate)         │
│  - Web Search / Firecrawl Scrape       │  - Meta / Google Ads Spend Mutations    │
│  - RAG Hybrid Vector Search (pgvector) │  - CRM Contact & Workflow Updates       │
│  - GA4 Telemetry & Metrics Query       │  - Campaign Publishing & Broadcasts     │
│  - SEO Keyword & Competitor Lookup     │                   │                     │
│                                        │         HMAC-SHA256 Token               │
│                                        │                   ▼                     │
│                                        │       APPROVAL CENTER / GATEWAY         │
└────────────────────────────────────────┴─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    DUAL-CHANNEL STREAM PARSER & ARTIFACTS                        │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│            Chat Stream Thread          │        Universal Artifact Workspace     │
│  - Reasoning / Thinking Accordion      │  - Rich Markdown Editor (Split View)    │
│  - Tool Activity & Sandbox Badges      │  - Sandboxed HTML / App iFrames         │
│  - Verified Source Citations           │  - Native Multi-Sheet XLSX (Formulas)   │
│  - Rejection Feedback Loops            │  - Native 16:9 Widescreen PPTX Decks    │
│                                        │  - Executive DOCX & Print PDFs          │
│                                        │  - Google Drive Direct Sync / Export    │
└────────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 📂 Repository Structure

```text
Infinall-Chat-The-Claude-for-Marketers/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automated CI: Typechecks, Regression & Acceptance Suites
├── docs/
│   └── PRD_Infinall_Chat_Phase1_v2.md  # Comprehensive Phase 1 Product Requirements
├── infinall-chat/
│   ├── app/
│   │   ├── api/
│   │   │   ├── approvals/         # HMAC safety token signing & verification
│   │   │   ├── artifacts/         # Multi-format exports & Google Drive / Approval handoffs
│   │   │   ├── brand-memory/      # Brand Brain CRUD, extraction & conflict resolution
│   │   │   ├── campaigns/         # Campaign pipeline & Kanban state machine
│   │   │   ├── chat/              # Main SSE streaming chat route & agent loop
│   │   │   ├── connectors/        # Google Drive, Slack, HubSpot OAuth & sync
│   │   │   ├── knowledge/         # Document ingestion & pgvector chunk search
│   │   │   ├── mcp/               # Model Context Protocol gateway routes
│   │   │   ├── research/          # Deep research subagent orchestration
│   │   │   ├── sessions/          # Non-destructive persistence & Postgres FTS
│   │   │   ├── skills/            # Progressive skills manifest search & Supabase sync
│   │   │   └── upload/            # Canonical Supabase Storage multimodal upload
│   │   ├── layout.tsx
│   │   └── page.tsx               # Main chat workspace entrypoint
│   ├── components/
│   │   ├── artifacts/             # Artifact workspace, version slider & renderers
│   │   │   └── renderers/         # Rich Markdown, HTML App, XLSX, PPTX, Charts
│   │   ├── brand-brain/           # Brand Brain panel & conflict resolution modal
│   │   ├── campaigns/             # Campaign pipeline Kanban & deliverable drawer
│   │   ├── chat/                  # Composer, message thread, thinking accordion
│   │   ├── research/              # Deep research subagent swarm tree visualizer
│   │   └── skills/                # Skills directory & custom skill creation modal
│   ├── lib/
│   │   ├── connectors/            # Google Drive, GA4, Meta Ads, Google Ads adapters
│   │   ├── gateway/               # LLM Gateway client & protocol translation
│   │   ├── ingestion/             # 13-format canonical ParserRegistry
│   │   ├── mcp/                   # MCP Client, transports (HTTP/SSE/Stdio), registry
│   │   ├── multimodal/            # Vision, ffmpeg video processor, audio transcriber
│   │   ├── rag/                   # Hybrid RRF retriever, pgvector embedding gateway
│   │   ├── security/              # Session auth, credential vault & HMAC approval
│   │   ├── skills/                # Progressive disclosure resolver & builtins
│   │   ├── state/                 # Step-3 Planner & multi-turn agent loop
│   │   └── tools/                 # 100+ marketing tools, router & category executors
│   ├── supabase/
│   │   └── migrations/            # SQL schemas: pgvector, RLS policies, FTS, skills
│   └── tests/
│       ├── planning-regression-suite.ts    # 7-case auto-router regression suite
│       ├── test-ingestion-registry.ts     # 21-case 13-format parser suite
│       ├── vertical-acceptance-suite.ts   # 37-case end-to-end acceptance suite
│       ├── rls-isolation-suite.ts         # 23-case multi-tenant isolation suite
│       ├── phase5-rag-suite.ts            # 10-case RAG & Brand Memory suite
│       └── video-intelligence-suite.ts    # Video analysis & seeking tests
└── README.md
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **npm**: v10.x+
- **Supabase Account** (or local Supabase CLI instance) with `pgvector` enabled

### 1. Clone Repository
```bash
git clone https://github.com/adarshaldkar/Infinall-Chat-The-Claude-for-Marketers.git
cd Infinall-Chat-The-Claude-for-Marketers/infinall-chat
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a local `.env.local` file from the example template:
```bash
cp .env.example .env.local
```
Fill in your API credentials (see [Environment Variables Reference](#-environment-variables-reference)).

### 4. Apply Database Migrations (Supabase)
Apply all database migrations including pgvector, RLS policies, custom skills, and full-text search:
```bash
npm run db:apply
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables Reference

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | URL of your Supabase project | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase anonymous public key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase service-role key (backend only) | `eyJhbGciOi...` |
| `LLM_GATEWAY_BASE_URL` | **Yes** | Base URL for LLM gateway proxy | `https://llm.ganeshnayak.in` |
| `LLM_GATEWAY_API_KEY` | **Yes** | API key for LLM gateway access | `sk-gateway-...` |
| `APPROVAL_SECRET` | **Yes** | 256-bit secret for HMAC approval signing | `infinall-approval-secret-...` |
| `TAVILY_API_KEY` | Optional | Live web search provider | `tvly-...` |
| `FIRECRAWL_API_KEY` | Optional | Competitor page & pricing scraping | `fc-...` |
| `SERPER_API_KEY` | Optional | Google SERP intelligence | `serper-...` |

---

## 🧪 Automated Test & Benchmark Matrix

The project includes an enterprise-grade automated test suite ensuring strict zero-regression adherence across all subsystems:

```bash
# 1. Typecheck: Strict TypeScript compilation check (0 errors)
npm run test:types

# 2. Planning Regression: 7-case Planner & Auto-Router validation
npx tsx --import ./tests/test-env-bootstrap.ts tests/planning-regression-suite.ts

# 3. Document Ingestion Registry: 21 assertions across 13 document formats
npm run test:ingestion

# 4. Vertical Acceptance Suite: 37 cross-functional end-to-end journey assertions
npx tsx --import ./tests/test-env-bootstrap.ts tests/vertical-acceptance-suite.ts

# 5. RLS Tenant Isolation Suite: 23 unit & live PostgreSQL isolation tests
npm run test:rls

# 6. RAG, VectorDB & Brand Memory Suite: 10 hybrid retrieval & extraction tests
npm run test:rag

# 7. Run All Test Suites Sequentially
npm run test:all
```

### Verified Benchmark Results:
- ✅ **TypeScript Typecheck**: `0 errors (Exit code 0)`
- ✅ **Planning Regression Suite**: `7/7 Passed (100%)`
- ✅ **Parser Registry Suite**: `21/21 Passed (100%)`
- ✅ **Vertical Acceptance Suite**: `37/37 Passed (100%)`
- ✅ **RLS Isolation Suite**: `23/23 Passed (100%)`
- ✅ **Phase 5 RAG Benchmark Suite**: `10/10 Passed (100%)`

---

## 🛡️ Production Security & Invariants

1. **Zero-Accident Safety Invariant**: State-mutating marketing tools cannot execute without a cryptographically verified HMAC-SHA256 token approved by a human reviewer.
2. **Multi-Tenant Tenant Isolation**: Row Level Security (RLS) is active across all database tables. Queries automatically filter by `auth.uid() = user_id`.
3. **Sandbox Transparency**: Synthetic/mock catalog tools explicitly report `isMock: true` and `mode: 'sandbox'` with diagnostic warnings.
4. **Secret Hygiene**: All environment secrets, `.env.local`, and credentials are strictly excluded from source control and distribution archives.

---

## 📄 License & Credits

Built with precision for **Infinall AI**.  
All rights reserved © 2026 Infinall.ai.
