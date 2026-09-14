# Product Requirements Document
## Feature: Infinall Chat — "The Claude for Marketers"
### A Phase 1 Feature of Infinall.ai

**Document Owner:** Principal AI Product Manager / Systems Architect
**Version:** 2.0 (revised — repositioned as a native Infinall.ai feature, scoped to confirmed Phase 1 feature set)
**Status:** Ready for Engineering Kickoff

---

## 1. Executive Summary & Core Value Proposition

### 1.1 What Infinall Chat Is

Infinall Chat is not a standalone product — it is a native, deeply integrated feature **inside Infinall.ai**, sitting alongside the existing Brand Brain / four-agent pipeline (Intelligence, Strategy, Script, Creative) and Approval Center. It gives Infinall's users a general-purpose AI workspace, purpose-built for marketing work, without leaving the platform.

**Positioning:** *"The Claude for Marketers."* Where Claude.ai is a horizontal assistant for anyone, Infinall Chat is a vertical assistant that already knows the user's brand, has 100+ marketing tools wired in, and can research, write, and build campaign assets in one conversation.

### 1.2 Target Audience

Same core Infinall audience — bootstrapped B2B SaaS founders and marketers — but specifically the subset that wants a **conversational workspace** on top of Infinall's existing automation pipeline, for tasks that don't fit neatly into the fixed agent pipeline (ad-hoc research, drafting, one-off asset generation, tool-driven busywork).

### 1.3 Competitive Edge

- **Context Infinall already has, that Claude.ai doesn't**: Brand Brain data, prior campaign history, approved brand assets — usable as grounding context automatically, with no manual upload.
- **100+ marketing tool connections out of the box** (Section 5) — a generic AI chat product has zero; Infinall Chat launches wired-in.
- **Model choice without leaving the workflow** — auto-routed or manually picked, so cost/quality trade-offs are in the user's hands.

---

## 2. Model Selector

Phase 1 ships a **model dropdown** in the chat control bar with the following options:

| Option | Behavior |
|---|---|
| **Auto** | System routes each request to the best-fit model based on task type (coding/structured tool calls vs. long-form reasoning vs. cheap/fast tasks) |
| **Claude Sonnet 4.6** | Forces Sonnet 4.6 — best default for marketing copy, structured drafts, and fast agentic tool-calling |
| **Claude Opus 5** | Forces Opus 5 — for deep, multi-step reasoning (e.g., full GTM strategy synthesis, multi-source research consolidation) |
| **GPT-5.6** | Forces GPT-5.6 — alternate frontier option, useful for cross-checking or when a task benefits from a different model's style/strengths |

**Confirmed:** this is the final Phase 1 model roster — Auto, Sonnet 4.6, Opus 5, GPT-5.6. No additional models are in scope.

**Auto-routing default logic (Phase 1, simple version — no need for the full weighted-scoring router from v1 yet):**

| Task Signal | Routed To |
|---|---|
| Ad copy, email drafts, short-form content, tool-call-only requests | Sonnet 4.6 |
| Multi-step campaign strategy, long research synthesis, ambiguous/high-stakes asks | Opus 5 |
| User wants a second opinion / comparison | GPT-5.6 (on demand, not auto-selected) |

A small model-name chip under each response shows which model actually generated it, regardless of Auto or manual selection — keeps trust and debuggability intact even as Auto-routing logic gets smarter later.

---

## 3. Agentic Web Retrieval (Search, Scrape, Crawl — On-Demand Tool Use)

Per your note, this is **not** a separate mode the user has to pick — it's a **connected tool** the model reaches for automatically when a request requires it, the same way any agentic tool-call works.

### 3.1 Design Principle

The model doesn't ask "should I search?" as a UI toggle — it decides during its own reasoning pass, the same way it would decide to call any other connected tool (Section 5). The user just asks a question; retrieval happens transparently, in-line.

### 3.2 Trigger Logic

| Signal in User Request | Tool Invoked |
|---|---|
| Needs current/external information not in Brand Brain or model knowledge ("what's Competitor X doing right now") | **AI Search** (Perplexity-style conversational answer engine, cited) |
| Needs structured content from a specific known site (competitor's pricing page, a target account's blog, a docs site) | **Web Scraping** (Firecrawl-style — converts the page to clean Markdown/JSON) |
| Needs multiple pages across a domain, or a full site audit (e.g., "map out Competitor X's entire content strategy") | **Web Crawling** (multi-page Firecrawl job) |

### 3.3 Execution Flow

```
User message
     │
     ▼
Model reasoning pass → decides retrieval is needed
     │
     ▼
Tool call dispatched (search / scrape / crawl — chosen per 3.2)
     │
     ▼
Retrieved content returned to model context
     │
     ▼
Model synthesizes final answer, inline citations shown
```

This keeps the chat interface simple — no mode toggle required for this layer — while still giving the model real-time web access whenever a request needs it.

---

## 4. Research Mode

A distinct, user-selectable mode (toggle in the control bar) for when the user explicitly wants a **structured research pass**, rather than a single conversational answer.

### 4.1 Behavior

- Triggers a **multi-step research plan**: breaks the request into sub-questions, dispatches AI Search + Web Scraping/Crawling (Section 3) across multiple targets in parallel, and consolidates results into one structured research output.
- Distinct from the always-on retrieval in Section 3 in that it's **deliberately deeper and multi-source by default** — meant for "research this company/competitor/market for me" style requests, not quick fact lookups.
- Output includes a source list distinguishing official/primary sources (scraped) from aggregated commentary (AI Search).

### 4.2 Example Flow (Competitor Research)

```
User enables Research Mode → "Research Competitor X and their recent positioning"
     │
     ▼
Plan: [AI Search: broad news/sentiment] + [Scrape: competitor's own site/pricing/blog]
     │
     ▼
Parallel execution → consolidation pass (dedupe, flag conflicts, source-trust weighting)
     │
     ▼
Structured research output delivered in chat, optionally exportable as an Artifact (Section 5)
```

---

## 5. Artifacts (Docs, Code, and Media)

Per your update, Artifacts are **not** limited to documents — Phase 1 now targets the same breadth Claude's Artifacts support: documents, HTML/code, and video/media rendering, all inside the same side-panel workspace.

### 5.1 Artifact Types

| Type | What It Covers | Renderer |
|---|---|---|
| **Document** | Research reports, campaign briefs, positioning docs, blog drafts, email sequences | Rich text/markdown editor (Section 9.2), editable in place |
| **HTML / Code** | Landing page snippets, email HTML, embeddable widgets, ad creative mockups the model generates as code | Sandboxed iframe execution (Sandpack-style), with a Live/Code toggle — same isolation model as a code-artifact system: no access to the parent app's cookies or DOM |
| **Video** | Uploaded or generated video content (e.g., a generated video ad concept, or a user-uploaded reference video the model discusses) | Inline `<video>` player rendered directly in the artifact panel, with standard playback controls |
| **SVG / Image** | Simple graphics, diagrams the model generates | Inline SVG/image renderer |

### 5.2 Detection & Rendering Pipeline

The same **markdown/content interceptor** from Section 9 detects the artifact type as the model streams its response and routes it to the correct renderer:

```
Model output stream
      │
      ▼
Content-type detection (fenced code block language, or a video/doc content marker)
      │
      ├── ```html / ```jsx  → Sandboxed iframe renderer (Live/Code toggle)
      ├── ```svg            → Inline SVG renderer
      ├── long-form prose   → Document editor panel
      └── video reference   → Inline video player
```

### 5.3 Version History & Tabs

- Every artifact (of any type) is versioned — each regeneration or user edit is a snapshot with the ability to revert, same as originally scoped for docs.
- Multiple artifacts generated in one session are tabbed in the side panel (e.g., "Landing Page.html," "Campaign Brief.md," "Ad Concept.mp4") rather than overwriting one another.

### 5.4 Export Options

- **Export to Google Drive** (broadened from Google Docs only) — documents export as Google Docs, HTML/code artifacts export as files into the user's Drive, video artifacts export as file uploads to Drive.
- Copy as Markdown (documents) or copy raw code (HTML/code artifacts).
- Send directly into Infinall's existing Approval Center workflow — unchanged from the original scope.

### 5.5 UI Layout

Same split-screen pattern throughout — chat on the left, artifact workspace on the right — with the right panel's renderer switching based on the active artifact's type (document editor, sandboxed code preview, or video player), and a tab strip when a session has produced more than one artifact.

---

## 6. 100+ Marketing Tool Connections (via MCP)

### 6.1 Approach

Confirmed: all 100+ tool connections are built on **MCP** — Infinall Chat acts as an MCP client, connecting to an MCP server per tool/category, exactly like the original architecture proposed. No bespoke one-off integrations.

| Category | Example Tools | Access Pattern |
|---|---|---|
| Ad Platforms | Meta Ads, Google Ads, LinkedIn Ads | Read campaign data, draft/queue new creative (write actions gated behind user approval) |
| Analytics | Google Analytics, Mixpanel, PostHog | Read-only query access |
| CRM / Outreach | HubSpot, Salesforce, Apollo | Read contact/deal data; draft outreach content |
| Social / Content | Buffer, Hootsuite, Notion, Google Docs | Read/write with approval gate on publish actions |
| Communication | Slack, Gmail | Draft messages; send requires explicit approval |

### 6.2 Connector UX — Modeled on Claude.ai's Connectors Pattern

Per your direction, the in-app experience for browsing and enabling these 100+ tools mirrors how Claude.ai's own **Settings → Connectors** feature works, adapted to Infinall's marketing context:

| Claude.ai Connectors Pattern | Infinall Chat Equivalent |
|---|---|
| A **Connectors directory** listing verified (Anthropic-built/reviewed) and community connectors | An **Infinall Tools Directory** listing Infinall-verified marketing tool connectors (the 100+), browsable/searchable by category (Ads, Analytics, CRM, Social, Comms) |
| Settings → Connectors page for adding/managing connections, separate from any one chat | A dedicated **Tools** settings page in Infinall.ai for connecting/managing tools account-wide |
| "Add custom connector" via server URL + OAuth flow, for connectors outside the built-in directory | Same pattern reserved for **advanced/enterprise users** who want to point Infinall Chat at their own internal MCP servers (e.g., a proprietary internal tool) |
| No fixed order — user browses the directory and connects whatever they need | **Confirmed:** no forced onboarding priority — the full directory is open from day one, and users self-select which tools to connect based on their own stack |

**Important distinction from Claude.ai, per your correction:** Claude.ai lets a user toggle individual connectors on/off per conversation. Infinall Chat does **not** require that manual step. Once a tool is connected (Section 6.2 above), it's available across every chat — the model itself decides, at reasoning time, which connected tool(s) a given request actually needs, the same agentic on-demand pattern as the web-retrieval layer in Section 3. The user's only job is connecting a tool once; after that, invocation is automatic.

### 6.2a Automatic Tool Selection — Execution Flow

```
User message
     │
     ▼
Model reasoning pass → identifies task needs external tool data/action
     │
     ▼
Model checks the user's connected tools (full directory, not a per-chat subset)
     │
     ▼
Model selects the correct connected tool(s) for the task
   (e.g., "pull last month's CAC" → Google Analytics/Mixpanel connector,
    not Slack or CRM)
     │
     ▼
MCP tool call dispatched → result returned to model context
     │
     ▼
Read actions execute directly; write/publish actions pause for approval (6.3)
```

This mirrors how the always-on web retrieval layer in Section 3 works: the user never manually flips a switch for "use Google Analytics now" — they just ask, and the model resolves which connected tool answers it.

### 6.3 Connection & Trust Model

- Each tool connection is authorized per-user via OAuth, stored in an encrypted credential vault — never exposed to the model directly (the model only sees tool names/schemas, same boundary Claude.ai itself keeps between the model and connector credentials).
- **Read actions** (pulling analytics, campaign data, CRM records) execute without per-call approval once a tool is connected.
- **Write/publish actions** (sending a message, launching an ad, publishing a post) always require an explicit in-chat approval step, shown as a diff/preview before it executes — consistent with the approval-gate pattern already used elsewhere in Infinall's workflow (Approval Center).
- The Tools directory page shows connection status per tool — connected/disconnected, last-used timestamp, and a one-click revoke.

### 6.4 Phase 1 Engineering Scope

Since users self-select from an open directory (no forced sequencing), Phase 1 engineering effort is entirely on building the **generic MCP connector framework and the directory UI** once — after that, adding each of the 100+ tools is a matter of registering its MCP server in the directory, not building bespoke logic per tool.

---

## 7. Control Bar — Updated Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [Attach]   [Research Mode: Off/On]        [Model: Auto ▾]  [Send]│
│  [🔧 Tools connected: 12]                                          │
└──────────────────────────────────────────────────────────────────┘
```

- **Research Mode** is a simple on/off toggle (not a sub-menu) — per Section 4, since search/scrape/crawl underneath it are auto-invoked, not separately selectable by the user.
- **Model dropdown** as specified in Section 2.
- **Tools indicator** is informational only, not a per-chat toggle — it shows how many of the 100+ directory tools this account has connected, and links to the Tools settings page to connect more. Which connected tool gets used in a given message is decided by the model, not chosen in the control bar (Section 6.2a).

---

## 9. Technical Requirements (TRD) — Tech Stack

This section specifies the concrete technical stack for Phase 1, reusing Infinall.ai's existing infrastructure wherever possible (Next.js/Tailwind frontend, Supabase, Stripe billing, AWS Bedrock model access) rather than introducing a parallel stack.

### 9.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Infinall.ai (Next.js)                     │
│   Existing: Brand Brain / 4-agent pipeline / Approval Center      │
│   New: Infinall Chat UI (chat + doc artifact split-screen)        │
└───────────────────────────┬───────────────────────────────────────┘
                             │ HTTPS / REST + streaming (SSE)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Infinall Chat API Layer                       │
│   Model Router  │  MCP Client Runtime  │  Research Orchestrator   │
└───┬─────────────┴──────────┬───────────┴───────────┬─────────────┘
    │                        │                        │
    ▼                        ▼                        ▼
┌─────────┐        ┌──────────────────┐      ┌──────────────────────┐
│ Model    │        │ MCP Servers        │      │ Research APIs         │
│ Gateway  │        │ (100+ tool         │      │ Perplexity + Firecrawl│
│ (9.4)    │        │  connectors, 9.5)  │      │ (9.6)                 │
└─────────┘        └──────────────────┘      └──────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  AWS Bedrock (Claude, Llama, DeepSeek)   │   OpenAI API (GPT-5.6)  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Frontend

| Component | Stack | Notes |
|---|---|---|
| Framework | Next.js (App Router), React | Matches existing Infinall.ai landing/app codebase — no new framework introduced |
| Styling | Tailwind CSS + shadcn/ui | Matches existing brand system (violet-to-orange gradient identity) |
| Chat streaming | Server-Sent Events (SSE) or WebSocket, token-by-token | Needed for the streaming markdown interceptor that opens doc Artifacts (Section 5) as they generate |
| Doc artifact editor | A rich-text/markdown editor component (e.g., Tiptap or Lexical) | Powers the Section 5 side-panel document workspace with edit + version history |
| State management | React Server Components + client state (Zustand or React Context) | Keep it lightweight — Phase 1 doesn't need a heavy global store |

### 9.3 Backend / API Layer

| Component | Stack | Notes |
|---|---|---|
| API runtime | Node.js (NestJS or Fastify) | Consistent with a TypeScript-first stack if Infinall's existing backend is Node-based; confirm against current backend before locking |
| Auth | Supabase Auth | Reuse existing Infinall.ai auth — no separate login system for Infinall Chat |
| Primary database | Supabase (PostgreSQL) | Reuse existing Supabase project; new tables for chat sessions, doc artifacts, tool connections, and MCP credential references |
| File/object storage | Supabase Storage (or S3 if already provisioned) | Stores exported documents, attachments |
| Background jobs | BullMQ (Redis-backed) | Handles async Research Mode jobs (Section 4) and multi-page Firecrawl crawl jobs (Section 3) without blocking chat responses |

### 9.4 Model Gateway & Inference Layer

**Accuracy note:** AWS Bedrock hosts Anthropic's Claude models and Meta's Llama models directly (and has added select third-party models like DeepSeek via the Bedrock Marketplace). It does **not** host OpenAI's proprietary GPT models — those are only available via OpenAI's own API (or Azure OpenAI Service). The gateway below is designed around that real constraint.

| Model | Access Path | Notes |
|---|---|---|
| Claude Sonnet 4.6, Claude Opus 5 | **AWS Bedrock** | Already in progress per your existing Bedrock model access request — reuse that same Bedrock account/IAM setup |
| GPT-5.6 | **OpenAI API directly** (not Bedrock) | Requires its own API key and billing relationship with OpenAI, separate from the Bedrock account |

**Confirmed roster:** only these three models plus Auto-routing between them — no additional model is in Phase 1 scope.

**Model Gateway Service:** a thin internal abstraction layer so the rest of the app (router, chat handler) calls one unified interface (`generate(model, messages, tools)`) regardless of whether the underlying call goes to Bedrock's `InvokeModel`/`Converse` API or OpenAI's `chat/completions` API. This is what makes the Section 2 model-swap and fallback logic possible without leaking provider-specific code into the application layer.

### 9.5 MCP Connector Framework (100+ Tools)

| Component | Stack | Notes |
|---|---|---|
| MCP transport | JSON-RPC 2.0 over HTTP/SSE (remote servers) | Standard MCP spec — matches how Claude.ai's own remote connectors work (Section 6.2) |
| MCP client SDK | Official Anthropic MCP TypeScript SDK (`@modelcontextprotocol/sdk`) | Open-source, avoids building the protocol layer from scratch |
| Connector hosting | Managed MCP servers per tool category, deployed as containerized services (one per tool or shared per category, e.g., one "ads" MCP server handling Meta/Google/LinkedIn) | Keeps the 100+ tools from requiring 100+ separately deployed services where categories can share a server |
| Credential vault | AWS Secrets Manager or HashiCorp Vault | Stores per-user OAuth tokens for each connected tool; never passed into model context directly |
| Tool registry / directory data | Supabase table: `mcp_connectors` (tool name, category, server endpoint, verification status) | Backs the Tools directory UI (Section 6.2) |

### 9.6 Research & Retrieval Layer

| Component | Stack | Notes |
|---|---|---|
| Conversational search | Perplexity API | As specified in Section 3 |
| Structured scraping/crawling | Firecrawl API | As specified in Section 3 |
| Orchestration | Handled inside the Backend API layer (9.3) via BullMQ jobs for multi-target Research Mode requests | Keeps long-running research jobs off the synchronous chat request path |

### 9.7 Data Layer Summary

| Data Type | Storage |
|---|---|
| User accounts, sessions, billing | Supabase (existing) |
| Chat messages/history | Supabase (new tables) |
| Doc artifacts + version history | Supabase (metadata) + Supabase Storage/S3 (content blobs) |
| Tool connection records + credentials | Supabase (metadata only) + Secrets Manager/Vault (actual secrets) |
| Brand Brain data (existing) | Reused as-is — Infinall Chat reads from it, does not duplicate it |

### 9.8 Observability & Security

| Component | Stack | Notes |
|---|---|---|
| Logging/tracing | OpenTelemetry → existing Infinall observability stack if one exists, otherwise Grafana/Prometheus or a hosted option (e.g., Datadog) | Tracks model latency per provider, MCP tool-call success/failure, research job duration |
| Approval-gate audit log | Supabase table logging every write/publish action, who approved it, and the diff shown | Required for the approval-gate pattern in Sections 5, 6.3 |
| Secrets management | AWS Secrets Manager (aligns with Bedrock being on AWS already) | Single cloud provider for both inference and secrets reduces operational surface area |

### 9.10 Prompt Processing & Reasoning Pipeline (Full Implementation Detail)

This is the exact lifecycle of a single user message, from keystroke to rendered response — the concrete mechanics behind Sections 2–6, not a restatement of them.

#### 9.10.1 High-Level Request Lifecycle

```
[1] Frontend sends message
        │
        ▼
[2] Context Assembly Service
        │  (Brand Brain data, chat history, connected tools list, prior artifacts)
        ▼
[3] Reasoning / Planning Pass  ← "thinking" step
        │  (single model call: classifies task, decides model + tools needed)
        ▼
[4] Router Decision (Section 2 rules applied)
        │
        ▼
[5] Agentic Tool-Use Loop (0 to N iterations)
        │  (MCP tool calls, web retrieval, research jobs — Sections 3/4/6)
        ▼
[6] Final Response Generation (streamed)
        │
        ▼
[7] Post-Processing
        │  (markdown interceptor → doc artifact detection, citation formatting)
        ▼
[8] Approval Gate Check (only if a write/publish action was requested)
        │
        ▼
[9] Persist + Log (chat history, audit log, observability)
```

#### 9.10.2 Step 2 — Context Assembly (Concrete Payload)

Before any model call, the backend assembles a structured context object. This is **not** free text pasted into the prompt — it's built as discrete, labeled blocks so the model can distinguish "brand facts" from "chat history" from "tool results":

```json
{
  "session_id": "sess_8841",
  "user_id": "usr_2210",
  "brand_context": {
    "source": "brand_brain",
    "fields": ["brand_voice", "icp_summary", "recent_campaigns"]
  },
  "chat_history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "connected_tools": ["google_analytics", "hubspot", "meta_ads"],
  "active_artifact": { "id": "art_502", "type": "doc", "title": "Q3 GTM Brief" }
}
```

`connected_tools` here is the **full list** of the user's connected MCP tools (per Section 6.2a) — it is passed to the model as available options, not pre-filtered by the backend, so tool selection stays a model reasoning decision, not a hardcoded rule.

#### 9.10.3 Step 3 — The Reasoning/Planning Pass

This is the step you were missing clarity on. It is a **real, separate model call** (not implicit) using Claude's extended thinking capability, with a constrained system prompt whose only job is to output a structured plan before any user-facing generation happens:

```json
// Planning call — request
{
  "model": "claude-sonnet-4-6",
  "system": "You are a routing and planning module. Given the user request and available tools, output ONLY a JSON plan. Do not answer the user yet.",
  "extended_thinking": { "enabled": true, "budget_tokens": 2000 },
  "messages": [
    { "role": "user", "content": "<assembled context from 9.10.2 + user's new message>" }
  ]
}

// Planning call — expected structured output
{
  "task_type": "research_synthesis",
  "complexity": "high",
  "recommended_model": "claude-opus-5",
  "requires_web_retrieval": true,
  "requires_research_mode": true,
  "candidate_tools": ["google_analytics", "hubspot"],
  "requires_doc_artifact": true
}
```

This plan object is what actually drives Section 2's router table and Section 6.2a's tool selection — those sections describe the *policy*; this is the *mechanism* that produces the decision the policy is applied to.

**Why a separate pass instead of one big call:** it lets a **cheap, fast model** (or a lightweight call to the same model with a small thinking budget) make the routing decision before committing to an expensive Opus-class generation, and it gives you a debuggable, loggable artifact (the plan JSON) for every request — critical for tuning the router over time.

#### 9.10.4 Step 5 — Agentic Tool-Use Loop (Concrete Mechanics)

Once the plan says tools are needed, the backend enters a standard tool-use loop against the Anthropic Messages API (or OpenAI's equivalent, if GPT-5.6 was selected). This is the real Claude tool-calling pattern — not a custom protocol:

```json
// Turn 1 — model requests a tool call
{
  "role": "assistant",
  "content": [
    { "type": "thinking", "thinking": "Need last month's CAC before answering..." },
    { "type": "tool_use", "id": "toolu_01", "name": "google_analytics.query", "input": { "metric": "CAC", "range": "last_30_days" } }
  ]
}

// Backend dispatches this as an MCP JSON-RPC call to the google_analytics MCP server,
// gets a result, and sends it back as a tool_result:
{
  "role": "user",
  "content": [
    { "type": "tool_result", "tool_use_id": "toolu_01", "content": "CAC: $214, up 6% MoM" }
  ]
}

// Turn 2 — model either calls another tool, or proceeds to final generation
```

This loop repeats until the model stops requesting tools and returns a final text response — the backend's job is purely to dispatch `tool_use` blocks to the matching MCP server and feed `tool_result` blocks back in, per turn.

#### 9.10.5 Worked End-to-End Example

**User prompt:** *"Pull last month's CAC and draft a one-pager explaining the trend to my team."*

| Stage | What Happens | Data Produced |
|---|---|---|
| Context Assembly | Loads Brand Brain, connected tools (`google_analytics`, `hubspot`, `slack`) | Context JSON (9.10.2) |
| Planning Pass | Classifies as `data_pull + doc_generation`, complexity medium | `{"recommended_model": "claude-sonnet-4-6", "candidate_tools": ["google_analytics"], "requires_doc_artifact": true}` |
| Router | Sonnet 4.6 selected per Section 2 table (structured, tool-call-heavy task) | Model = Sonnet 4.6 |
| Tool Loop | Model calls `google_analytics.query` → gets CAC figure → no further tools needed | 1 tool round-trip |
| Generation | Model writes the one-pager as markdown | Streamed text |
| Post-Processing | Markdown interceptor detects long-form doc structure → opens as Doc Artifact (Section 5) | `art_503` created |
| Approval Gate | Not triggered — this was a read-only pull + doc draft, no publish action | N/A |
| Persist + Log | Chat history saved; plan JSON + tool calls logged for observability | Audit trail entry |

#### 9.10.6 Latency Budget (Design Target, Phase 1)

| Stage | Target Latency |
|---|---|
| Context Assembly | <150ms (cached Brand Brain/tool-list lookups) |
| Planning Pass | 400–800ms (small thinking budget, fast model) |
| Per tool-loop round-trip | 300ms–2s depending on MCP server (analytics APIs are slower than simple lookups) |
| Final generation (streaming starts) | <1s time-to-first-token after planning completes |

This budget is what determines whether the Planning Pass (9.10.3) is worth the extra round-trip: it adds under a second up front but prevents misrouted requests from wasting a multi-second Opus-class generation on a task that only needed Sonnet — that trade-off is the actual justification for having Step 3 as its own explicit stage rather than folding it into the main generation call.

### 9.11 Phase 1 Tech Stack — Summary Table

| Layer | Choice |
|---|---|
| Frontend | Next.js, React, Tailwind CSS, shadcn/ui |
| Doc editor | Tiptap or Lexical |
| Backend API | Node.js (NestJS/Fastify) |
| Auth & Database | Supabase (Auth + Postgres + Storage) |
| Background jobs | BullMQ + Redis |
| Model inference | AWS Bedrock (Claude Sonnet 4.6, Claude Opus 5, Llama/DeepSeek) + OpenAI API (GPT-5.6) |
| MCP framework | `@modelcontextprotocol/sdk`, containerized per-category connector servers |
| Secrets vault | AWS Secrets Manager |
| Research APIs | Perplexity API, Firecrawl API |
| Observability | OpenTelemetry + Grafana/Prometheus or Datadog |

---

## 11. Chat History & Session Management

### 11.1 Behavior

- Every conversation is a persistent **session**, auto-saved after every message (not on explicit "save") — same expectation users have from Claude.ai or ChatGPT.
- Sessions are listed in a sidebar, grouped by recency (Today / Yesterday / Last 7 Days / Older), each showing an auto-generated title (derived from the first user message via a cheap summarization call).
- Users can **rename**, **delete**, and **pin** a session.
- Reopening a session restores full context: chat messages, any doc artifacts created in it, and which tools/model were used — so the model can pick the conversation back up with full continuity.
- **Search across history** — a search bar that queries both session titles and message content.

### 11.2 Data Model

```sql
-- sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_model_used TEXT,
  archived BOOLEAN DEFAULT FALSE
);

-- messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content JSONB NOT NULL,           -- stores text, tool_use, tool_result blocks as structured JSON
  model_used TEXT,                  -- which model generated this specific message (Section 2 chip)
  created_at TIMESTAMPTZ DEFAULT now(),
  sequence_number INT NOT NULL      -- guarantees correct ordering under concurrent writes
);

CREATE INDEX idx_messages_session ON chat_messages(session_id, sequence_number);
CREATE INDEX idx_sessions_user_recency ON chat_sessions(user_id, updated_at DESC);
```

### 11.3 Search Implementation

- Phase 1: **Postgres full-text search** (`tsvector`/`tsquery` on `chat_messages.content` and `chat_sessions.title`) — no need for a separate search infrastructure at this stage.
- A generated column keeps the search index current without extra application code:

```sql
ALTER TABLE chat_messages ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content->>'text')) STORED;
CREATE INDEX idx_messages_search ON chat_messages USING GIN (content_tsv);
```

- Deferred to Phase 2: semantic (embedding-based) search over history, if keyword search proves insufficient — would reuse the same pgvector infrastructure already recommended for the doc-artifact store if that's added later.

### 11.4 Retention & Privacy

- Sessions are retained indefinitely by default, with a user-facing **"Delete session"** and **"Delete all history"** control (soft delete: `archived = true` for 30 days, then hard-deleted by a scheduled job, giving an undo window).
- Tool call inputs/outputs inside `chat_messages.content` follow the same encryption-at-rest as the rest of the Supabase database — no separate handling needed since they're stored in the same table.

---

## 12. Minor Features (Phase 1 Add-Ons)

Small but expected features that round out the chat experience:

| Feature | Behavior |
|---|---|
| **Stop generation** | A stop button appears while streaming; halts the model call and MCP tool loop immediately, keeping partial output |
| **Regenerate response** | Re-runs the last assistant turn, optionally with a different model selected from the dropdown |
| **Edit & resend** | Editing a past user message forks the conversation from that point (prior assistant responses after it are superseded, not deleted — kept in history as a branch) |
| **Copy message / copy code block** | Standard copy-to-clipboard on both full messages and individual code/doc blocks |
| **Keyboard shortcuts** | New chat (`Cmd/Ctrl+K`), send (`Enter`), newline (`Shift+Enter`), stop generation (`Esc`) |
| **Session rename & pin** | Covered in Section 11.1 |
| **Export session** | Export a full session transcript as Markdown or PDF |
| **Model chip on every message** | Already specified in Section 2 — listed here as it's part of this same UI surface |

---

## 13. Deeper Technical Architecture — Implementation Blueprint

This section goes one level below Section 9's stack choices into how the system is actually assembled and run.

### 13.1 Service Boundaries

Phase 1 is built as a small number of clearly-separated services, not a single monolith and not full microservices — right-sized for a Phase 1 team:

| Service | Responsibility | Deployment Unit |
|---|---|---|
| **Web App** | Next.js frontend (chat UI, doc artifact editor, existing Infinall.ai pages) | Single Next.js deployment (Vercel or existing Infinall hosting) |
| **Chat API Service** | Context assembly, planning pass, router, streaming response orchestration (Section 9.10) | Node.js service, containerized (ECS/Fargate or existing Infinall backend infra) |
| **MCP Gateway Service** | Hosts/proxies MCP connector servers, manages tool call dispatch and credential injection | Separate containerized service — isolated from Chat API for security (credential handling lives here, not in the chat request path) |
| **Job Worker Service** | BullMQ workers for Research Mode jobs, multi-page Firecrawl crawls, history cleanup jobs | Containerized worker pool, scales independently of the request-serving services |

Splitting the **MCP Gateway** out from the **Chat API** is a deliberate security boundary: the Chat API never holds decrypted OAuth tokens — it only ever sends `tool_use` requests to the MCP Gateway and receives `tool_result` payloads back. If the Chat API is ever compromised, tool credentials aren't exposed.

### 13.2 Request Sequence (Concrete Call Sequence)

```
Client                Chat API              MCP Gateway        Model Provider (Bedrock/OpenAI)
  │  POST /chat           │                       │                        │
  │──────────────────────►│                       │                        │
  │                        │  assemble context     │                        │
  │                        │  (Supabase reads)     │                        │
  │                        │                       │                        │
  │                        │  planning call ───────┼───────────────────────►│
  │                        │◄──────────────────────┼────────────────────────│
  │                        │  (plan JSON)          │                        │
  │                        │                       │                        │
  │                        │  main generation call ┼───────────────────────►│
  │                        │◄──────────────────────┼── tool_use block ──────│
  │                        │  dispatch tool call ──►│                        │
  │                        │                       │  calls MCP server       │
  │                        │◄──────────────────────│  tool_result           │
  │                        │  send tool_result ─────┼───────────────────────►│
  │  ◄── SSE stream ───────│◄──────────────────────┼── final text stream ───│
  │  (tokens rendered      │                       │                        │
  │   live in UI)          │  persist message ──► Supabase                  │
```

### 13.3 Streaming Transport

- **Server-Sent Events (SSE)** for Phase 1, not raw WebSockets — simpler to operate (works over standard HTTP/2, no separate socket infra), and chat streaming is one-directional (server → client) per turn, which is exactly what SSE is built for.
- Each SSE event carries a typed payload so the frontend's markdown interceptor (Section 4.2 in the original architecture, Section 5 here) can react per-chunk:

```
event: token
data: {"text": "Based on"}

event: tool_call
data: {"tool": "google_analytics.query", "status": "running"}

event: tool_result
data: {"tool": "google_analytics.query", "status": "done"}

event: artifact_open
data: {"artifact_id": "art_503", "type": "doc"}

event: done
data: {"message_id": "msg_9182"}
```

### 13.4 Caching Layer

| What's Cached | Where | TTL | Why |
|---|---|---|---|
| Brand Brain context per user | Redis | 5 min | Read on nearly every message; avoids a Supabase round-trip per request |
| Connected-tools list per user | Redis | 5 min, invalidated on connect/disconnect | Needed for every planning pass (9.10.3) |
| Session list (sidebar) | Client-side (SWR/React Query) with background revalidation | N/A | Reduces perceived latency opening the app |

### 13.5 Scaling the MCP Gateway

Since the MCP Gateway proxies 100+ tool connectors, it's designed to scale horizontally and independently:

- Each MCP connector server runs as its own container behind the Gateway's internal router — a spike in usage of one tool (e.g., everyone pulling Google Analytics at month-end) doesn't affect others.
- The Gateway itself is stateless (credentials are fetched per-call from Secrets Manager, not cached in-process), so it can run behind a standard load balancer with N replicas.
- Category-grouped connector servers (per Section 9.5) start as single instances in Phase 1; the architecture allows splitting any one category into its own scaled deployment later if it becomes a hotspot, without touching the Gateway's routing logic.

### 13.6 Deployment Topology (Phase 1)

```
                     ┌───────────────┐
                     │   Load Balancer│
                     └───────┬───────┘
              ┌──────────────┼───────────────┐
              ▼              ▼               ▼
        ┌───────────┐  ┌───────────┐   ┌───────────┐
        │ Chat API   │  │ Chat API  │   │ Chat API   │   (N replicas, stateless)
        └─────┬─────┘  └─────┬─────┘   └─────┬─────┘
              └──────────────┼───────────────┘
                              ▼
                     ┌────────────────┐
                     │  MCP Gateway    │  (separate deployment, N replicas)
                     └────────┬────────┘
                              ▼
                ┌─────────────────────────┐
                │ Connector containers     │ (per tool/category)
                └─────────────────────────┘
                              
        ┌───────────────┐        ┌───────────────┐
        │ Job Workers     │        │ Redis (cache/  │
        │ (BullMQ, N)     │        │ job queue)     │
        └───────────────┘        └───────────────┘
                              
                     ┌────────────────┐
                     │   Supabase      │  (managed Postgres + Auth + Storage)
                     └────────────────┘
```

### 13.7 CI/CD

- Standard trunk-based flow: PR → automated tests (unit + a smoke test that runs a fixed prompt through the planning pass and asserts a valid plan JSON is returned) → merge → auto-deploy to staging → manual promote to production.
- The **planning pass prompt** (Section 9.10.3) is version-controlled and tested like code — a regression test suite of known prompts with expected `task_type`/`recommended_model` outputs, run on every change to the planning system prompt, so router behavior doesn't silently drift.

---

## 15. Skills System

### 15.1 Concept

A **Skill** is a named, reusable set of instructions a user (or Infinall) authors once and reuses across chats — e.g., "LinkedIn Ad Copy Playbook," "Investor Update Template," "Competitor Teardown Framework." This is the same underlying idea as Claude's own Skills concept (reusable instructions for a specific kind of work), adapted to Infinall Chat with two invocation paths:

| Path | Behavior |
|---|---|
| **Manual** | User types `/` to open a skill picker and explicitly selects one for the current message |
| **Automatic** | The Planning Pass (Section 9.10.3) checks the user's enabled skills and loads a matching one into context on its own, with no slash command needed |

Both paths do the same thing under the hood — inject the skill's instructions into context — they differ only in who decides to trigger it.

### 15.2 Data Model

```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),           -- NULL for Infinall-provided catalog skills
  scope TEXT NOT NULL CHECK (scope IN ('personal', 'team', 'catalog')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,                    -- drives /slug manual invocation
  description TEXT NOT NULL,                    -- drives automatic matching — must be specific
  instructions TEXT NOT NULL,                   -- the actual skill content injected into context
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_skills_owner ON skills(owner_id) WHERE scope = 'personal';
CREATE INDEX idx_skills_scope ON skills(scope) WHERE enabled = TRUE;
```

The `description` field is load-bearing, not cosmetic — it's what the Planning Pass matches against (Section 15.4), so the skill creation UI should nudge users toward a specific, trigger-worthy description ("Use when drafting LinkedIn ad copy for B2B SaaS") rather than a vague one ("Ad copy helper").

### 15.3 Skill Creation UX

A **"Create Skill"** flow, accessible from a Skills settings page:

1. Name + auto-suggested slug
2. Description (with inline guidance: "This is how the AI decides when to use this skill automatically — be specific")
3. Instructions body — a markdown editor (reusing the same doc-artifact editor component from Section 9.2)
4. Scope selector: Personal / Team (if the user's plan supports team sharing)

### 15.4 Manual Invocation (`/` Slash Command)

- Typing `/` in the chat input opens a fuzzy-search picker over the user's enabled skills (personal + team + catalog, in that priority order).
- Selecting a skill injects its `instructions` as a scoped system-context addition for that message only — it does not persist to future messages unless the user invokes it again.

### 15.5 Automatic Invocation — Wired Into the Planning Pass

This extends the Planning Pass already specified in Section 9.10.3. The planning call's input is extended with a **lightweight skill index** (name + description only, not full instructions, to keep this call cheap):

```json
// Added to the planning call input (9.10.3)
"available_skills": [
  { "id": "sk_1", "name": "LinkedIn Ad Copy Playbook", "description": "Use when drafting LinkedIn ad copy for B2B SaaS audiences" },
  { "id": "sk_2", "name": "Investor Update Template", "description": "Use when drafting a monthly/quarterly investor update email" }
]
```

```json
// Extended planning output
{
  "task_type": "content_generation",
  "recommended_model": "claude-sonnet-4-6",
  "requires_web_retrieval": false,
  "matched_skill_id": "sk_1"    // null if no skill's description fits the request
}
```

**Dispatch logic:**

```
if plan.matched_skill_id is not null:
    full_skill = fetch skills WHERE id = plan.matched_skill_id
    inject full_skill.instructions into the main generation call's system context
    (same injection point as a manually invoked skill, Section 15.4)
proceed to Step 5 (tool-use loop) / Step 6 (generation) as normal
```

**Guardrails (Phase 1):**

- Only **one** skill is auto-applied per message — if the plan is ambiguous between two skills, it returns `null` rather than guessing, and the user can invoke the right one manually via `/`.
- Auto-matched skills are surfaced in the UI (a small "Using skill: LinkedIn Ad Copy Playbook" label above the response) so the behavior is never silent — same transparency principle as the model-name chip in Section 2.

### 15.6 Skill Catalog & Sharing

| Scope | Who Can Use It | Example |
|---|---|---|
| **Personal** | Only the creator | A founder's own investor-update format |
| **Team** | Everyone on the account/workspace | A shared "Brand Voice Checklist" skill the whole marketing team uses |
| **Catalog** | Every Infinall Chat user, pre-built | Infinall-provided defaults like "SaaS Pricing Page Copy," "Cold Outbound Sequence" |

The Team and Catalog scopes reuse the same directory/browsing pattern already specified for the 100+ MCP tools (Section 6.2) — a consistent "browse and add" UX across tools and skills, rather than two different mental models for the user.

### 15.7 Control Bar Update

```
┌──────────────────────────────────────────────────────────────────┐
│  [Attach]  [/ Skills]  [Research Mode: Off/On]  [Model: Auto ▾] [Send]│
│  [🔧 Tools connected: 12]                                          │
└──────────────────────────────────────────────────────────────────┘
```

- `/` is hinted directly in the input placeholder text ("Ask anything, or type / for a skill…") so discovery doesn't depend on users finding a settings page first.

---

## 16. Multimodal Input Support

Infinall Chat accepts any input type a user provides — video, audio, image, documents, and pasted text — not just typed messages.

### 16.1 Supported Input Types & Processing

| Input Type | Formats | Processing | Model Exposure |
|---|---|---|---|
| **Image** | PNG, JPG, WebP | Uploaded directly, no preprocessing needed | Sent natively as image content to vision-capable models (Sonnet 4.6, Opus 5, GPT-5.6 all support image input) |
| **Document** | PDF, DOCX, XLSX, CSV | Text/table extraction pass on upload | Extracted text (and tables, for spreadsheets) injected into context as structured content, not raw bytes |
| **Audio** | MP3, WAV, M4A | Transcription pass (speech-to-text) on upload | Transcript text injected into context; original file kept in storage for playback reference |
| **Video** | MP4, MOV | Frame sampling (key frames at intervals) + audio-track transcription | Sampled frames sent as image content, transcript sent as text — gives the model both visual and spoken content without needing a native video-input model |
| **Pasted text / URLs** | Plain text, links | URLs are fetched and treated as a research input (Section 3's retrieval layer); plain text is used as-is | Direct context injection, or routed into the web-retrieval tool if it's a URL |

### 16.2 Upload & Ingestion Flow

```
User uploads/pastes input
      │
      ▼
Type detection (MIME type / URL pattern)
      │
      ├── Image ──────────────► stored in Supabase Storage → sent natively to model
      ├── Document ───────────► text/table extraction service → structured text → context
      ├── Audio ──────────────► transcription service → transcript → context
      ├── Video ──────────────► frame sampler + transcription service → frames + transcript → context
      └── URL ────────────────► dispatched to the web-retrieval layer (Section 3)
```

- All uploaded files are stored in **Supabase Storage**, referenced by ID from the `chat_messages.content` JSON (Section 11.2) — the extracted/processed content (text, transcript, frames) is what's actually sent to the model, while the original file remains available for the user to reopen or for the artifact panel to reference.
- Processing (transcription, extraction, frame sampling) runs as a background job (BullMQ, Section 9.3) so large files don't block the chat request — the UI shows a brief "Processing your video…" state before the message is ready to send to the model.
