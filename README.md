# Infinall Chat — The Claude for Marketers

> **An Autonomous Agentic Marketing Operating System with Model Context Protocol (MCP), Deferred Tool Discovery, Cryptographic Mutation Safety, and Universal Multi-Format Artifacts.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![MCP](https://img.shields.io/badge/MCP-Standard-purple)](https://modelcontextprotocol.io/)

---

## 🌟 Overview & Capabilities

Infinall Chat is a Claude-tier autonomous pair programmer and growth strategist designed specifically for marketing teams. It integrates deep marketing platform connectivity with real-time streaming artifacts, sandboxed execution, and cryptographic human-in-the-loop governance.

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                   Infinall Chat                                  │
├──────────────────────────────┬───────────────────────────────────────────────────┤
│    Chat & Strategy Stream    │         Universal Deliverable Artifacts           │
│                              │                                                   │
│  - Step 3 Planning Pass      │  - Interactive HTML/React Apps (Sandboxed iframe) │
│  - Thinking Accordion        │  - WYSIWYG Strategy Documents (GFM Tables)        │
│  - MCP Tool Activity Badges  │  - Native DOCX Executive Strategy Briefs          │
│  - Verified Web Citations    │  - Native Multi-Sheet XLSX with Live Formulas     │
│  - Cryptographic Diff Cards  │  - 16:9 Widescreen PPTX Slide Decks               │
│  - Live Rejection Feedback   │  - Print-Ready PDF Documents                      │
│                              │  - Recharts Dashboards & Mermaid Flowcharts       │
│                              │  - Immutable Snapshot Versioning (v1, v2...)      │
│                              │  - Line-by-Line Visual Diff Inspector             │
│                              │  - One-Click Export Hub                           │
└──────────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 🏛️ Architecture & System Blueprint

### 1. Gateway & Agent Harness (`lib/state/agent-loop.ts`)
- **Fast Router / Step 3 Planning Pass**: Classifies incoming marketing tasks (`copywriting`, `campaign_build`, `analytics`, `strategy`) and recommends optimal model tiers (Claude Sonnet 4.6, Claude Opus 4.6, Claude Haiku 4.5, GPT-5.2).
- **Deferred Tool Discovery**: Searches semantic tool catalogs on-the-fly and loads minimal candidate tool schemas to preserve context windows.
- **Resilient Multi-Turn Loop**: Parallel tool resolution with `Promise.allSettled()`, token budget monitors, and automatic Zod schema recovery loops.

### 2. Model Context Protocol (MCP) Ecosystem (`lib/mcp/`)
- **Transport Layer**: Unified MCP Client supporting **Streamable HTTP** (primary), **HTTP+SSE** (legacy fallback), and **Local Stdio** child process with binary whitelisting.
- **Marketing Adapters**:
  - `Google Analytics 4 (GA4)`: Real-time acquisition metrics, channel breakdowns, and CPA analysis.
  - `Meta Ads Manager`: Read performance and write campaign mutations.
  - `Google Ads`: Keyword search volume, CPC metrics, and ad group creation.
  - `Firecrawl Scraper`: Deep structured competitor landing page & pricing scraper.

### 3. Cryptographic Mutation Safety (`lib/tools/approval/`)
- **HMAC-SHA256 Signatures**: Write mutations (e.g. ad spend rebalance, campaign launch) generate tamper-proof cryptographic execution tokens.
- **Single-Use Invariant & 5-Minute TTL**: Approvals are valid for a single execution within 300 seconds.
- **Interactive Visual Diff Cards**: Render side-by-side parameter diffs, live countdown timers, and rejection feedback loops for agent replanning.

### 4. Universal Multi-Format Artifacts Workspace (`components/artifacts/`)
- **Dual-Channel Stream Interceptor**: Live tag parser (`<antArtifact>`) streaming conversation text to the chat window while delivering deliverables in real-time to the artifact panel.
- **Decoupled Renderer & Generator Registry**:
  - `HtmlAppRenderer`: Sandboxed iframe with Desktop, Tablet, and Mobile viewport modes.
  - `MarkdownDocumentEditor`: Full GFM tables, alert callout cards, word counts, and edit mode.
  - `ChartRenderer`: Recharts line, bar, area, and attribution funnels.
  - `MermaidDiagramRenderer`: Workflow and customer journey diagram canvas with SVG export.
  - `SpreadsheetViewer`: Multi-tab in-browser spreadsheet preview with formula detection.
- **Binary Document Generator Suite**:
  - `DocxBuilder`: Microsoft Word strategy memos.
  - `XlsxBuilder`: Multi-tab Excel spreadsheets with computable formulas (`SUM`, `VLOOKUP`, `AVERAGE`).
  - `PptxBuilder`: 16:9 widescreen PowerPoint presentation decks with stat cards.
  - `PdfBuilder`: Print-ready PDF documents.
- **Export Hub & API Routes**: `POST /api/artifacts/export/[docx|xlsx|pptx|pdf|md|html]`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Installation
```bash
# Clone the repository
git clone https://github.com/adarshaldkar/Infinall-Chat-The-Claude-for-Marketers.git
cd Infinall-Chat-The-Claude-for-Marketers

# Navigate to application
cd infinall-chat

# Install dependencies
npm install --legacy-peer-deps
```

### Environment Configuration
Copy `.env.example` to `infinall-chat/.env.local`:
```bash
GATEWAY_BASE_URL="https://llm.ganeshnayak.in"
DEFAULT_MODEL="claude-sonnet-4.6"
MCP_MODE="mock" # Set to 'live' for production MCP servers
APPROVAL_SECRET="your-256-bit-cryptographic-secret"
```

### Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Benchmark & Regression Suites

Run the deterministic test suites:

```bash
# Run Phase 2 Agent Harness, MCP & Mutation Safety Suite (11 assertions)
npx tsx tests/regression-suite.ts

# Run Phase 3 Universal Multi-Format Artifacts Suite (22 assertions)
npx tsx tests/artifact-suite.ts

# Typecheck
npx tsc --noEmit
```

---

## 📄 License & Attribution

Built with Google DeepMind Antigravity for Infinall AI.
All rights reserved.
