import { LLMMessage } from '@/lib/gateway/types';

export interface ContextAssemblyInput {
  systemInstructions?: string;
  projectInstructions?: string;
  brandContext?: string;
  brandMemory?: string;
  memoryContext?: string;
  knowledgeContext?: string;
  connectedTools?: string | string[];
  toolIndex?: string;
  activeArtifact?: { id: string; title: string; type: string; content?: string } | null;
  multimodalContext?: string;
  skillContext?: string;
  history: LLMMessage[];
  maxHistoryChars?: number;
}

export interface AssembledContext {
  systemPrompt: string;
  messages: LLMMessage[];
  estimatedTokens: number;
  compacted: boolean;
  canonicalBlocks: {
    brandContext?: string;
    memoryContext?: string;
    knowledgeContext?: string;
    connectedTools?: string;
    activeArtifact?: string;
    multimodalContext?: string;
    skillContext?: string;
  };
}

/**
 * Extracts plain text from a message for length estimation and compaction.
 */
function messageToText(msg: LLMMessage): string {
  if (typeof msg.content === 'string') return msg.content;
  return msg.content
    .map((block) => {
      if ('text' in block) return block.text;
      if (block.type === 'image') return '[image]';
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Improved context compaction strategy:
 * 1. Always keep the LAST N messages intact (recent context is most valuable).
 * 2. For older messages beyond the budget: keep a short prefix of each to
 *    preserve conversational grounding rather than dropping them entirely.
 * 3. Image blocks are always preserved on the last user message.
 */
function compactHistory(
  history: LLMMessage[],
  maxChars: number
): { messages: LLMMessage[]; compacted: boolean } {
  const totalChars = history.reduce((sum, m) => sum + messageToText(m).length, 0);
  if (totalChars <= maxChars) {
    return { messages: history, compacted: false };
  }

  // Phase 1: Always keep the last 6 messages intact (≈ 3 turns)
  const ALWAYS_KEEP_LAST = 6;
  const tail = history.slice(-ALWAYS_KEEP_LAST);
  const head = history.slice(0, -ALWAYS_KEEP_LAST);

  const tailChars = tail.reduce((sum, m) => sum + messageToText(m).length, 0);
  const headBudget = Math.max(0, maxChars - tailChars);

  if (head.length === 0 || headBudget <= 0) {
    return { messages: tail, compacted: true };
  }

  // Phase 2: Include as many earlier messages as fit, keeping each trimmed
  const MAX_OLDER_MSG_CHARS = Math.floor(headBudget / Math.max(1, head.length));
  const CLIP_CHARS = Math.max(200, Math.min(MAX_OLDER_MSG_CHARS, 800));

  let usedChars = 0;
  const compactedHead: LLMMessage[] = [];

  for (let i = head.length - 1; i >= 0; i--) {
    const msg = head[i];
    const text = messageToText(msg);
    const clipped = text.slice(0, CLIP_CHARS);
    const clippedChars = clipped.length;

    if (usedChars + clippedChars > headBudget) break;

    compactedHead.unshift({
      role: msg.role,
      content: clipped + (text.length > CLIP_CHARS ? '...[earlier context]' : ''),
    });
    usedChars += clippedChars;
  }

  return {
    messages: [...compactedHead, ...tail],
    compacted: compactedHead.length < head.length || CLIP_CHARS < 800,
  };
}

export function assembleContext(input: ContextAssemblyInput): AssembledContext {
  const history = compactHistory(input.history, input.maxHistoryChars ?? 80_000);
  
  // Format discrete PRD XML blocks
  const brandBlock = input.brandContext 
    ? `<brand_context>\n${input.brandContext.trim()}\n</brand_context>` 
    : '';

  const memoryRaw = input.memoryContext || input.brandMemory;
  const memoryBlock = memoryRaw 
    ? (memoryRaw.startsWith('<memory_context>') ? memoryRaw : `<memory_context>\n${memoryRaw.trim()}\n</memory_context>`)
    : '';

  const knowledgeBlock = input.knowledgeContext
    ? (input.knowledgeContext.startsWith('<knowledge_context>') ? input.knowledgeContext : `<knowledge_context>\n${input.knowledgeContext.trim()}\n</knowledge_context>`)
    : '';

  const toolsList = Array.isArray(input.connectedTools) 
    ? input.connectedTools.join(', ') 
    : (input.connectedTools || input.toolIndex);
    
  const toolsBlock = toolsList 
    ? `<connected_tools>\n${toolsList.trim()}\n</connected_tools>`
    : '';

  const artifactBlock = input.activeArtifact
    ? `<active_artifact id="${input.activeArtifact.id}" type="${input.activeArtifact.type}" title="${input.activeArtifact.title}">\n${input.activeArtifact.content?.slice(-20_000) ?? input.activeArtifact.title}\n</active_artifact>`
    : '';

  const multimodalBlock = input.multimodalContext
    ? `<multimodal_context>\n${input.multimodalContext.trim()}\n</multimodal_context>`
    : '';

  const skillBlock = input.skillContext
    ? `<skill_context>\n${input.skillContext.trim()}\n</skill_context>`
    : '';

  const projectBlock = input.projectInstructions 
    ? `<project_instructions>\n${input.projectInstructions.trim()}\n</project_instructions>` 
    : '';

  const blocks = [
    input.systemInstructions,
    projectBlock,
    brandBlock,
    memoryBlock,
    knowledgeBlock,
    toolsBlock,
    artifactBlock,
    multimodalBlock,
    skillBlock,
  ].filter(Boolean).join('\n\n');

  const promptChars = blocks.length + history.messages.reduce((total, message) => total + messageToText(message).length, 0);
  
  return {
    systemPrompt: blocks,
    messages: history.messages,
    estimatedTokens: Math.ceil(promptChars / 3.8),
    compacted: history.compacted,
    canonicalBlocks: {
      brandContext: brandBlock || undefined,
      memoryContext: memoryBlock || undefined,
      knowledgeContext: knowledgeBlock || undefined,
      connectedTools: toolsBlock || undefined,
      activeArtifact: artifactBlock || undefined,
      multimodalContext: multimodalBlock || undefined,
      skillContext: skillBlock || undefined,
    }
  };
}
