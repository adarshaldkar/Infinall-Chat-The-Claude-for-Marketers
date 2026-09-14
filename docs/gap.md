# Infinall Chat — Gap Analysis & Mock/Hardcoding Inventory

**Generated:** 2026-09-14
**Sources:** PRD (`docs/PRD_Infinall_Chat_Phase1_v2 1.md`), Phase 1–4 specs, `docs/detailed.md`, audit files, code inspection, live test runs.

---

## Part A — PRD / Phase-Spec Items NOT Built

| # | Item | Spec Source | Status |
|---|---|---|---|
| G01 | Voice dictation UI (mic + live waveform + `idle→recording→processing→transcribed` state machine) | phase_1 §4 item 12, detailed.md §8.12 | **Not built** (transcribe API exists, no recording UI) |
| G02 | Audio→model integration: upload audio, transcribe speech into message context | PRD §16.1 | API exists (`/api/transcribe`, audio.ts) but mock-only unless real speech key |
| G03 | SVG artifact renderer (`SvgViewer`) | phase_1 §5.2, phase_3 §4.2 | **Not built** — no SVG case in `ArtifactRendererRegistry` |
| G04 | Video artifact player (inline `<video>`) | PRD §5.1, detailed.md §9.7 | **Not built** |
| G05 | Real DOCX / PPTX / PDF artifact **preview** (binary viewer) | phase_1 §5.1 | Not built — docx/pdf/pptx render as the markdown editor in `ArtifactRendererRegistry.tsx:42-52` |
| G06 | TipTap / Lexical WYSIWYG rich-text editor (GFM tables, callouts, task lists, LaTeX) | PRD §9.2, phase_3 §4.2.2 | Not built — custom React markdown editor; no `tiptap` dependency in package.json |
| G07 | `Header.tsx` top nav (project selector, share button) | phase_1 §2 | **Not built** |
| G08 | `/api/health` (health + latency monitor) | phase_1 §2 | **Not built** |
| G09 | `/api/models` (model catalog listing & status) | phase_1 §2 | **Not built** |
| G10 | `MessageList.tsx` virtualized message stream | phase_1 §2 | Not built (ChatWorkspace renders a plain list) |
| G11 | `CitationBadge.tsx` interactive `[1]` popover with favicon + source popover | phase_1 §4 item 5 | **Not built** (flat citation rendering only) |
| G12 | Telemetry / debug trace drawer (tokens, cache hits, latency — `Cmd+Opt+D`) | phase_1 §4 item 17/22 | **Not built** |
| G13 | Google Drive export for all artifact types | PRD §5.4, detailed.md §9.4 | **Not built** |
| G14 | Send artifact into Infinall Approval Center workflow | PRD §5.4 | **Not built** |
| G15 | Supabase persistence: `chat_sessions` / `chat_messages` tables, tsvector full-text search across history | PRD §11, phase_2 §10 | **Not built** — sessions persist to `localStorage` only (`lib/state/session-store.ts`) |
| G16 | Session rename / pin / archive / "delete all history" with 30-day soft-delete | PRD §11.1, §11.4 | Partially — delete exists only |
| G17 | Search sessions + message content | PRD §11.3 | **Not built** |
| G18 | Export session transcript (Markdown/PDF) | PRD §12 | **Not built** |
| G19 | Edit & resend → conversation **branching** UI (`< 1 of 2 >`) | PRD §12, phase_1 §4 item 2 | Verify: UserMessage has branch switcher but regenerated-turn tree not confirmed wired server-side |
| G20 | Context compaction / token-budget guard (`context-guard.ts`, compactor) | detailed.md §5, phase_2 §3 | **Not built** |
| G21 | Prompt-cache prefix order across multi-turn tool loops + cache metrics | detailed.md §5 | Partial — only `cache_control: ephemeral` on system prompt (`anthropic.ts:32-34`) |
| G22 | **Extended thinking actually enabled** | phase_1 §1, §3.B | **Disabled** — commented out (`anthropic.ts:41-45`) |
| G23 | `/api/artifacts/snapshot` version store persistence | phase_3 §3 | **Not built** — version store is in-memory/client-side |
| G24 | Artifact templates (paid-media-plan, strategy-memo, pitch-deck) | phase_3 §3 | **Not built** |
| G25 | `ArtifactViewToggle` (preview/code + device-mode switchers) | phase_3 §3 | Not built as its own component |
| G26 | `SvgViewer`, video player components | detailed.md §9 | **Not built** |
| G27 | `SubagentTaskCard`, `CreativeVisionInspector`, `FileDropzoneOverlay` | phase_4 §3 | **Not built** (progress tree + attachment bar exist) |
| G28 | Custom workspace skills (`.infinall/skills/*.md` Level 3 loading) | phase_4 §4.1 | **Not built** — catalog + resolver only |
| G29 | Skill creation UI / Skills settings page / SkillDetailModal | PRD §15.3, phase_4 §3 | **Not built** (SkillsMenuPopover only) |
| G30 | **100+ tools** — directory has **54** entries | PRD §6, phase_4 §4.3 | **Shortfall** — 54 catalogued |
| G31 | Tools settings page (account-wide connect/manage) + per-tool connection status UI | PRD §6.2 | Not built (modal-only read-only directory) |
| G32 | `network`: real OAuth credential vault (encrypted secret storage), never passed to model | PRD §6.3 | **Not built** — env-var based mock |
| G33 | BullMQ / Redis background jobs for research + crawling | PRD §9.3, §13.1 | **Not built** (synchronous orchestration) |
| G34 | Model chip correctness per message (which model actually generated it) | PRD §2, §12 | Partial — chip exists, real per-message attribution not verified |
| G35 | Keyboard shortcuts (`Cmd/Ctrl+K` new chat, `Esc` close artifact) | PRD §12 | Partial — Enter/Shift+Enter only confirmed |
| G36 | Test reproducibility out of the box | phase_1 §7, phase_2 §8 | **Broken** — `npm run test` fails at T04 unless `APPROVAL_HMAC_SECRET` is set (tsx doesn't load `.env`) |

---

## Part B — Claude.ai Features NOT Built (parity gaps)

| # | Claude.ai feature | Infinall status |
|---|---|---|
| C01 | **Projects** (per-project custom instructions + knowledge base) | Not built |
| C02 | **Memory** (preferences remembered across chats) | Not built |
| C03 | **Conversation search** across full history | Not built (G15–G17) |
| C04 | **Share / publish links** for chats & artifacts | Not built |
| C05 | **Voice mode / voice input UI** (desktop+web) | Half-built (G01) |
| C06 | **Desktop / mobile apps** | Out of scope (web demo) |
| C07 | **Real Connectors** (OAuth'd Drive, Slack, GitHub, Notion, etc.) | Directory UI over mocks; no OAuth flow |
| C08 | **Custom instructions / profile-level settings** | Not built |
| C09 | **1M-token context + auto-compaction** | Not built (G20) |
| C10 | **Web search grounded citations** (real result cards) | Real search (DuckDuckGo), citations minimal |
| C11 | **Extended thinking / reasoning on** | Disabled (G22) |
| C12 | **Artifact version history + one-click revert** | **Built** ✓ |
| C13 | **Artifact types: HTML/React/SVG/markdown/code** | HTML, markdown, code ✓ — **SVG missing** (G03) |
| C14 | **Model picker (Auto / Sonnet / Opus / Haiku)** | Built ✓ (4 models) |
| C15 | **Vision / image upload** | Built (real vision model when API key + image present) ✓ |
| C16 | **PDF / document upload** | Built (parser) ✓ |
| C17 | **Session sidebar: rename / delete / pin** | Partial (G16) |
| C18 | **Regenerate / retry, stop generation** | Built ✓ |

---

## Part C — Mock / HARDCODED Inventory (the honest "is this real" list)

Legend: 🔴 hardcoded fixture · 🟡 partly real / config-driven · 🟢 genuinely real

### Data / intelligence layer — mostly 🔴 by default

| File | Verdict | What it does |
|---|---|---|
| `lib/mcp/adapters/ga4-adapter.ts` | 🔴 | Returns fixed numbers (48,250 sessions, $42.18 CPA) unless `MCP_MODE=live`; "live" still POSTs to placeholder `api.infinall.ai/mcp/ga4` |
| `lib/mcp/adapters/meta-ads-adapter.ts` | 🔴 | Hardcoded `Q3 SaaS Growth - Retargeting` campaigns; mutate returns fake `transactionId`. Same `MCP_MODE` caveat |
| `lib/mcp/adapters/google-ads-adapter.ts` | 🔴 | Same mock/live pattern (verify) |
| `lib/mcp/adapters/firecrawl-adapter.ts` | 🟡 | Mock mode returns canned pricing-markdown; live mode unverified |
| `lib/tools/directory-catalog.ts` | 🔴 | 54 tools, 45+ flagged `status: 'mock'` |
| `lib/multimodal/audio.ts` | 🔴 | Returns demo transcript unless a real speech API key `!== 'mock'`/`'demo'` is set |
| `lib/multimodal/vision.ts` | 🟡 | **Real** vision-model call when base64 image + `LLM_GATEWAY_API_KEY` present; else hardcoded heuristic scores (7.5–9.0) |
| `lib/tools/web-search.ts` | 🟢 | **Real** search via DuckDuckGo Instant Answer API (no key); fallback emits a fake `google.com/search` citation |
| `lib/subagents/workers/*` | 🟡 | Real LLM call if `LLM_GATEWAY_API_KEY` set, else returns `[Subagent LLM call skipped...]` |
| `app/api/mcp/servers/route.ts` | 🔴 | `MCP_MODE === 'live' ? 'live' : 'mock'` hard switch |

### Engineering core — genuinely real 🟢

| File | Verdict |
|---|---|
| `lib/gateway/anthropic.ts`, `openai.ts`, `index.ts`, `catalog.ts` | 🟢 Real HTTP adapter + stream normalization, tool-arg buffering, cache_control |
| `lib/state/planner.ts` | 🟢 Real LLM planning call (JSON-parse/schema fallbacks) |
| `lib/state/agent-loop.ts` | 🟢 Real 0→N tool loop, parallel dispatch, abort |
| `lib/tools/approval/signer.ts`, `store.ts`, `diff-builder.ts`, `audit-logger.ts` | 🟢 Real HMAC-SHA256, 5-min TTL, single-use, **fail-closed on missing secret** |
| `lib/artifacts/generators/{docx,pdf,pptx,xlsx}-builder.ts` | 🟢 Real binary generation |
| `lib/artifacts/interceptor.ts`, `version-store.ts` | 🟢 Real tag parsing + immutable snapshots + diff |
| `lib/mcp/client.ts` + transports + adapters | 🟡 Real MCP SDK transport plumbing around 🔴 mock mode |
| `lib/multimodal/parser.ts` | 🟢 Real PDF/DOCX/CSV extraction (pdf-parse, mammoth, exceljs) |
| `app/api/upload/route.ts` | 🟢 Real size/MIME/magic-byte validation + real extraction/vision paths |
| Tests (`tests/*.ts`) | 🟡 Deterministic mocks are intentional, but they assert the 🔴 fixtures, so green ≠ live-capable |

### The "hardcoded" verdict

**Yes** — In the default (no `MCP_MODE=live`, no vendor keys) configuration the product is largely hardcoded:

1. **All 6 "100+ marketing tools" are fixed fixtures** with invented numbers. Flip to live and the code still POSTs to a made-up hostname (`api.infinall.ai/mcp/...`) that has no real Meta / Google / Firecrawl wiring behind it.
2. **~45 of 54 directory entries** self-report as `mock`.
3. **Vision falls back to canned scores**, audio to a demo transcript, when keys are absent. Web search (DuckDuckGo) and the LLM gateway are the only genuinely live data paths.

The **architecture is real** (gateway, agent loop, HMAC approvals, binary generators, artifact interceptor are genuine, tested code). What's fake is the *connected-data layer*, which is the core of the "Claude for Marketers" pitch. Closing the hardcoded gap = real MCP/OAuth connectors + honest fallbacks, not more UI.

---

## Part D — Fix Priority (recommended order)

1. **P1 Security hardening** — finish auth gating on `/api/chat`, `/api/upload`, `/api/research/stream`; ensure approval secrets/IDs rotated; verify artifact sandbox CSP.
2. **P1 Test reproducibility** — load `.env*` in test scripts so `npm run test` passes with zero setup.
3. **P1 Deliverable packaging** — the flattened ZIP (130 files, duplicate `route.ts`/`catalog.ts` names) must preserve the tree; confirm via `git archive`.
4. **P2 Real data layer** — wire at least 2–3 real connectors (Firecrawl scrape + one analytics read) behind OAuth; keep mocks only as explicit fallback with visible "Mock" badges.
5. **P2 100+ directory** — expand 54 → 100+ entries or renounce the "100+" claim.
6. **P2 Vision & audio honesty** — real vision path works; add a clear "unavailable" state instead of fabricating scores when keys absent.
7. **P3 High-visibility parity** — SVG renderer, DOCX/PDF/PPTX preview, TipTap editor, model chip per message, stop/branch UX verification.
8. **P3 Persistence** — Supabase session tables + search, or explicitly document localStorage as Phase-1 scope.