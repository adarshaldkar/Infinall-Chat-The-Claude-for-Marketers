// ============================================================
// Canonical SSE Event Protocol
// All provider-specific streams are normalized into these types
// before they reach the agent loop or the UI.
// ============================================================

export interface SourceCitation {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon?: string;
}

export interface MutationDiff {
  account?: string;
  campaignName?: string;
  budgetChange?: string;
  audienceTargeting?: string;
  dailySpend?: string;
  rawParams?: Record<string, unknown>;
}

export type CanonicalSSEEvent =
  | { type: 'plan_start'; payload: { taskId: string } }
  | {
      type: 'plan_complete';
      payload: {
        taskType: string;
        recommendedModel: string;
        candidateTools: string[];
        expectedArtifactType: string | null;
      };
    }
  | { type: 'thinking_delta'; payload: { delta: string; elapsedSeconds?: number } }
  | { type: 'status'; payload: { message: string } }
  | { type: 'tool_call_start'; payload: { callId: string; toolName: string; query?: string } }
  | { type: 'tool_call_delta'; payload: { callId: string; argsChunk: string } }
  | { type: 'tool_call_end'; payload: { callId: string; toolName: string; args: Record<string, unknown> } }
  | { type: 'tool_call_result'; payload: { callId: string; toolName: string; result: unknown; sources?: SourceCitation[] } }
  | {
      type: 'approval_required';
      payload: {
        executionId: string;
        toolName: string;
        actionSummary: string;
        diff: MutationDiff;
        expiresAt: number;
      };
    }
  | { type: 'text_delta'; payload: { delta: string } }
  | {
      type: 'artifact_open';
      payload: {
        id: string;
        title: string;
        type: 'html' | 'react' | 'markdown' | 'docx' | 'pptx' | 'xlsx';
        language: string;
      };
    }
  | { type: 'artifact_delta'; payload: { id: string; delta: string } }
  | { type: 'artifact_complete'; payload: { id: string; fullContent: string; version: number } }
  | {
      type: 'usage_metadata';
      payload: {
        promptTokens: number;
        completionTokens: number;
        cacheReadTokens?: number;
        cacheWriteTokens?: number;
        latencyMs: number;
        model: string;
      };
    }
  | { type: 'error'; payload: { message: string; code: string; recoverable: boolean } }
  | { type: 'done'; payload: { finishReason: string } };

// ============================================================
// LLM Message Types
// ============================================================

export interface LLMTextContent {
  type: 'text';
  text: string;
}

export interface LLMToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string | Array<{ type: string; text: string }>;
}

export interface LLMThinkingContent {
  type: 'thinking';
  thinking: string;
}

export type LLMContentBlock =
  | LLMTextContent
  | LLMToolUseContent
  | LLMToolResultContent
  | LLMThinkingContent;

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string | LLMContentBlock[];
}

// ============================================================
// Tool Call Request (assembled after stream buffering)
// ============================================================

export interface ToolCallRequest {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
}

// ============================================================
// Agent Policy (circuit breakers - all configurable)
// ============================================================

export interface AgentPolicy {
  maxTurns: number;
  maxToolCallsPerTurn: number;
  toolTimeoutMs: number;
  requestTimeoutMs: number;
}

export const DEFAULT_AGENT_POLICY: AgentPolicy = {
  maxTurns: 10,
  maxToolCallsPerTurn: 5,
  toolTimeoutMs: 15_000,
  requestTimeoutMs: 120_000,
};
