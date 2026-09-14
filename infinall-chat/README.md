# Infinall Chat — Phase 1

The Claude for Marketers. An autonomous AI workspace for growth leaders, campaign operators, and brand strategists.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| UI | shadcn/ui + Tailwind CSS v4 |
| Icons | lucide-react |
| AI Gateway | Custom proxy (Anthropic + OpenAI protocol) |
| Streaming | Native SSE — ReadableStream |
| Layout | react-resizable-panels |
| Validation | Zod |

## Quick Start

```bash
# 1. Clone and enter directory
cd infinall-chat

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# Edit .env.local and add your credentials

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `LLM_GATEWAY_BASE_URL` | Base URL of your LLM proxy (e.g. `https://llm.ganeshnayak.in`) |
| `LLM_GATEWAY_API_KEY` | API key for authenticating with the proxy |

See `.env.example` for the full template.

## Models

| Model | Protocol | Endpoint |
|---|---|---|
| `claude-sonnet-4-6` | Anthropic `/v1/messages` | Default — best for copywriting & campaigns |
| `claude-opus-5` | Anthropic `/v1/messages` | Best for deep strategy & analysis |
| `Kimi-K2.6` | OpenAI `/v1/chat/completions` | Fast, cost-effective for simple tasks |

## Architecture

```
User → Composer
  → POST /api/chat (SSE)
    → Planner (task classification + model routing)
    → Agent Loop (0→N tool iterations)
      → web_search (read — runs autonomously)
      → meta_ads_* (write — requires approval)
    → Artifact Interceptor (detects <artifact> tags)
  → ChatWorkspace (SSE state machine)
    → ThinkingAccordion, ToolAccordion, ArtifactPanel
```

## Key Invariants

- **Never execute partial tool args** — only Zod-validated, fully-buffered args run
- **Backend approvals only** — all mutation approval tokens are validated server-side
- **Model routing by catalog** — never by name prefix (`startsWith("claude")`)
- **Secrets never in git** — `.env.local` is in `.gitignore`
