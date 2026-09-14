// ============================================================
// Infinall Chat - Tool Safety & Execution Context Types
// ============================================================

export type ToolSafety = 'read_only' | 'mutation_approval_required';
export type ToolSource = 'builtin' | 'mcp';

export interface ToolExecutionContext {
  sessionId: string;
  requestId: string;
  signal?: AbortSignal;
}

export interface ToolDefinitionLike {
  name: string;
  displayName: string;
  description: string;
  source: ToolSource;
  safety: ToolSafety;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
