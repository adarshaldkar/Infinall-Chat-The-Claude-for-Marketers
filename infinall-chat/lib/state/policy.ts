// ============================================================
// Agent Execution Governance Policy
// Configurable limits, circuit breakers, and timeouts
// ============================================================

export interface AgentPolicy {
  maxTurns: number;              // Maximum autonomous LLM iterations (default 5)
  maxToolCallsPerTurn: number;   // Maximum parallel tool calls per turn (default 4)
  toolTimeoutMs: number;         // Timeout for individual tool execution (default 20,000ms)
  requestTimeoutMs: number;      // Total agent loop timeout (default 60,000ms)
  totalTokenBudget: number;      // Maximum token usage guardrail (default 64,000 tokens)
  allowParallelExecution: boolean;// Execute independent read tools in parallel (default true)
}

export const DEFAULT_AGENT_POLICY: AgentPolicy = {
  maxTurns: 5,
  maxToolCallsPerTurn: 4,
  toolTimeoutMs: 20_000,
  requestTimeoutMs: 60_000,
  totalTokenBudget: 64_000,
  allowParallelExecution: true,
};
