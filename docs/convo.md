# Complete Conversation & Architecture Log: Infinall Chat

This document captures the entire comprehensive conversation, technical decisions, architectural invariants, UI specifications, and execution roadmap established for building **Infinall Chat — The Claude for Marketers** (Phase 1 Assessment for Infinall.ai).

---

## Table of Contents
1. [Executive Vision & Project Overview](#1-executive-vision--project-overview)
2. [UI & Aesthetic Design System (Claude Parity)](#2-ui--aesthetic-design-system-claude-parity)
3. [Autonomous Agent Loop vs Hardcoded Wrapper](#3-autonomous-agent-loop-vs-hardcoded-wrapper)
4. [Custom Model Gateway & Multi-Provider Protocol](#4-custom-model-gateway--multi-provider-protocol)
5. [Universal Multi-Format Artifacts Engine](#5-universal-multi-format-artifacts-engine)
6. [Human-in-the-Loop Mutation Approval Gate](#6-human-in-the-loop-mutation-approval-gate)
7. [Layer 6: Product Fidelity & 25 Interaction Invariants](#7-layer-6-product-fidelity--25-interaction-invariants)
8. [Multi-Phase Execution Roadmap](#8-multi-phase-execution-roadmap)
9. [Triple Verification Protocol](#9-triple-verification-protocol)

---

## 1. Executive Vision & Project Overview

### What We Are Building
**Infinall Chat** is a high-fidelity, production-grade agentic workspace tailored for marketing strategists, growth leaders, and campaign operators. It is designed as a pixel-perfect replica of **Claude.ai**, pairing deep autonomous reasoning with a split-screen live artifact workspace.

### Key Philosophy
* **True Agent Harness**: Not a simple prompt wrapper or linear retrieval script. The system runs an autonomous state machine where the model plans, evaluates tools, iterates over findings, and generates rich deliverables.
* **Vertical Slice First**: Build a fully functional, flawless vertical slice across all core layers before scaling into 100+ tool integrations.

---

## 2. UI & Aesthetic Design System (Claude Parity)

Based on direct visual references and UI analysis of Claude.ai:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INFINALL CHAT                                       │
├─────────────────────┬─────────────────────────────────────┬────────────────────────────┤
│   LEFT SIDEBAR      │         CENTER CHAT THREAD          │    SPLIT ARTIFACT PANEL    │
│                     │                                     │                            │
│  [+ New Chat]       │  User Message Bubble                │  [Preview] | [Code]        │
│                     │  "Analyze Q3 competitors..."        │                            │
│  Pinned Projects    │                                     │  Interactive Sandbox:      │
│  ├─ Q3 Campaign     │  💥 Thought for 8s ▾                │  - Landing Page (React)    │
│  └─ Brand Brain     │                                     │  - Formatted Strategy Doc  │
│                     │  ⌄ Searched the web (3 searches)    │  - Multi-Slide Deck        │
│  Recent Chats       │     [HubSpot] [Salesforce] [Zoho]   │  - Financial XLSX Sheet    │
│  ├─ Competitor Doc  │                                     │                            │
│  └─ Ad Copy Test    │  Assistant Response:                │  Controls:                 │
│                     │  "Here is the Q3 landscape..."      │  [Copy] [Download] [Close] │
│  User Profile       │                                     │                            │
│  [Settings / Plan]  │  ┌────────────────────────────────┐ │  Version History:          │
│                     │  │ [ 📎 ]  Ask Infinall... [ 🎤 ] │ │  v1 ▾ (One-click Revert)   │
│                     │  │ [Claude Sonnet 4.6 ▾]    [ ➤ ] │ │                            │
│                     │  └────────────────────────────────┘ │                            │
└─────────────────────┴─────────────────────────────────────┴────────────────────────────┘
```

### Visual Specifications
* **Theme**: Sleek dark slate / charcoal (`#18181b` for navigation, `#1f1f23` for chat canvas, `#27272a` for card containers).
* **Typography**: Clean, modern sans-serif (Inter / Geist) with high contrast and readable line heights.
* **In-Stream Accordions**:
  * Collapsible thinking card: `💥 Thought for 8s ▾` with sanitized status steps.
  * Collapsible tool execution card: `⌄ Searched the web ▾ (3 searches, 8 sources)` with interactive pill tags.
* **Floating Input Composer**:
  * Rounded pill container with focus ring glow.
  * Action icons: File attachment `📎`, Voice dictation `🎤`, Send button `➤` (transforms to Stop `■` during streaming).
  * Model selector chip dropdown at the bottom-left of the composer.
* **Split Workspace**: Resizable drag divider separating chat and artifact panel with smooth transitions.

---

## 3. Autonomous Agent Loop vs Hardcoded Wrapper

### The Invariant
The model must autonomously decide during its reasoning turn whether to emit `tool_use` blocks. The system does **not** hardcode triggers like `if (prompt.contains("search")) webSearch()`.

### The Runtime Loop ($0 \to N$ Iterations)

```text
USER PROMPT
     │
     ▼
Context Assembly (Brand Brain + Tool Index + Skills + History)
     │
     ▼
Step 3 Planning Pass (Classifies task, recommends model & candidate tool bindings)
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│                 AUTONOMOUS AGENT LOOP                   │
│                                                         │
│   Model streams reasoning & checks candidate tools      │
│                                                         │
│   ┌───────────────────────┴───────────────────────┐     │
│   ▼                                               ▼     │
│ [tool_use Emitted]                       [No Tool / Finished]
│   │                                               │     │
│   ▼                                               ▼     │
│ Parallel Execution (Promise.all)             Stream Text &
│   │                                          Artifact to UI
│   ▼                                               │     │
│ Append tool_result to Context                     │     │
│   │                                               │     │
│   └─────────────────→ Loop Back                   │     │
└───────────────────────────────────────────────────┼─────┘
                                                    │
                                                    ▼
                                            Turn Complete
```

* **0 Tools**: Pure analytical/conversational queries answer immediately without latency.
* **1 Tool**: Direct factual lookups execute a single search.
* **N Tools (Parallel & Multi-Turn)**: Complex multi-competitor audits trigger concurrent searches, evaluate findings, and issue follow-up searches if initial data is insufficient.

---

## 4. Custom Model Gateway & Multi-Provider Protocol

### Direct Proxy Target
All LLM requests pass through the unified proxy: `https://llm.ganeshnayak.in/`

### Dual Protocol Handlers
1. **Anthropic Native Protocol** (`/v1/messages`):
   * Models: `claude-3-7-sonnet-latest`, `claude-opus-5`, `claude-sonnet-4-6`.
   * Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`.
   * Native Extended Thinking: `{ thinking: { type: 'enabled', budget_tokens: 2048 } }`.
2. **OpenAI Protocol** (`/v1/chat/completions`):
   * Models: `gpt-5-6`, `gpt-4o`, `deepseek-r1`.
   * Headers: `Authorization: Bearer <API_KEY>`, `content-type: application/json`.

### Stream Normalization
The gateway normalizes all disparate provider SSE streams into canonical events:
* `event: thinking_delta`
* `event: tool_call_start` / `event: tool_call_delta` / `event: tool_call_end`
* `event: tool_call_result`
* `event: text_delta`
* `event: artifact_open` / `event: artifact_delta` / `event: artifact_complete`
* `event: done`

---

## 5. Universal Multi-Format Artifacts Engine

Beyond simple HTML snippets, Infinall Chat supports multi-format document generation and live preview:

```text
┌─────────────────────────────────────────────────────────────────┐
│                  UNIVERSAL ARTIFACT ENGINE                      │
├─────────────────┬─────────────────────────┬─────────────────────┤
│  Artifact Type  │  Rendering Engine       │  Export Format      │
├─────────────────┼─────────────────────────┼─────────────────────┤
│  React / HTML   │  Sandboxed <iframe>     │  .html / .tsx       │
│  Markdown Docs  │  Tiptap / ProseMirror   │  .md / Copy text    │
│  Strategy Docs  │  docx-js Packer         │  .docx              │
│  PDF Reports    │  React-PDF / Puppeteer  │  .pdf               │
│  Slide Decks    │  PptxGenJS Generator    │  .pptx              │
│  Spreadsheets   │  SheetJS (xlsx)         │  .xlsx / .csv       │
└─────────────────┴─────────────────────────┴─────────────────────┘
```

### Sandbox Security
* Isolated inside an `<iframe>` configured with `sandbox="allow-scripts"`.
* Strict CSP: Artifact execution has **zero** access to host cookies, localStorage, or parent session tokens.
* Live real-time progressive streaming (`artifact_open` $\to$ `artifact_delta` $\to$ `artifact_complete`).

---

## 6. Human-in-the-Loop Mutation Approval Gate

### Security Boundary
* **Read-Only Tools** (`web_search`, `analytics_query`, `read_brand_brain`): Execute autonomously inside the tool loop.
* **High-Impact Write Tools** (`meta_ads.create_campaign`, `slack.send_broadcast`, `hubspot.update_contact`): Halted immediately before execution.

```text
Model emits Write Tool
         │
         ▼
Agent Loop generates executionId & pauses state
         │
         ▼
UI renders Interactive Approval Diff Card:
  ┌────────────────────────────────────────────────┐
  │ ⚠️ Action Requires Approval                    │
  │ Tool: meta_ads.create_campaign                 │
  │ Campaign: "Q3 Founder Retargeting"             │
  │ Budget Diff: +₹50,000 | Daily Spend: ₹2,000   │
  │                                                │
  │ [ Cancel / Reject ]      [ Approve & Execute ] │
  └────────────────────────────────────────────────┘
         │
         ├── User clicks Reject  → Returns user rejection to model context
         └── User clicks Approve → Cryptographic token validated (5m TTL) → Executes mutation
```

---

## 7. Layer 6: Product Fidelity & 25 Interaction Invariants

To guarantee authentic Claude.ai fidelity, the application implements all 25 interaction requirements:

1. **Message Controls**: Hover actions for Copy, Retry/Regenerate, Edit user message, and conversation branching.
2. **Stop Generation**: Client-to-backend `AbortController` instantly cancels SSE stream, agent loop, and in-flight tool promises.
3. **Granular Streaming States**: Seamless transitions (`Planning...` $\to$ `Searching...` $\to$ `Reading sources...` $\to$ `Generating artifact...`).
4. **Collapsible Tool Accordions**: Clean accordion cards with query chips and source badges.
5. **Grounded Citations**: Numeric source chips `[1]`, `[2]` linking to interactive popovers with domain favicons and snippets.
6. **Fault-Tolerant Tool Recovery**: Tool timeouts or 429 errors degrade gracefully without crashing the chat session.
7. **Tool Argument Buffering**: Streamed tool arguments buffered and validated with Zod before execution.
8. **Parallel Tool Calls**: Concurrent execution via `Promise.all` for multi-tool calls in a single turn.
9. **Hard Safety Circuit Breakers**: `MAX_TURNS = 10`, `MAX_TOOL_CALLS = 5`, `TOOL_TIMEOUT = 15s`.
10. **Context Compaction**: Summarization of long tool results and strict prompt cache prefix order.
11. **Multimodal Attachments**: Drag-and-drop for Images, Documents, and Video/Audio transcripts with progress state.
12. **Voice Dictation State Machine**: `idle` $\to$ `recording (waveform)` $\to$ `processing` $\to$ `transcribed`.
13. **Artifact Workspace Controls**: Preview/Code toggle, Copy, Download, Fullscreen, Version history dropdown, Revert, and Close.
14. **Progressive Artifact Streaming**: Real-time code and preview rendering during generation.
15. **Sandboxed Security**: Zero host authentication token leakage into artifact iframes.
16. **Dynamic Model Switcher**: Dropdown in composer propagating model parameters through every turn.
17. **Telemetry & Token Tracking**: Prompt/completion tokens, cache hit counters, and latency tracking.
18. **Resilient Gateway Fallbacks**: Automatic retry on 502/503 errors and secondary model routing.
19. **Session Persistence**: Chat history, active artifact versions, and tool traces persist across refreshes.
20. **Approval UX**: Rich diffs displaying budget, targeting, and mutation parameters.
21. **Idempotent Approvals**: 5-minute TTL tokens preventing double execution.
22. **Trace Event Log**: Real-time debug telemetry stream for full observability.
23. **Slash `/` Command Palette**: Floating menu for marketing skill shortcuts.
24. **Deferred Tool Discovery**: Dynamic ambient index injection saving 20k–40k system prompt tokens.
25. **Sanitized Reasoning Privacy**: Private internal chain-of-thought separated from user-facing status indicators.
26. **Micro-Interactions**: Smart auto-scroll with upward scroll lock, keyboard shortcuts (`Enter`, `Shift+Enter`, `Cmd+K`), syntax highlighting with copy buttons, and draggable split panes.

---

## 8. Multi-Phase Execution Roadmap

| Phase | Core Objective | Key Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | **Core Foundation & Vertical Slice** | Next.js 14/15 App Router, Custom Model Gateway (Claude Sonnet 4.6 / GPT-5.6), Autonomous Agent Loop, Split-Screen Workspace, SSE Stream Engine. |
| **Phase 2** | **Agent Harness & Tool Ecosystem** | MCP Client Runtime, Autonomous Web Search, Deferred Tool Discovery, Mutation Approval Gate with interactive diff cards. |
| **Phase 3** | **Universal Multi-Format Artifacts** | Stream Interceptor, Tiptap Markdown Editor, Sandboxed Iframe Preview, DOCX/PDF/PPTX/XLSX generator suite. |
| **Phase 4** | **Progressive Skills & Multimodal** | 3-Level Skill System (Core, Deferred, Dynamic), Multi-Agent Research Orchestrator, Multimodal Image/Video upload pipeline. |

---

## 9. Triple Verification Protocol

Every phase must pass a triple verification gate before being marked complete:
1. **Automated Unit & Integration Tests**: `vitest` suite testing Gateway parsing, Planner JSON validation, Tool dispatching, and Approval token expiration.
2. **Type Safety & Build Check**: Zero TypeScript errors via `npm run build`.
3. **Live Browser Verification**: Automated browser subagent navigating `http://localhost:3000` to test end-to-end chat streaming, thinking accordions, tool search chips, stop generation, and split-screen artifact interaction.

---

*This document is the definitive master record for the Infinall Chat codebase.*
