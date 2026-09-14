# Phase 1: Exhaustive Implementation & Presentation Specification

**Project**: Infinall Chat — The Claude for Marketers  
**Phase**: Phase 1 — Core Foundation & High-Fidelity Vertical Slice  
**Target Root**: `c:\Users\shrut\Desktop\Infianl.ai_2`  
**API Gateway**: `https://llm.ganeshnayak.in/`

---

## 1. Executive Summary & Objective

The goal of Phase 1 is to construct a production-grade, pixel-perfect, end-to-end operational vertical slice of **Infinall Chat**. Phase 1 proves the entire architectural pipeline:
1. **Claude-Parity UI**: Dark slate palette, collapsible navigation sidebar, in-stream collapsible thinking (`💥 Thought for 8s ▾`), in-stream collapsible tool activity (`⌄ Searched the web ▾`), floating pill input composer with model selector chip, Stop generation button (`[ ■ ]`), and a split-screen resizable live Artifacts workspace.
2. **Custom Model Gateway**: Direct proxy to `https://llm.ganeshnayak.in/` with Anthropic native protocol (`/v1/messages` with native extended thinking and prompt caching) and OpenAI protocol (`/v1/chat/completions`).
3. **Autonomous Agent Harness**: Context Assembler $\to$ Step 3 Planning Pass $\to$ Model Reasoning Turn $\to$ $0 \to N$ Dynamic Tool Loop with `Promise.all` parallel tool execution $\to$ Stream Interceptor $\to$ Split Artifact Sandbox.
4. **Human-in-the-Loop Mutation Safety**: Interactive UI Diff Card for write operations with 5-minute cryptographic token expiration.
5. **Layer 6 Product Fidelity**: Live stream cancellation (`AbortController`), conversation branching (`< 1 of 2 >`), grounded citations (`[1]`), smart auto-scroll with upward lock, and resilient error fallbacks.

---

## 2. Complete File Directory & Module Ownership

```text
c:\Users\shrut\Desktop\Infianl.ai_2\
├── docs/                                      # Master Documentation
│   ├── PRD_Infinall_Chat_Phase1_v2 1.md       # Original Product Requirements Document
│   ├── detailed.md                            # Complete System Architecture & Prompt Hierarchy
│   ├── convo.md                               # Complete Conversation & Invariant Log
│   └── phase_1.md                             # This Exhaustive Phase 1 Blueprint
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   ├── route.ts                  # Edge SSE Streaming Agent Endpoint
│   │   │   │   └── approval/
│   │   │   │       └── resume/
│   │   │   │           └── route.ts          # Resumes paused write mutations
│   │   │   ├── health/
│   │   │   │   └── route.ts                  # Health check & latency monitor
│   │   │   └── models/
│   │   │       └── route.ts                  # Model catalog listing & status
│   │   ├── layout.tsx                        # Root layout, Inter/Geist fonts, theme provider
│   │   ├── page.tsx                          # Split-screen workspace container
│   │   └── globals.css                       # Dark slate tokens, glowing borders, scrollbars
│   ├── components/
│   │   ├── workspace/
│   │   │   ├── Sidebar.tsx                   # Collapsible navigation, chat history, + New Chat
│   │   │   ├── ChatWorkspace.tsx             # Main conversation thread feed
│   │   │   ├── SplitWorkspace.tsx            # Resizable dual-pane container (react-resizable-panels)
│   │   │   └── Header.tsx                    # Top navigation, project selector, share button
│   │   ├── chat/
│   │   │   ├── EmptyState.tsx                # Centered Claude greeting & prompt suggestion cards
│   │   │   ├── ErrorBanner.tsx               # In-stream recoverable error banner with retry button
│   │   │   ├── MessageList.tsx               # Virtualized / smooth scrolling message stream
│   │   │   ├── UserMessage.tsx               # User bubble with hover toolbar & branch switcher
│   │   │   ├── AssistantMessage.tsx          # Markdown, syntax highlighter, copy, retry actions
│   │   │   ├── ThinkingAccordion.tsx         # "💥 Thought for 8s ▾" collapsible reasoning card
│   │   │   ├── ToolAccordion.tsx             # "⌄ Searched the web ▾" with query pills & sources
│   │   │   ├── ApprovalDiffCard.tsx          # Interactive Write Tool mutation gate card
│   │   │   ├── CitationBadge.tsx             # Interactive [1] source popover with domain favicons
│   │   │   └── Composer.tsx                  # Floating pill input, model chip, attachment, stop button
│   │   └── artifacts/
│   │       ├── ArtifactPanel.tsx             # Right-hand split container
│   │       ├── ArtifactNavbar.tsx            # [Preview] | [Code], Copy, Download, Version history
│   │       ├── ArtifactSkeleton.tsx          # Smooth pulse loading state during delta streaming
│   │       ├── LivePreviewSandbox.tsx        # Isolated <iframe> with sandbox="allow-scripts" & CSP
│   │       ├── CodeViewer.tsx                # Syntax-highlighted code viewer (Shiki / Prism)
│   │       └── VersionHistoryMenu.tsx        # Dropdown with v1, v2 and 1-click revert

│   ├── lib/
│   │   ├── gateway/
│   │   │   ├── types.ts                      # Canonical LLM message, request, and stream types
│   │   │   ├── catalog.ts                    # Model catalog definitions & capabilities
│   │   │   ├── anthropic.ts                  # Anthropic /v1/messages adapter
│   │   │   ├── openai.ts                     # OpenAI /v1/chat/completions adapter
│   │   │   ├── normalizer.ts                 # Unified SSE stream event normalizer
│   │   │   └── index.ts                      # ModelGateway dispatcher
│   │   ├── state/
│   │   │   ├── types.ts                      # Canonical AgentState, ExecutionContext, ApprovalState
│   │   │   ├── context.ts                    # Context Assembler & prompt caching order
│   │   │   ├── planner.ts                    # Step 3 Planning Pass node (classification & routing)
│   │   │   └── agent-loop.ts                 # Autonomous 0->N Tool Loop state machine
│   │   ├── tools/
│   │   │   ├── registry.ts                   # Ambient tool index & Zod schema definitions
│   │   │   ├── web-search.ts                 # Autonomous web search tool with citation generator
│   │   │   ├── campaign-mutation.ts          # Meta ad campaign write tool (triggers approval)
│   │   │   └── approval-store.ts             # Cryptographic token vault with 5m TTL
│   │   └── artifacts/
│   │       ├── parser.ts                     # Real-time stream interceptor for <antArtifact> tags
│   │       └── types.ts                      # Artifact payload, language, and version interfaces
│   └── tests/
│       ├── gateway.test.ts                   # Unit tests for Model Gateway & stream normalizer
│       ├── planner.test.ts                   # Unit tests for Planner JSON validation
│       ├── agent-loop.test.ts                # Unit tests for 0->N tool iterations & parallel calls
│       └── approval.test.ts                  # Unit tests for Write approval token expiry & execution
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vitest.config.ts
```

---

## 3. Detailed Data Schemas & Wire Protocols

### A. Canonical SSE Event Protocol
The backend streams SSE chunks formatted as `data: {"type": "<EVENT_TYPE>", "payload": { ... }}\n\n`:

```typescript
export type CanonicalSSEEvent =
  | { type: 'plan_start'; payload: { taskId: string } }
  | { type: 'plan_complete'; payload: { taskType: string; recommendedModel: string; candidateTools: string[] } }
  | { type: 'thinking_delta'; payload: { delta: string; elapsedSeconds?: number } }
  | { type: 'tool_call_start'; payload: { callId: string; toolName: string; query?: string } }
  | { type: 'tool_call_delta'; payload: { callId: string; argsChunk: string } }
  | { type: 'tool_call_end'; payload: { callId: string; toolName: string; args: Record<string, any> } }
  | { type: 'tool_call_result'; payload: { callId: string; toolName: string; result: any; sources?: SourceCitation[] } }
  | { type: 'approval_required'; payload: { executionId: string; toolName: string; actionSummary: string; diff: MutationDiff; expiresAt: number } }
  | { type: 'text_delta'; payload: { delta: string } }
  | { type: 'artifact_open'; payload: { id: string; title: string; type: 'html' | 'react' | 'markdown' | 'docx' | 'pptx' | 'xlsx'; language: string } }
  | { type: 'artifact_delta'; payload: { id: string; delta: string } }
  | { type: 'artifact_complete'; payload: { id: string; fullContent: string; version: number } }
  | { type: 'usage_metadata'; payload: { promptTokens: number; completionTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number; latencyMs: number } }
  | { type: 'error'; payload: { message: string; code: string; recoverable: boolean } }
  | { type: 'done'; payload: { finishReason: string } };

export interface SourceCitation {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

export interface MutationDiff {
  account: string;
  campaignName: string;
  budgetChange: string;
  audienceTargeting: string;
  dailySpend: string;
  rawParams: Record<string, any>;
}
```

---

### B. Custom Model Gateway Specifications
All requests route to `https://llm.ganeshnayak.in/`:

```typescript
export interface ModelCatalogEntry {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai';
  apiType: 'messages' | 'chat-completions';
  endpoint: string;
  contextWindow: number;
  supportsExtendedThinking: boolean;
  supportsPromptCaching: boolean;
  supportsVision: boolean;
}

export const MODEL_CATALOG: Record<string, ModelCatalogEntry> = {
  'claude-sonnet-4-6': {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    apiType: 'messages',
    endpoint: 'https://llm.ganeshnayak.in/v1/messages',
    contextWindow: 200000,
    supportsExtendedThinking: true,
    supportsPromptCaching: true,
    supportsVision: true,
  },
  'Kimi-K2.6': {
    id: 'Kimi-K2.6',
    name: 'Kimi K2.6',
    provider: 'openai',
    apiType: 'chat-completions',
    endpoint: 'https://llm.ganeshnayak.in/v1/chat/completions',
    contextWindow: 128000,
    supportsExtendedThinking: false,
    supportsPromptCaching: false,
    supportsVision: true,
  },
  'claude-opus-5': {
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    provider: 'anthropic',
    apiType: 'messages',
    endpoint: 'https://llm.ganeshnayak.in/v1/messages',
    contextWindow: 200000,
    supportsExtendedThinking: true,
    supportsPromptCaching: true,
    supportsVision: true,
  },
  'gpt-5-6': {
    id: 'gpt-5-6',
    name: 'GPT-5.6',
    provider: 'openai',
    apiType: 'chat-completions',
    endpoint: 'https://llm.ganeshnayak.in/v1/chat/completions',
    contextWindow: 128000,
    supportsExtendedThinking: false,
    supportsPromptCaching: false,
    supportsVision: true,
  }
};

```

#### Anthropic Protocol Payload Format (`/v1/messages`):
```json
{
  "model": "claude-3-7-sonnet-latest",
  "max_tokens": 8192,
  "thinking": {
    "type": "enabled",
    "budget_tokens": 2048
  },
  "system": [
    {
      "type": "text",
      "text": "You are Infinall Chat, the ultimate AI marketing strategist...",
      "cache_control": { "type": "ephemeral" }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "Compare HubSpot and Salesforce 2026 pricing and generate an ROI calculator."
    }
  ],
  "tools": [
    {
      "name": "web_search",
      "description": "Searches the web for up-to-date pricing and news.",
      "input_schema": {
        "type": "object",
        "properties": {
          "queries": {
            "type": "array",
            "items": { "type": "string" },
            "description": "List of distinct search queries."
          }
        },
        "required": ["queries"]
      }
    }
  ]
}
```

---

### C. Step 3 Planner Node Specification
The planner analyzes the context and emits structured JSON:

```typescript
export interface PlannerOutput {
  task_type: 'strategy' | 'campaign_build' | 'copywriting' | 'analytics' | 'general';
  complexity: 'simple' | 'moderate' | 'complex';
  recommended_model: 'claude-sonnet-4-6' | 'claude-opus-5' | 'gpt-5-6';
  candidate_tools: string[]; // e.g. ["web_search", "meta_ads_create"]
  expected_artifact_type: 'html' | 'react' | 'markdown' | 'docx' | 'pptx' | 'xlsx' | null;
  reasoning_summary: string;
}
```

---

### D. Autonomous Agent Loop Algorithm ($0 \to N$ Iterations)

```typescript
export async function runAutonomousAgentLoop(
  ctx: ExecutionContext,
  emit: (event: CanonicalSSEEvent) => void,
  abortSignal: AbortSignal
): Promise<void> {
  let turn = 0;
  const MAX_TURNS = 10;
  let currentMessages = [...ctx.messages];

  while (turn < MAX_TURNS) {
    if (abortSignal.aborted) throw new Error('Generation cancelled by user');
    turn++;

    // 1. Call Model Gateway with current messages & candidate tool schemas
    const stream = await ModelGateway.streamTurn({
      model: ctx.selectedModel,
      messages: currentMessages,
      tools: ctx.candidateToolSchemas,
      abortSignal
    });

    let toolCalls: ToolCallRequest[] = [];
    let textBuffer = '';

    for await (const chunk of stream) {
      if (chunk.type === 'thinking_delta') {
        emit(chunk);
      } else if (chunk.type === 'tool_call_buffered') {
        toolCalls.push(chunk.payload);
      } else if (chunk.type === 'text_delta') {
        textBuffer += chunk.payload.delta;
        emit(chunk);
        // Intercept artifact tags live
        ArtifactStreamInterceptor.processDelta(chunk.payload.delta, emit);
      }
    }

    // 2. Base Condition: Model decided no tools are needed -> Finished
    if (toolCalls.length === 0) {
      emit({ type: 'done', payload: { finishReason: 'stop' } });
      break;
    }

    // 3. Separate Read Tools vs Write Mutations
    const readTools = toolCalls.filter(tc => !isMutationTool(tc.toolName));
    const writeTools = toolCalls.filter(tc => isMutationTool(tc.toolName));

    // 4. Handle Write Mutations (Approval Gate)
    if (writeTools.length > 0) {
      for (const writeTool of writeTools) {
        const approvalRecord = ApprovalStore.createPendingApproval(writeTool, ctx);
        emit({
          type: 'approval_required',
          payload: {
            executionId: approvalRecord.id,
            toolName: writeTool.toolName,
            actionSummary: approvalRecord.summary,
            diff: approvalRecord.diff,
            expiresAt: approvalRecord.expiresAt
          }
        });
      }
      // Pause agent loop until approval is resumed via /api/chat/approval/resume
      break;
    }

    // 5. Execute Read Tools in Parallel
    emit({
      type: 'tool_call_start',
      payload: { callId: `batch-${turn}`, toolName: 'web_search', query: toolCalls.map(t => t.args.query).join(', ') }
    });

    const results = await Promise.all(
      readTools.map(async (tc) => {
        const res = await ToolDispatcher.execute(tc.toolName, tc.args);
        return { callId: tc.id, toolName: tc.toolName, result: res };
      })
    );

    // 6. Append tool results to message history for next turn
    for (const res of results) {
      emit({
        type: 'tool_call_result',
        payload: { callId: res.callId, toolName: res.toolName, result: res.result.data, sources: res.result.sources }
      });
      currentMessages = appendToolResultToHistory(currentMessages, res.callId, res.result.data);
    }

    // Loop continues: model will evaluate results and generate final answer or search again
  }
}
```

---

## 4. Layer 6: 25 Micro-Interaction & Polish Specifications

| # | Feature | Exact Implementation Logic |
| :--- | :--- | :--- |
| **1** | **Stop Generation** | UI creates `const controller = new AbortController()`. On `[ ■ Stop ]`, `controller.abort()` fires, canceling fetch, SSE listener, and server agent loop. |
| **2** | **Message Branching** | User edits past message $\to$ creates sibling tree node $\to$ UI displays `< 1 of 2 >` controls with state switching. |
| **3** | **Collapsible Thinking** | `<ThinkingAccordion isCollapsed={false} elapsedSec={8} status="Synthesizing findings..." />` with smooth accordion collapse transition. |
| **4** | **Collapsible Tool Accordion** | `<ToolAccordion searches={['HubSpot 2026', 'Salesforce 2026']} sources={sources} />` displaying clickable pill filters. |
| **5** | **Grounded Citations** | Markdown regex converts `[1]` to `<CitationBadge id={1} source={sources[0]} />` opening floating tooltip with favicon and URL. |
| **6** | **Fault-Tolerant Retries** | Gateway intercepts 429/502 with exponential backoff (1s, 2s, 4s). On failure, agent injects `[Tool Error: fallback to offline data]` rather than throwing. |
| **7** | **Tool Stream Buffering** | Gateway collects raw `argsChunk` until `tool_call_end` $\to$ `JSON.parse()` $\to$ `Zod.parse()` validation. |
| **8** | **Parallel Execution** | Concurrent `Promise.all()` for independent tool calls in a single turn. |
| **9** | **Hard Circuit Breakers** | Configured `MAX_TURNS = 10`, `MAX_TOOL_CALLS = 5`, `TOOL_TIMEOUT = 15000ms`, `REQUEST_TIMEOUT = 120000ms`. |
| **10** | **Context Truncation** | Tool search snippets capped at 1,500 chars per result; HTML dumps stripped of script/style tags. |
| **11** | **Multimodal Upload** | Drag & drop or `[📎]` button loads file into `<AttachmentChip name="pitch.pdf" size="1.2MB" status="ready" onRemove={...} />`. |
| **12** | **Voice Dictation** | Audio state machine: `idle` $\to$ `recording (live canvas waveform)` $\to$ `processing` $\to$ `transcribed`. |
| **13** | **Artifact Controls** | Navbar includes `[Live Preview]` / `[Code]` tab, `[Copy]`, `[Download .html/.md]`, `[Fullscreen]`, `[Version History ▾]`, `[✕ Close]`. |
| **14** | **Progressive Streaming** | Real-time `artifact_delta` tokens streamed directly into active editor and iframe preview sandbox. |
| **15** | **Iframe Sandbox CSP** | Isolated iframe with `sandbox="allow-scripts"` and `srcdoc` containing zero host cookies or session access. |
| **16** | **Model Selector Chip** | Dropdown in composer: `Claude Sonnet 4.6`, `Claude Opus 5`, `GPT-5.6`. Value injected into `/api/chat` request body. |
| **17** | **Telemetry Tracking** | Displays prompt tokens, completion tokens, cache hits, and latency in debug drawer. |
| **18** | **Resilient Fallback** | Automatic fallback routing from Claude to secondary models on total upstream failure. |
| **19** | **Session Persistence** | Conversation messages, active artifact drafts, and tool states saved to `localStorage` / React state. |
| **20** | **Approval Diff Card** | Interactive card displaying Budget change (`+₹50,000`), Target Audience, Account, with `[Cancel]` and `[Approve]` actions. |
| **21** | **Idempotent 5m TTL** | Approval token stored in `ApprovalStore` with `Date.now() + 300000`. Double submissions rejected with 409 Conflict. |
| **22** | **Debug Trace Log** | Event emitter outputs chronological telemetry events accessible via `Cmd + Option + D`. |
| **23** | **Slash Command Palette** | Typing `/` in composer opens floating menu with fuzzy filter for `/copywriting`, `/audit`, `/calculator`. |
| **24** | **Deferred Discovery** | Only tool names + descriptions sent in initial prompt; full JSON schemas dynamically injected on demand. |
| **25** | **Private Reasoning Shield** | Native model thinking block filtered into high-level status messages; private system instructions stripped. |
| **26** | **Ergonomic Shortcuts** | `Enter` = Send, `Shift + Enter` = Newline, `Cmd/Ctrl + K` = New Chat, `Esc` = Close Artifact. |

---

## 5. Step-by-Step Implementation Sequence

### Step 1: Next.js Setup & Design System
* Create Next.js 14/15 App Router app with TypeScript and Tailwind CSS.
* Install: `lucide-react`, `clsx`, `tailwind-merge`, `zod`, `react-resizable-panels`, `vitest`.
* Build `src/app/globals.css` with dark slate design tokens:
  * Background: `#18181b` (sidebar), `#1f1f23` (chat), `#27272a` (borders/cards).
  * Accents: Amber/Orange gradient for Claude branding, emerald for approvals, cyan for search pills.

### Step 2: Canonical Model Gateway Proxy
* Implement `src/lib/gateway/types.ts` and `src/lib/gateway/catalog.ts`.
* Implement `src/lib/gateway/anthropic.ts` targeting `https://llm.ganeshnayak.in/v1/messages`.
* Implement `src/lib/gateway/openai.ts` targeting `https://llm.ganeshnayak.in/v1/chat/completions`.
* Implement `src/lib/gateway/normalizer.ts` transforming raw chunks to `CanonicalSSEEvent`.

### Step 3: Agent State Machine, Context Assembler, & Planner
* Implement `src/lib/state/context.ts` assembling system prompt, brand brain, tool index, and history.
* Implement `src/lib/state/planner.ts` executing Step 3 Planning Pass.
* Implement `src/lib/state/agent-loop.ts` running the $0 \to N$ autonomous tool loop.

### Step 4: Tools & Mutation Approval Gate
* Implement `src/lib/tools/web-search.ts` returning structured citations (title, URL, snippet).
* Implement `src/lib/tools/campaign-mutation.ts` for write safety.
* Implement `src/lib/tools/approval-store.ts` managing 5-minute cryptographic tokens.
* Create `/api/chat/approval/resume/route.ts` to resume paused mutation execution.

### Step 5: Claude Split-Screen Workspace UI
* Implement `src/components/workspace/Sidebar.tsx`, `ChatWorkspace.tsx`, and `SplitWorkspace.tsx`.
* Implement in-stream components: `ThinkingAccordion.tsx`, `ToolAccordion.tsx`, `ApprovalDiffCard.tsx`, `CitationBadge.tsx`.
* Implement `Composer.tsx` with floating pill styling, model picker chip, and `[ ■ Stop ]` button.
* Implement `src/components/artifacts/ArtifactPanel.tsx`, `LivePreviewSandbox.tsx`, and `CodeViewer.tsx`.

### Step 6: Layer 6 Micro-Interactions & Stream Interceptor
* Connect `AbortController` in frontend `useChat` hook.
* Implement `src/lib/artifacts/parser.ts` intercepting ````xml <antArtifact>```` tags live.
* Add smart auto-scroll with upward scroll-lock, message branch editing, and keyboard shortcuts.

### Step 7: Triple Verification
* Run unit test suite: `npx vitest run`.
* Run production build: `npm run build`.
* Run Browser Subagent to visually and interactively verify `http://localhost:3000`.

---

## 6. Presentation Scenarios for Phase 1 Demo

### Demo 1: Multi-Search & Live React Landing Page
* **Prompt**: *"Compare HubSpot and Salesforce 2026 pricing and build a live interactive ROI Calculator for marketing teams."*
* **What Evaluators See**:
  1. `💥 Thought for 6s ▾` reasoning accordion.
  2. `⌄ Searched the web ▾ (2 searches)` with clickable query pills.
  3. Assistant response with numeric citations `[1]`, `[2]`.
  4. Right-side Artifacts panel smoothly slides open with a live interactive React ROI Calculator.
  5. User drags sliders inside the live preview, toggles to `[Code]` tab, and tests the `[Copy]` button.

### Demo 2: Mutation Approval Gate (Write Safety)
* **Prompt**: *"Launch a retargeting ad on Meta Ads with ₹50,000 budget."*
* **What Evaluators See**:
  1. System halts before mutation and renders an in-stream **Interactive Approval Diff Card**.
  2. Evaluator clicks `[Approve & Launch]`.
  3. Token is validated $\to$ mutation executes $\to$ confirmation streams into chat.

### Demo 3: Stream Cancellation & Branch Editing
* **Prompt**: Generate full Q3 marketing strategy.
* **What Evaluators See**:
  1. Evaluator clicks `[ ■ Stop Generation ]` mid-stream $\to$ stream halts instantly without UI error.
  2. Evaluator clicks `[Edit]` on their prompt $\to$ branches into `Version 2 of 2`.

---

## 7. Triple Verification Standard

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      TRIPLE VERIFICATION GATE                          │
├─────────────────────────┬──────────────────────────────────────────────┤
│ 1. Vitest Unit Suite    │ 100% pass on Gateway, Planner, Tool Loop,   │
│                         │ and Approval Token expiration tests.         │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 2. TypeScript Build     │ Zero errors/warnings with `npm run build`.   │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 3. Browser Subagent     │ Live visual validation of split pane,        │
│                         │ streaming accordions, and iframe sandbox.    │
└─────────────────────────┴──────────────────────────────────────────────┘
```

---

*This document is the exhaustive engineering blueprint for executing Phase 1.*
