import { LLMMessage } from '@/lib/gateway/types';

export interface ContextAssemblyInput {
  systemInstructions?: string;
  projectInstructions?: string;
  brandMemory?: string;
  knowledgeContext?: string;
  toolIndex?: string;
  history: LLMMessage[];
  activeArtifact?: { id: string; title: string; type: string; content?: string } | null;
  maxHistoryChars?: number;
}

export interface AssembledContext {
  systemPrompt: string;
  messages: LLMMessage[];
  estimatedTokens: number;
  compacted: boolean;
}

function compactHistory(history: LLMMessage[], maxChars: number): { messages: LLMMessage[]; compacted: boolean } {
  const size = history.reduce((total, message) => total + JSON.stringify(message.content).length, 0);
  if (size <= maxChars) return { messages: history, compacted: false };

  const kept: LLMMessage[] = [];
  let remaining = maxChars;
  for (let index = history.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const message = history[index];
    const content = typeof message.content === 'string'
      ? message.content
      : message.content.map((block) => 'text' in block ? block.text : JSON.stringify(block)).join('\n');
    const clipped = content.slice(-Math.max(200, remaining));
    kept.unshift({ role: message.role, content: clipped });
    remaining -= clipped.length;
  }
  return { messages: kept, compacted: true };
}

export function assembleContext(input: ContextAssemblyInput): AssembledContext {
  const history = compactHistory(input.history, input.maxHistoryChars ?? 80_000);
  const blocks = [
    input.systemInstructions,
    input.projectInstructions ? `<project_instructions>\n${input.projectInstructions}\n</project_instructions>` : '',
    input.brandMemory,
    input.knowledgeContext,
    input.toolIndex ? `<available_capabilities>\n${input.toolIndex}\n</available_capabilities>` : '',
    input.activeArtifact
      ? `<active_artifact id="${input.activeArtifact.id}" type="${input.activeArtifact.type}">\n${input.activeArtifact.content?.slice(-20_000) ?? input.activeArtifact.title}\n</active_artifact>`
      : '',
  ].filter(Boolean).join('\n\n');

  const promptChars = blocks.length + history.messages.reduce((total, message) => total + JSON.stringify(message.content).length, 0);
  return {
    systemPrompt: blocks,
    messages: history.messages,
    estimatedTokens: Math.ceil(promptChars / 4),
    compacted: history.compacted,
  };
}
