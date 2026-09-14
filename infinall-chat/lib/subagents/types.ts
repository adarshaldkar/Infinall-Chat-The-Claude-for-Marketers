// ============================================================
// Infinall Chat - Multi-Agent Subagent Orchestrator Types
// ============================================================

import { SourceCitation } from '@/lib/gateway/types';

export type WorkerKind = 'competitor' | 'pricing' | 'serp' | 'creative' | 'general';

export interface SubagentTask {
  id: string;
  workerKind: WorkerKind;
  name: string;
  goal: string;
  parameters: Record<string, unknown>;
}

export interface SubagentFinding {
  subagentId: string;
  workerKind: WorkerKind;
  taskName: string;
  summary: string;
  dataPoints: Array<{ key: string; value: string | number }>;
  sources: SourceCitation[];
  executionTimeMs: number;
}

export type SubagentEventType =
  | 'subagent_spawn'
  | 'subagent_progress'
  | 'subagent_complete'
  | 'subagent_error'
  | 'synthesis_start'
  | 'synthesis_complete';

export interface SubagentProgressEvent {
  type: SubagentEventType;
  payload: {
    subagentId: string;
    workerKind?: WorkerKind;
    taskName?: string;
    stepMessage?: string;
    progressPercent?: number;
    sourcesCount?: number;
    finding?: SubagentFinding;
    error?: string;
    synthesis?: {
      summary: string;
      totalSources: number;
      findings: SubagentFinding[];
    };
  };
}
