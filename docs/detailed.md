# Infinall Chat — "The Claude for Marketers"
## Master Claude-Tier Agentic Architecture, System Design & Implementation Blueprint

---

## 1. Executive Vision & Core Value Proposition

**Infinall Chat** is a native, vertical AI workspace purpose-built for B2B SaaS marketers and founders, integrated directly inside the Infinall.ai ecosystem alongside Brand Brain, the multi-agent campaign pipeline, and Approval Center.

### Core Positioning: "The Claude for Marketers"
Where vanilla Claude.ai operates horizontally without marketing context, Infinall Chat launches pre-grounded with:
1. **Brand Brain Grounding:** Automatically injects brand voice, ICP personas, positioning rules, and historical campaign data into the context window with prompt caching optimization.
2. **100+ Marketing Tools via MCP & Deferred Tool Search:** Connected to Meta Ads, Google Analytics 4, HubSpot, Apollo, PostHog, Buffer, Slack, and Google Docs through dynamic tool discovery.
3. **Multi-Model Capability-Based Task Routing:** Intelligently routes every turn across Claude Sonnet 4.6, Claude Opus 5, and GPT-5.6 based on task signals rather than static heuristics.
4. **Universal Multi-Format Artifacts Workspace:** Live rendering and generation for interactive HTML/React landing pages, rich-text editable documents, binary documents (DOCX, PDF, PPTX, XLSX), vector graphics, and video creatives.
5. **Enterprise Mutation Security & Sandboxing:** Autonomous execution for read actions; mandatory interactive diff/preview approval gates and isolated iframe rendering for write/publish actions.

---

## 2. The Real Claude Agent Architecture (Anthropic Patterns)

Anthropic’s public architecture demonstrates that **the model is only the reasoning engine; the Agent Harness is the operating system around it.**

```
                           CLAUDE FOUNDATION MODEL
                               (Reasoning Brain)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            THE AGENT HARNESS                                │
│                         (The Operating System)                              │
│                                                                             │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────┐  │
│  │ Context Engine        │ │ Tool Engine & MCP     │ │ Execution Sandbox │  │
│  │ • Prompt Caching Order│ │ • Deferred Discovery  │ │ • Iframe Sandbox  │  │
│  │ • Compaction Strategy │ │ • Dynamic Schema Bind │ │ • Egress Controls │  │
│  │ • Brand Brain Ingest  │ │ • 100+ Remote Servers │ │ • AST / HTML Iso  │  │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────┘  │
│                                       │                                     │
│  ┌────────────────────────────────────┴──────────────────────────────────┐  │
│  │                        THE DYNAMIC AGENTIC LOOP                       │  │
│  │                                                                       │  │
│  │        Gather Context  ──►  Take Action  ──►  Verify Result           │  │
│  │              ▲                                      │                 │  │
│  │              └──────────── Learn & Repeat ──────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                       │                                     │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────┐  │
│  │ Progressive Skills    │ │ Research Orchestrator │ │ Document Engine   │  │
│  │ • Level 1: Index      │ │ • Lead Researcher     │ │ • DOCX / PDF      │  │
│  │ • Level 2: SKILL.md   │ │ • Subagent Isolation  │ │ • PPTX / XLSX     │  │
│  │ • Level 3: Assets     │ │ • Parallel Synthesis  │ │ • HTML / Markdown │  │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCE & USER INTERACTION                     │
│ • Server-Sent Events (SSE) Stream   • Split-Screen Chat & Artifact Workspace│
│ • Durable JSONL / Postgres Sessions • Mutation Approval Diff Cards          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack Specification

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. FRONTEND / WORKSPACE UI                      │
│   Next.js 14/15 (App Router) • React 18/19 • TypeScript • Tailwind CSS │
│   shadcn/ui • Radix UI Primitives • Lucide React • Framer Motion       │
│   react-resizable-panels (Split-Screen layout)                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Server-Sent Events (SSE) & REST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     2. BACKEND & ORCHESTRATION API                     │
│   Node.js (TypeScript) • Next.js Route Handlers                        │
│   Server-Sent Events (SSE) Stream Engine • Zod Schema Validation       │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│       3. MODEL GATEWAY & LLM         │ │   4. AGENT, MCP & TOOLS       │
│ • Custom Proxy: llm.ganeshnayak.in   │ │ • @modelcontextprotocol/sdk   │
│ • Claude (via /v1/messages)          │ │ • 100+ Marketing Connectors   │
│ • GPT / Kimi (/v1/chat/completions)  │ │ • Deferred Tool Search Engine │
│ • Model Catalog & Capabilities       │ │ • Document Skills Engine      │
└──────────────────────────────────────┘ └───────────────────────────────┘
                    │                                │
                    └────────────────┬───────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│              5. DATA, PERSISTENCE & BACKGROUND JOBS                    │
│ • Database: Supabase (PostgreSQL) + JSONB + tsvector full-text search  │
│ • Cache & Suspended State: Redis (ioredis / Upstash)                   │
│ • Background Workers: BullMQ + Python Document Generator               │
│ • Storage: Supabase Storage / AWS S3 (Blobs, DOCX/PDF exports, media)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Model Catalog & Live Proxy Configuration

- **Proxy Base URL**: `https://llm.ganeshnayak.in/`
- **Authentication**: Stored securely in `.env.local` via `LLM_GATEWAY_API_KEY` (never committed or hardcoded in documentation/code).

| Model Identifier | Provider Family | Proxy Endpoint | Transport (`apiType`) | Protocol Headers & Auth |

| :--- | :--- | :--- | :--- | :--- |
| `claude-sonnet-4-6` | Anthropic | `https://llm.ganeshnayak.in/v1/messages` | `messages` | `x-api-key`, `anthropic-version: 2023-06-01`, Extended Thinking |
| `Kimi-K2.6` | Moonshot / OpenAI | `https://llm.ganeshnayak.in/v1/chat/completions` | `chat-completions` | `Authorization: Bearer <API_KEY>`, OpenAI Chat Protocol |
| `claude-opus-5` | Anthropic | `https://llm.ganeshnayak.in/v1/messages` | `messages` | `x-api-key`, `anthropic-version: 2023-06-01`, Extended Thinking |
| `gpt-5-6` | OpenAI | `https://llm.ganeshnayak.in/v1/chat/completions` | `chat-completions` | `Authorization: Bearer <API_KEY>`, OpenAI Chat Protocol |


---

## 4. Universal Artifacts & Document Generation Architecture

Artifacts in Claude are not limited to HTML/Markdown. Anthropic's official `document-skills` ecosystem establishes that **Document Generation (DOCX, PDF, PPTX, XLSX) is a first-class Skill + Programmatic Generation workflow.**

```
                                    MODEL GENERATION
                                           │
                                           ▼
                                    Artifact Intent
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐              ┌──────────────────┐
│ Interactive UIs  │              │ Rich Prose Docs  │              │ Structured Files │
│ • HTML / React   │              │ • Markdown       │              │ • DOCX (Word)    │
│ • Sandboxed JS   │              │ • Tiptap Editor  │              │ • PDF Reports    │
│ • SVG Graphics   │              │ • Inline Edit    │              │ • PPTX (Slides)  │
│ • Live Preview   │              │ • Version Snap   │              │ • XLSX / CSV     │
└────────┬─────────┘              └────────┬─────────┘              └────────┬─────────┘
         │                                 │                                 │
         ▼                                 ▼                                 ▼
Sandboxed Iframe                  Tiptap Markdown Engine            BullMQ / Document Worker
(`sandbox="allow-scripts"`)       (In-Place Versioning)             (python-docx, reportlab, openpyxl)
         │                                 │                                 │
         └─────────────────────────────────┼─────────────────────────────────┘
                                           ▼
                       Split-Screen Artifact Panel Workspace
                  [Live Preview] [Code] [Version History] [Download]
```

### 4.1 Generic Artifact Generator Interface

```typescript
export type ArtifactType = 
  | 'text/html' 
  | 'text/markdown' 
  | 'image/svg+xml' 
  | 'video/mp4'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // DOCX
  | 'application/pdf'                                                        // PDF
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation' // PPTX
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';      // XLSX

export interface ArtifactPayload {
  id: string;
  type: ArtifactType;
  title: string;
  content: string; // Raw code, markdown text, or download/storage URL
  version: number;
  metadata?: Record<string, unknown>;
}

export interface ArtifactGenerator {
  type: ArtifactType;
  generate: (input: {
    title: string;
    structuredContent: unknown;
    templateId?: string;
  }) => Promise<{ fileUrl: string; previewUrl?: string }>;
}
```

---

## 5. Context Engineering, Prompt Caching & Compaction

To maximize Anthropic prompt caching hits (saving 90% latency and cost), prompts are structured with strict prefix stability:

```
┌────────────────────────────────────────────────────────────────┐
│ 1. SYSTEM PROMPT (Fixed Persona & Constraints)                 │ ◄── Cache Checkpoint 1
├────────────────────────────────────────────────────────────────┤
│ 2. BRAND BRAIN CONTEXT (Immutable Brand Rules & ICP)           │ ◄── Cache Checkpoint 2
├────────────────────────────────────────────────────────────────┤
│ 3. AMBIENT TOOL INDEX & SKILL METADATA (Names & Descriptions)  │ ◄── Cache Checkpoint 3
├────────────────────────────────────────────────────────────────┤
│ 4. CONVERSATION HISTORY (Compacted Turns)                      │
├────────────────────────────────────────────────────────────────┤
│ 5. DYNAMIC CONTEXT (Active Artifact Ref, Tool Results, Prompt) │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. Tool Discovery (Deferred Loading) & 100+ Tools

Instead of flooding the context window with 100+ full JSON schemas (40,000+ tokens), we implement **Deferred Tool Discovery**:

```
[100+ Connected Tools Catalog in Registry]
                    │
                    ▼
[Level 1: Ambient Tool Index passed in System Context (~500 tokens)]
"google_analytics: Query CAC/LTV", "meta_ads: Manage Ad Campaigns", ...
                    │
                    ▼
[Model Emits: tool_search("analytics CAC")] OR [Planner Suggests Candidates]
                    │
                    ▼
[Level 2: Dynamic Schema Binding]
Only the 1–3 selected tool JSON schemas are dynamically bound to the current turn
                    │
                    ▼
[Level 3: Execution in Agent Loop]
Model executes tool with full parameter validation
```

---

## 7. Progressive Disclosure Skills Engine

Skills are **procedural playbooks**, distinct from MCP tools (external action APIs).

```
Skill Structure:
skills/
  docx-report-builder/
    SKILL.md            <-- Document styling rules & section hierarchy (Level 2)
    templates/          <-- Branding Word templates (Level 3)
  linkedin-ad-playbook/
    SKILL.md            <-- Ad copywriting playbook (Level 2)
    references/         <-- Winning B2B ad hooks (Level 3)
```

---

## 8. Multi-Agent Research Orchestrator (Subagent Isolation)

Deep research is implemented as an **Orchestrator-Worker subagent system**:

```
                            USER: "Deep research Competitor X positioning"
                                           │
                                           ▼
                            ┌──────────────────────────────┐
                            │    LEAD RESEARCH AGENT       │
                            │    (Plans sub-questions)     │
                            └──────────────┬───────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
         ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
         │ Subagent: Pricing  │ │ Subagent: Blog/SEO │ │ Subagent: Reviews  │
         │ (Isolated Context) │ │ (Isolated Context) │ │ (Isolated Context) │
         │ Perplexity Search  │ │ Firecrawl Scrape   │ │ G2 / Social Crawl  │
         └──────────┬─────────┘ └──────────┬─────────┘ └──────────┬─────────┘
                    │                      │                      │
                    └──────────────────────┼──────────────────────┘
                                           ▼
                            ┌──────────────────────────────┐
                            │    FINDINGS STORE (Memory)   │
                            └──────────────┬───────────────┘
                                           │
                                           ▼
                            ┌──────────────────────────────┐
                            │    SYNTHESIS AGENT           │
                            │  Consolidates & Cites Dossier│
                            └──────────────┬───────────────┘
                                           │
                                           ▼
                                Deliver Final Artifact
```

---

## 9. Comprehensive Project Directory & File Structure

```
c:/Users/shrut/Desktop/Infianl.ai_2/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── .env.example
├── detailed.md
│
├── src/
│   ├── app/                                 # Next.js App Router
│   │   ├── layout.tsx                       # Root layout (Theme, Fonts, Providers)
│   │   ├── page.tsx                         # Main Split-Screen Workspace UI
│   │   └── api/
│   │       ├── chat/
│   │       │   ├── route.ts                 # Main SSE Chat Endpoint (/api/chat)
│   │       │   └── approval/resume/route.ts # Approval confirmation resumption
│   │       ├── tools/route.ts               # Tools Directory list & connect/disconnect
│   │       ├── skills/route.ts              # Skills CRUD & search
│   │       └── artifacts/download/route.ts  # Binary artifact export (DOCX/PDF/XLSX)
│   │
│   ├── lib/
│   │   ├── gateway/                         # Model Gateway Abstraction Layer
│   │   │   ├── model-gateway.ts             # IModelGateway unified interface
│   │   │   ├── catalog.ts                   # Model Catalog & Capabilities
│   │   │   ├── stream-normalizer.ts         # Unified SSE Stream Normalizer
│   │   │   ├── adapters/
│   │   │   │   ├── anthropic-adapter.ts     # POST /v1/messages adapter
│   │   │   │   └── openai-adapter.ts        # POST /v1/chat/completions adapter
│   │   │   └── retry.ts                     # Exponential backoff for transient 429/502
│   │   │
│   │   ├── context/                         # Context Engine & Compaction
│   │   │   ├── context-assembler.ts         # Structured prompt builder with cache headers
│   │   │   ├── compactor.ts                 # Token budget manager & output pruner
│   │   │   └── brand-brain.ts               # Brand Brain loader & grounding rules
│   │   │
│   │   ├── state/                           # Deterministic Agent State Machine
│   │   │   ├── agent-state.ts               # Canonical AgentState interface
│   │   │   ├── hooks.ts                     # PreToolUse, PostToolUse, PreCompact hooks
│   │   │   ├── nodes/
│   │   │   │   ├── context-node.ts          # Context assembly & sanitization
│   │   │   │   ├── planner-node.ts          # Step 3 Planning Pass execution
│   │   │   │   ├── router-node.ts           # Model routing resolution
│   │   │   │   ├── research-node.ts         # Multi-agent research coordinator
│   │   │   │   ├── generation-node.ts       # Model streaming turn
│   │   │   │   ├── tool-loop-node.ts        # Multi-turn MCP tool-calling loop
│   │   │   │   ├── approval-node.ts         # Write action suspension & diffing
│   │   │   │   ├── artifact-node.ts         # Artifact stream interceptor & detection
│   │   │   │   └── persist-node.ts          # Supabase & audit log persistence
│   │   │   └── graph-runner.ts              # Composable state-machine runner
│   │   │
│   │   ├── tools/                           # Tool Registry & MCP Runtime
│   │   │   ├── registry.ts                  # Deferred Tool Discovery & Schema Binding
│   │   │   ├── mcp-client.ts                # @modelcontextprotocol/sdk wrapper
│   │   │   ├── built-in/
│   │   │   │   ├── google-analytics.ts      # GA4 metric reader (CAC, LTV, ROAS)
│   │   │   │   ├── meta-ads.ts              # Meta campaign manager (Write gated)
│   │   │   │   ├── hubspot.ts               # HubSpot CRM query/draft
│   │   │   │   ├── ai-search.ts             # Perplexity-style web search
│   │   │   │   └── firecrawl-scraper.ts     # Firecrawl scraping & crawling
│   │   │   └── approval-store.ts            # Redis/DB state snapshot store
│   │   │
│   │   ├── skills/                          # Skills System
│   │   │   ├── skill-catalog.ts             # Built-in catalog skills
│   │   │   └── progressive-loader.ts        # Level 1/2/3 progressive disclosure
│   │   │
│   │   └── artifacts/                       # Universal Artifact Workspace Engine
│   │       ├── stream-interceptor.ts        # Live token stream content-type detector
│   │       ├── version-store.ts             # Snapshot version history manager
│   │       ├── generators/
│   │       │   ├── docx-generator.ts        # Word document compiler
│   │       │   ├── pdf-generator.ts         # PDF report generator
│   │       │   ├── pptx-generator.ts        # PowerPoint slide deck generator
│   │       │   └── xlsx-generator.ts        # Excel spreadsheet compiler
│   │       └── exporters/
│   │           ├── google-drive.ts          # Drive export
│   │           └── approval-center.ts       # Push to Infinall Approval Center
│   │
│   └── components/                          # UI Component Tree
│       ├── workspace/
│       │   ├── split-workspace.tsx          # Resizable split-pane container
│       │   ├── chat-panel.tsx               # Left: Chat stream container
│       │   └── artifact-panel.tsx           # Right: Dynamic multi-format workspace
│       │
│       ├── chat/
│       │   ├── message-thread.tsx           # Message list with avatars & model chips
│       │   ├── message-item.tsx             # Single message (Markdown + thinking accordion)
│       │   ├── tool-execution-card.tsx      # Tool call status indicator
│       │   ├── approval-diff-card.tsx       # Human confirmation card (Approve / Reject)
│       │   └── control-bar.tsx              # Input, Attach, / Skills, Research, Model, Tools
│       │
│       ├── artifacts/
│       │   ├── doc-editor.tsx               # Tiptap Rich Markdown document editor
│       │   ├── code-sandbox.tsx             # Sandboxed <iframe> with Live/Code toggle
│       │   ├── binary-viewer.tsx            # PDF/DOCX/PPTX/XLSX preview & download card
│       │   ├── video-player.tsx             # HTML5 media player
│       │   ├── svg-viewer.tsx               # SVG graphic renderer
│       │   └── artifact-toolbar.tsx         # Tabs, Version history, Drive export
│       │
│       └── modals/
│           ├── tools-directory-modal.tsx    # 100+ Connectors Directory UI
│           └── skills-picker-popover.tsx    # Fuzzy / Skills command search
```

---

## 10. Phased Implementation Roadmap

## 8. Layer 6: Product Fidelity & Interaction Completeness (Claude Parity)

To achieve true Claude.ai parity beyond core architecture, the runtime and UI implement the 25 product fidelity invariants:

### 1. Message-Level Controls & Branching
- **Assistant Messages**: Hover toolbar with `[Copy Markdown]`, `[Regenerate / Retry]`, `[Branch Conversation]`, and model/latency metadata badge.
- **User Messages**: Inline `[Edit]` triggering dynamic branch tree creation (`version 1 of 2` pagination controls).

### 2. Live Stream Cancellation (`AbortController`)
- Floating composer transforms to `[ ■ Stop Generation ]` during active streaming.
- Triggering stop immediately cancels client `EventSource`/`fetch`, sends abort signal to the backend agent state machine, halts LLM gateway generation, and cancels pending tool promises.

### 3. Granular Streaming Status Indicators
- Smooth transition between distinct pipeline states:
  `🧠 Planning task...` $\to$ `🔍 Searching the web (3 queries)...` $\to$ `📖 Reading sources...` $\to$ `✨ Generating artifact...` $\to$ `Completed`.

### 4. Collapsible Tool Activity Accordions
- Multi-query search cards render in-stream as `⌄ Searched the web (3 searches, 8 sources)` with interactive pill tags (`HubSpot pricing`, `Salesforce updates`).
- Expandable to view individual source cards without cluttering the chat history.

### 5. Grounded Citations & Source Cards
- Web search outputs link numeric citations `[1]`, `[2]` directly to interactive source preview popovers displaying `Page Title`, `Domain Favicon`, `URL`, and `Extracted Snippet`.

### 6. Fault-Tolerant Tool Execution
- Tool timeouts, 429 rate limits, and network errors trigger non-fatal graceful degradation: agent loop notifies the model of the tool error, allowing it to retry or continue with existing context rather than crashing the chat.

### 7. Partial Tool-Call Stream Buffering
- Gateway buffers delta chunks for tool arguments (`tool_call_start` $\to$ `tool_call_delta*` $\to$ `tool_call_end`). Executes the tool dispatcher only after JSON schema validation via Zod succeeds.

### 8. Parallel Multi-Tool Invocations
- When the model returns multiple independent `tool_use` blocks in a single turn, the dispatcher runs `Promise.all(toolCalls.map(executeTool))` concurrently.

### 9. Hard Agent Safety Guards
- Configurable circuit breakers:
  - `MAX_TURNS = 10`
  - `MAX_TOOL_CALLS_PER_TURN = 5`
  - `TOOL_TIMEOUT_MS = 15000`
  - `TOTAL_REQUEST_TIMEOUT_MS = 120000`

### 10. Intelligent Context Compaction & Truncation
- Tool outputs capped and summarized if exceeding token limits (preventing 50k token web dumps into context).
- Prompt cache prefix order strictly maintained across tool iterations.

### 11. Multimodal Attachment Lifecycle
- Drag-and-drop / file picker for Images (`PNG`, `JPG`, `WebP`), Documents (`PDF`, `DOCX`, `CSV`, `XLSX`), and Video/Audio transcripts.
- Interactive attachment chips with upload progress, preview thumbnails, and remove buttons.

### 12. Voice Input State Machine
- Dynamic microphone states: `idle` $\to$ `recording (live audio waveform)` $\to$ `processing` $\to$ `transcribed into composer`.

### 13. Comprehensive Artifact Workspace Controls
- Top navigation bar for the split-screen panel:
  - `[Live Preview]` | `[Code / Raw]` toggle
  - `[Copy Content]`
  - `[Download File]` (.html, .md, .docx, .pdf, .pptx, .xlsx)
  - `[Fullscreen Expand]`
  - `[Version History ▾]` (v1, v2 with one-click revert)
  - `[Close Workspace ✕]`

### 14. Realtime Progressive Artifact Streaming
- Artifacts open the split pane immediately on `artifact_open` and stream code/content live in real-time (`artifact_delta`), with the sandbox preview updating progressively.

### 15. Sandboxed Artifact Security (Zero Auth Leakage)
- Rendered in isolated `<iframe>` with strict CSP: `sandbox="allow-scripts"`.
- Artifact execution environment has zero access to parent cookies, auth tokens, or localStorage.

### 16. Dynamic Model Switcher & Metadata
- Dropdown chip in composer (`Claude Sonnet 4.6`, `Claude Opus 5`, `GPT-5.6`, `Auto Router`).
- Selected model and token usage propagate dynamically through every turn.

### 17. Telemetry & Token Usage Tracking
- Realtime tracking of `Prompt Tokens`, `Completion Tokens`, `Cache Read / Write Hits`, and `Roundtrip Latency (ms)` displayed in debug inspectors.

### 18. Gateway Retry & Resilient Fallback
- Automatic exponential backoff for transient 502/503 errors on the primary model, with optional fallback routing to secondary provider models without losing conversation context.

### 19. Full Conversation Persistence
- Client and local state management for conversation history, active artifact versions, and tool traces surviving page refreshes.

### 20. High-Fidelity Mutation Approval Gate
- Interactive modal/card for write tools (Meta Ads, Slack, CRM updates) detailing: Target Account, Campaign Parameters, Budget Diffs, and `[Reject]` / `[Approve & Execute]` actions.

### 21. Idempotent & Expiring Approvals
- Execution tokens cryptographically bound to specific tool arguments with a 5-minute TTL to prevent replay attacks or double-spend mutations.

### 22. Agent Event Stream & Trace Log
- Full real-time telemetry stream emits debug events (`REQUEST`, `PLAN`, `TOOL_DISCOVERED`, `TOOL_CALL`, `TOOL_RESULT`, `ARTIFACT_UPDATE`, `DONE`) accessible via debug drawer.

### 23. Interactive Slash `/` Command Menu
- Typing `/` in composer opens a floating command palette with fuzzy search across marketing skills (`/copywriting`, `/competitor-audit`, `/ad-creative`, etc.).

### 24. Deferred Tool Discovery Index
- Lightweight catalog exposed to the planner; full tool schemas lazily injected only when selected.

### 25. Privacy-Preserving Reasoning vs Status UX
- Internal model chain-of-thought is sanitized into high-level user-facing activity badges (`Thought for 8s ▾`, `Searching web`, `Synthesizing report`), ensuring private system prompts are never leaked.

### 26. Micro-Interactions & Polish
- **Smart Auto-Scroll**: Streams pin to bottom unless user manually scrolls up (scroll-lock).
- **Keyboard Ergonomics**: `Enter` = Send, `Shift + Enter` = Newline, `Cmd/Ctrl + K` = New Chat, `Esc` = Close modal/artifact.
- **Syntax Highlighting**: Shiki / Prism code blocks with 1-click copy feedback.
- **Resizable Split Pane**: Smooth drag-handle between chat and artifact workspace.

  PHASE 1: Core Foundation & Vertical Slice
  ├─ Setup Next.js + TypeScript + Tailwind + shadcn
  ├─ Build Canonical Model Gateway (Anthropic /v1/messages + OpenAI /v1/chat)
  ├─ Implement Context Engine with Prompt Caching Prefix Order
  ├─ Implement Step 3 Planning Pass with strict JSON validation
  ├─ Build Claude-Style Split-Screen Workspace + SSE Chat Stream
  └─ Verify basic model streaming & thinking accordion in UI

  PHASE 2: Agent Harness & Tool Execution Loop
  ├─ Implement Deferred Tool Discovery Registry (MCP + Built-in GA4/Meta/Search)
  ├─ Build Multi-turn Agent Loop (Turn 1..5) with tool_use and tool_result
  ├─ Implement Mutation Approval Gate (executionId + diff preview cards)
  ├─ Build Lifecycle Hooks (PreToolUse, PostToolUse)
  └─ Implement /api/chat/approval/resume endpoint

  PHASE 3: Universal Artifacts Workspace & Document Generators
  ├─ Build live Artifact Stream Interceptor (<antArtifact> / markdown)
  ├─ Implement Tiptap Rich Markdown Document Editor with version snapshots
  ├─ Implement Sandboxed Iframe with Live / Code view toggle
  ├─ Implement Binary Document Generators (DOCX, PDF, PPTX, XLSX)
  ├─ Implement Video Player & SVG Viewer
  └─ Build Google Drive & Approval Center export actions

  PHASE 4: Progressive Skills, Subagent Research & Multimodal
  ├─ Build 3-level Progressive Disclosure Skills (/ Skills picker + auto-match)
  ├─ Implement Research Mode with isolated Subagent Orchestrator
  ├─ Build 100+ Tools Directory Modal with category filtering
  └─ Implement Multimodal upload handlers (Images, Docs, Audio transcription)
```

---

*This document defines the complete, state-of-the-art Claude-tier agentic architecture for Infinall Chat.*
