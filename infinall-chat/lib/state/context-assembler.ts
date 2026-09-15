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
 *
 * This is significantly better than just clipping characters from recent messages,
 * which destroys mid-conversation context without any summary.
 *
 * Future: replace the summarized-older-messages section with an LLM-generated
 * summary of the dropped history (semantic compaction).
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
    // No budget for history head — return tail only
    return { messages: tail, compacted: true };
  }

  // Phase 2: Include as many earlier messages as fit, keeping each trimmed to
  // a short prefix so the model retains conversational grounding.
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

  const promptChars = blocks.length + history.messages.reduce((total, message) => total + messageToText(message).length, 0);
  return {
    systemPrompt: blocks,
    messages: history.messages,
    estimatedTokens: Math.ceil(promptChars / 3.8),
    compacted: history.compacted,
  };
}
