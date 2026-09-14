# Phase 2: Agent Harness, MCP Ecosystem & Mutation Safety Specification

**Project**: Infinall Chat — The Claude for Marketers  
**Phase**: Phase 2 — Autonomous Agent Harness, Tool Ecosystem & Mutation Safety  
**Target Root**: `c:\Users\shrut\Desktop\Infianl.ai_2`  
**API Gateway**: `https://llm.ganeshnayak.in/`

---

## 1. Executive Summary & Objective

Building upon the core Claude-parity UI and gateway infrastructure delivered in Phase 1, **Phase 2** expands **Infinall Chat** into a fully autonomous, production-grade agentic operating system for marketers. 

Phase 2 focuses on five foundational pillars:
1. **Model Context Protocol (MCP) Client Runtime**: Standardized, dynamic client connectivity (stdio/SSE) to marketing data sources (Google Analytics 4, Google Ads, Meta Ads Manager, HubSpot, and Firecrawl scraping).
2. **Deferred Tool Discovery & Context Optimization**: Elimination of token-wasting tool dumps by feeding candidate tool definitions dynamically based on Step 3 Planning Pass recommendations.
3. **Multi-Turn Autonomous Execution Harness**: Resilient $0 \to N$ execution loop with token budget guardrails, parallel tool resolution (`Promise.allSettled`), automatic schema error retries, and comprehensive lifecycle hooks (`PreToolUse`, `PostToolUse`).
4. **Cryptographic Mutation Safety & Interactive Approval Flow**: Human-in-the-Loop (HITL) approval gate for all write operations (e.g., ad spend changes, campaign creation) with HMAC-signed execution tokens, 5-minute TTL, visual diff preview cards, and bidirectional rejection feedback.
5. **Deterministic Benchmark & Regression Suite**: Acceptance test matrix verifying tool selection, parameter validation, and safety invariants.

---

## 2. Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           User Chat Interface (Client)                          │
└──────────────┬──────────────────────────────────────────────────▲───────────────┘
               │ 1. POST /api/chat (Messages, ModelId)             │ 
               ▼                                                  │ 7. Canonical SSE
┌───────────────────────────────────────────────────────────────┐ │    (Deltas, Tools,
│                      Edge Request Router                      │ │     Approvals, Diff)
└──────────────┬────────────────────────────────────────────────┘ │
               │ 2. Classification Query                          │
               ▼                                                  │
┌───────────────────────────────────────────────────────────────┐ │
│               Step 3 Planning Pass (Fast Router)              │ │
│   - Classifies task type (strategy, campaign_build, analytics)│ │
│   - Determines candidate tools [ga4, meta_ads, web_search]    │ │
└──────────────┬────────────────────────────────────────────────┘ │
               │ 3. Candidate Tool Schemas                        │
               ▼                                                  │
┌───────────────────────────────────────────────────────────────┐ │
│                 Autonomous Agent Loop Manager                 │─┘
│                                                               │
│   ┌───────────────────────────────────────────────────────┐   │
│   │ Turn N: Model Reasoning Turn (Claude Sonnet 4.6)      │   │
│   │ -> Emits text_delta, thinking_delta, tool_use         │   │
│   └───────────────────────┬───────────────────────────────┘   │
│                           │ 4. Tool Requests                  │
│                           ▼                                   │
│   ┌───────────────────────────────────────────────────────┐   │
│   │ Tool Dispatcher & Safety Gate                         │   │
│   │                                                       │   │
│   │  [READ TOOLS] ─────────────────┐                      │   │
│   │  - Google Analytics 4 (MCP)    │                      │   │
│   │  - Web Search / Firecrawl      ├─► Parallel Execute   │   │
│   │  - Competitor Scraping         │   (Promise.all)      │   │
│   │                                │                      │   │
│   │  [WRITE / MUTATION TOOLS] ─────┘                      │   │
│   │  - Meta Campaign Create                               │   │
│   │  - Budget Adjustments                                 │   │
│   │     │                                                 │   │
│   │     ▼                                                 │   │
│   │  Generates HMAC Token + Action Diff                   │   │
│   │  -> Emits 'approval_required' & PAUSES Loop           │   │
│   └───────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
                                ▲
                                │ 5. User Decision
                                │    POST /api/chat/approval/resume
                                │    (Approve / Modify / Reject)
```

---

## 3. Directory Structure & Module Blueprint

```text
c:\Users\shrut\Desktop\Infianl.ai_2\infinall-chat\
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.ts                        # SSE Agent endpoint with MCP & Tool Loop
│   │   │   └── approval/
│   │   │       ├── resume/
│   │   │       │   └── route.ts                # Resumes paused loop upon user approval
│   │   │       └── reject/
│   │   │           └── route.ts                # Rejection feedback & agent replanning
│   │   ├── tools/
│   │   │   ├── route.ts                        # Directory listing of available MCP tools
│   │   │   └── test/
│   │   │       └── route.ts                    # Diagnostics & tool ping endpoint
│   │   └── mcp/
│   │       └── servers/
│   │           └── route.ts                    # MCP server status & health endpoint
├── lib/
│   ├── mcp/
│   │   ├── client.ts                           # Generic MCP Client (stdio & SSE transport)
│   │   ├── protocol.ts                         # JSON-RPC 2.0 types & MCP message schemas
│   │   ├── registry.ts                         # Dynamic MCP server connection registry
│   │   └── adapters/
│   │       ├── ga4-adapter.ts                  # Google Analytics 4 MCP server connector
│   │       ├── meta-ads-adapter.ts             # Meta Marketing API MCP server connector
│   │       ├── google-ads-adapter.ts           # Google Ads API MCP server connector
│   │       └── firecrawl-adapter.ts            # Firecrawl deep scraping MCP connector
│   ├── tools/
│   │   ├── registry.ts                         # Dynamic Deferred Tool Catalog & Zod Schemas
│   │   ├── types.ts                            # Tool definition, execution result & citation types
│   │   ├── hooks.ts                            # PreToolUse / PostToolUse Lifecycle Hooks
│   │   ├── rate-limiter.ts                     # Token bucket rate limiter per tool
│   │   ├── builtins/
│   │   │   ├── web-search.ts                   # Enhanced live search with rich domain metadata
│   │   │   ├── firecrawl-scrape.ts             # Clean markdown page extraction
│   │   │   ├── ga4-analytics.ts                # GA4 metrics querying & breakdown
│   │   │   ├── meta-campaign-mutation.ts       # Meta ads creation & budget update
│   │   │   └── google-ads-mutation.ts          # Google Ads bid & campaign manager
│   │   └── approval/
│   │       ├── store.ts                        # Cryptographic token store with HMAC & 5m TTL
│   │       ├── diff-builder.ts                 # Visual diff generator (before vs. proposed)
│   │       └── audit-logger.ts                 # Compliance log for approved/rejected actions
│   ├── state/
│   │   ├── planner.ts                          # Step 3 Planning Pass with deferred discovery
│   │   ├── agent-loop.ts                       # Multi-Turn 0->N Harness with pause/resume
│   │   ├── policy.ts                           # Turn limits, budget caps, timeout policies
│   │   └── context-guard.ts                    # Token budget monitor & context truncation
│   └── gateway/
│       ├── types.ts                            # Canonical SSE events (approval_required, etc.)
│       └── catalog.ts                          # Validated model catalog
├── components/
│   ├── chat/
│   │   ├── ApprovalDiffCard.tsx                # Interactive UI Diff Card with Approve/Reject/Edit
│   │   ├── ToolAccordion.tsx                   # Live tool execution progress, args & outputs
│   │   ├── ToolDirectoryModal.tsx              # Browse all connected marketing tools & MCPs
│   │   └── ToolStatusBadge.tsx                 # Inline status pill during execution
│   └── workspace/
│       ├── SplitWorkspace.tsx                  # Workspace handling approval events & resuming
│       └── Sidebar.tsx                         # Sidebar with MCP Integrations link
└── tests/
    ├── mcp-client.test.ts                      # Unit tests for MCP JSON-RPC protocol
    ├── deferred-tools.test.ts                  # Unit tests for candidate tool schema resolution
    ├── agent-loop-multiturn.test.ts            # Multi-turn tool execution tests
    ├── approval-flow.test.ts                   # Cryptographic token validation & resume tests
    └── regression-suite.test.ts                # Deterministic prompt benchmark suite
```

---

## 4. Model Context Protocol (MCP) Client Specification

### 4.1. Core MCP Client Architecture
Infinall Chat implements an extensible MCP Client capable of communicating with any standard MCP tool server over JSON-RPC 2.0 via:
- **SSE Transport**: For cloud-hosted integrations (e.g. Meta Ads API, GA4 connector).
- **Stdio Transport**: For local execution scripts and secure self-hosted sidecars.

```typescript
// lib/mcp/protocol.ts
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPCallToolRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface MCPCallToolResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    content: Array<{
      type: 'text' | 'image' | 'resource';
      text?: string;
      data?: string;
      mimeType?: string;
    }>;
    isError?: boolean;
  };
}
```

### 4.2. Marketing Tool Connectors

| Tool Identifier | Type | Category | Capabilities | Safety Level |
|---|---|---|---|---|
| `web_search` | Built-in | Research | Real-time search with domain authority & citations | Read-Only (Autonomous) |
| `firecrawl_scrape` | MCP | Intelligence | Scrapes clean Markdown from competitor landing pages | Read-Only (Autonomous) |
| `ga4_metrics` | MCP | Analytics | Pulls Sessions, CPA, ROAS, Conversions by channel/date | Read-Only (Autonomous) |
| `meta_ads_read` | MCP | Campaign | Fetches active campaigns, ad sets, spend, and CTR | Read-Only (Autonomous) |
| `meta_ads_mutate` | MCP | Mutation | Creates campaigns, updates budgets, changes bid caps | **Write (Approval Gate Required)** |
| `google_ads_mutate`| MCP | Mutation | Adjusts CPC bids, keyword match types, ad copy | **Write (Approval Gate Required)** |

---

## 5. Deferred Tool Discovery Engine

### 5.1. The Problem
Dumping dozens of marketing tool definitions (100+ schemas) into the initial system prompt consumes 10,000+ tokens per request, degrading reasoning quality and increasing latency.

### 5.2. The Phase 2 Solution: 2-Tier Dynamic Discovery
1. **Tier 1 (Planning Pass)**: The Step 3 Planner analyzes the user's intent with a lightweight prompt and outputs a list of `candidate_tools` (e.g., `["ga4_metrics", "meta_ads_mutate"]`).
2. **Tier 2 (Schema Injection)**: The Agent Loop dynamically fetches full JSON schemas *only* for the candidate tools selected by the planner, keeping prompt overhead under 500 tokens.

```typescript
// lib/state/agent-loop.ts
const candidateToolSchemas: ToolSchema[] = config.plan.candidate_tools
  .map((name) => TOOL_REGISTRY[name])
  .filter(Boolean)
  .map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
```

---

## 6. Multi-Turn Autonomous Execution Loop

### 6.1. Execution Governance & Invariants

```typescript
export interface AgentPolicy {
  maxTurns: number;              // Default: 5
  maxToolCallsPerTurn: number;   // Default: 4
  toolTimeoutMs: number;         // Default: 20_000ms
  totalTokenBudget: number;      // Default: 64_000 tokens
  allowParallelExecution: boolean;// Default: true
}
```

### 6.2. Turn Lifecycle
1. **Model Call**: Request sent with current conversation history + active candidate tool schemas.
2. **Stream Interception**:
   - `text_delta` $\to$ routed to chat stream.
   - `thinking_delta` $\to$ routed to thinking accordion.
   - `tool_call_start` / `tool_call_delta` $\to$ arguments buffered into JSON accumulator.
   - `tool_call_end` $\to$ complete JSON args parsed & validated against Zod schema.
3. **Safety Partitioning**:
   - **Read Tools**: Dispatched immediately via `Promise.allSettled()`.
   - **Write Tools**: Execution paused; HMAC token generated; `approval_required` event emitted to UI.
4. **Result Assembly**: Tool outputs appended to conversation state as `tool_result` messages.
5. **Next Turn**: If read tools returned results and turns remain, the model is invoked again to analyze findings or continue generating deliverables.

---

## 7. Mutation Approval Gate & Safety Mechanism

### 7.1. Cryptographic Approval Token
Write operations are never executed automatically. They generate a single-use token in the memory/Redis store:

```typescript
export interface ApprovalRecord {
  executionId: string;           // UUID v4
  token: string;                 // HMAC-SHA256 signature
  toolName: string;
  args: Record<string, unknown>;
  sessionId: string;
  diff: MutationDiff;
  expiresAt: number;             // Date.now() + 300_000 (5 mins)
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}
```

### 7.2. Interactive Diff Preview Card
When `approval_required` is received by the client, `ApprovalDiffCard.tsx` renders a clear, non-technical operational diff:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ⚠️  APPROVAL REQUIRED: Meta Ads Budget Re-allocation                   │
├────────────────────────────────────────────────────────────────────────┤
│ Campaign: [Q3 SaaS Growth - Retargeting]                               │
│ Account ID: act_892374921                                              │
│                                                                        │
│ Parameter            Current Value              Proposed Value         │
│ ────────────────────────────────────────────────────────────────────── │
│ Daily Budget         $250.00 / day       ───►   $450.00 / day (+80%)   │
│ Target Audience      MoFU Custom List    ───►   MoFU + High-Intent Web │
│ Bid Strategy         Lowest Cost         ───►   Cost Cap ($18.50)      │
├────────────────────────────────────────────────────────────────────────┤
│ ⏱️ Expires in 04:48                                                    │
│ [ Reject / Edit Feedback ]              [ ✅ Approve & Execute Spend ] │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.3. Approval Lifecycle Endpoints
- **`POST /api/chat/approval/resume`**:
  - Validates `executionId`, `token`, and timestamp ($TTL \le 5\text{m}$).
  - Executes the pending mutation tool against the MCP provider.
  - Appends tool success payload to the agent context and streams the subsequent model turn.
- **`POST /api/chat/approval/reject`**:
  - Marks token as rejected.
  - Accepts user reason (e.g. *"Daily budget is too high, cap at $300"*).
  - Feeds rejection feedback back to the agent loop to trigger immediate replanning.

---

## 8. Deterministic Planning & Execution Benchmark Suite

To guarantee reliability across updates, Phase 2 implements an automated regression suite testing 4 core marketing scenarios:

### Test Scenario Matrix

```text
| ID  | Benchmark Prompt                             | Expected Plan                      | Tools Discovered          | Approval Expected |
|-----|----------------------------------------------|-----------------------------------|---------------------------|-------------------|
| T01 | "Draft 3 LinkedIn ad variations for B2B SaaS"| task_type: copywriting            | []                        | No                |
| T02 | "Compare competitor pricing and scrape page" | task_type: strategy               | [web_search, firecrawl]   | No                |
| T03 | "Analyze Q2 CAC from GA4 and export report"  | task_type: analytics              | [ga4_metrics]             | No                |
| T04 | "Reallocate $1,500 budget to Meta Ads"       | task_type: campaign_build         | [meta_ads_mutate]         | YES (Diff Card)   |
```

---

## 9. Implementation Milestones & Verification Checklist

### Sprint 1: MCP Client & Tool Infrastructure
- [ ] Implement `lib/mcp/client.ts` with stdio and SSE transports.
- [ ] Connect `ga4-adapter.ts` and `firecrawl-adapter.ts`.
- [ ] Implement `lib/tools/hooks.ts` (`PreToolUse`, `PostToolUse` telemetry).

### Sprint 2: Multi-Turn Agent Loop & Deferred Discovery
- [ ] Integrate candidate tool filtering from Step 3 Planner output.
- [ ] Support multi-turn model recursion ($0 \to 5$ iterations).
- [ ] Implement tool argument stream buffering and Zod validation.

### Sprint 3: Mutation Approval Gate & UI
- [ ] Implement `lib/tools/approval/store.ts` with HMAC-SHA256 and 5m TTL.
- [ ] Build `components/chat/ApprovalDiffCard.tsx` with side-by-side diffing.
- [ ] Build `/api/chat/approval/resume` and `/api/chat/approval/reject` routes.

### Sprint 4: Testing & Observability
- [ ] Run automated Vitest regression suite covering T01–T04.
- [ ] End-to-end browser verification of read tool search and write approval flows.
