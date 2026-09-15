// ============================================================
// Infinall Chat - Universal Artifact Stream Interceptor
// Detects <antArtifact> and <artifact> tags in streaming text and routes:
// - Outside text → text_delta (to chat)
// - Inside text → artifact_open / artifact_delta / artifact_complete (to right pane)
// ============================================================

import { CanonicalSSEEvent } from '../gateway/types';
import { ArtifactType } from './types';

interface ArtifactState {
  id: string;
  type: ArtifactType;
  title: string;
  language?: string;
  buffer: string;
  identifier?: string;
  closingTag: string;
}

export class ArtifactInterceptor {
  private state: ArtifactState | null = null;
  private rawBuffer = '';
  private idCounter = 0;

  // Process incoming text delta and yield the canonical events
  processDelta(delta: string): CanonicalSSEEvent[] {
    this.rawBuffer += delta;
    const events: CanonicalSSEEvent[] = [];

    while (this.rawBuffer.length > 0) {
      if (!this.state) {
        // Check for opening tags: <antArtifact ...> or <artifact ...>
        // Regex handles attributes in any order: identifier, type, title, language
        const antMatch = this.rawBuffer.match(
          /<antArtifact\s+([^>]*?)>/i
        );
        const standardMatch = this.rawBuffer.match(
          /<artifact\s+([^>]*?)>/i
        );

        let match = antMatch;
        let isAntTag = true;

        if (!match || (standardMatch && (standardMatch.index ?? 0) < (match.index ?? 0))) {
          match = standardMatch;
          isAntTag = false;
        }

        if (match && match.index !== undefined) {
          // 1. Emit text before opening tag to chat
          const beforeTag = this.rawBuffer.slice(0, match.index);
          if (beforeTag) {
            events.push({ type: 'text_delta', payload: { delta: beforeTag } });
          }

          const rawAttrs = match[1];
          const typeMatch = rawAttrs.match(/type=["']([^"']+)["']/i);
          const titleMatch = rawAttrs.match(/title=["']([^"']+)["']/i);
          const idMatch = rawAttrs.match(/identifier=["']([^"']+)["']/i);
          const langMatch = rawAttrs.match(/language=["']([^"']+)["']/i);

          const rawType = (typeMatch ? typeMatch[1].toLowerCase() : 'html') as string;
          const validTypes: ArtifactType[] = [
            'html',
            'react',
            'markdown',
            'docx',
            'pptx',
            'xlsx',
            'pdf',
            'video',
            'chart',
            'mermaid',
            'svg',
            'code',
          ];
          const type: ArtifactType = validTypes.includes(rawType as ArtifactType)
            ? (rawType as ArtifactType)
            : 'html';

          const title = titleMatch ? titleMatch[1] : 'Interactive Deliverable';
          const identifier = idMatch ? idMatch[1] : `artifact-${++this.idCounter}`;
          const id = identifier;
          const language = langMatch
            ? langMatch[1]
            : type === 'html'
            ? 'html'
            : type === 'react'
            ? 'tsx'
            : type === 'xlsx' || type === 'pptx' || type === 'chart'
            ? 'json'
            : type === 'mermaid'
            ? 'mermaid'
            : 'markdown';

          const closingTag = isAntTag ? '</antArtifact>' : '</artifact>';

          this.state = {
            id,
            type,
            title,
            language,
            buffer: '',
            identifier,
            closingTag,
          };

          // 2. Emit artifact_open event to right workspace pane
          events.push({
            type: 'artifact_open',
            payload: {
              id,
              title,
              type: type as ArtifactType,
              language,
            },
          });

          // 3. Advance raw buffer past opening tag
          this.rawBuffer = this.rawBuffer.slice(match.index + match[0].length);
        } else {
          // Check for partial tag at end of buffer
          const partialMatch = this.rawBuffer.match(/<(?:antArtifact|artifact)[^>]*$/i);
          if (partialMatch && partialMatch.index !== undefined) {
            const safeText = this.rawBuffer.slice(0, partialMatch.index);
            if (safeText) {
              events.push({ type: 'text_delta', payload: { delta: safeText } });
            }
            this.rawBuffer = this.rawBuffer.slice(partialMatch.index);
            break;
          } else {
            // Plain chat text
            events.push({ type: 'text_delta', payload: { delta: this.rawBuffer } });
            this.rawBuffer = '';
          }
        }
      } else {
        // Inside artifact: search for closing tag
        const closingTag = this.state.closingTag;
        const closeIdx = this.rawBuffer.toLowerCase().indexOf(closingTag.toLowerCase());

        if (closeIdx === -1) {
          // Check for partial closing tag
          const partialPattern = new RegExp(`</(?:antArtifact|artifact)?[^>]*$`, 'i');
          const partialClose = this.rawBuffer.match(partialPattern);
          if (partialClose && partialClose.index !== undefined) {
            const safeDelta = this.rawBuffer.slice(0, partialClose.index);
            if (safeDelta) {
              this.state.buffer += safeDelta;
              events.push({
                type: 'artifact_delta',
                payload: { id: this.state.id, delta: safeDelta },
              });
            }
            this.rawBuffer = this.rawBuffer.slice(partialClose.index);
            break;
          } else {
            // All buffer is artifact content
            this.state.buffer += this.rawBuffer;
            events.push({
              type: 'artifact_delta',
              payload: { id: this.state.id, delta: this.rawBuffer },
            });
            this.rawBuffer = '';
          }
        } else {
          // Found closing tag
          const finalChunk = this.rawBuffer.slice(0, closeIdx);
          if (finalChunk) {
            this.state.buffer += finalChunk;
            events.push({
              type: 'artifact_delta',
              payload: { id: this.state.id, delta: finalChunk },
            });
          }

          // Strip surrounding triple backtick code fences inside artifact if present
          let cleanContent = this.state.buffer.trim();
          if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
            const lines = cleanContent.split('\n');
            if (lines.length >= 2) {
              cleanContent = lines.slice(1, -1).join('\n').trim();
            }
          }

          events.push({
            type: 'artifact_complete',
            payload: {
              id: this.state.id,
              fullContent: cleanContent,
              version: 1,
            },
          });

          this.rawBuffer = this.rawBuffer.slice(closeIdx + closingTag.length);
          this.state = null;
        }
      }
    }

    return events;
  }

  // Flush remaining buffer at end of stream
  flush(): CanonicalSSEEvent[] {
    const events: CanonicalSSEEvent[] = [];
    if (this.state && this.rawBuffer) {
      this.state.buffer += this.rawBuffer;
      let cleanContent = this.state.buffer.trim();
      if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
        const lines = cleanContent.split('\n');
        if (lines.length >= 2) {
          cleanContent = lines.slice(1, -1).join('\n').trim();
        }
      }
      events.push({
        type: 'artifact_delta',
        payload: { id: this.state.id, delta: this.rawBuffer },
      });
      events.push({
        type: 'artifact_complete',
        payload: {
          id: this.state.id,
          fullContent: cleanContent,
          version: 1,
        },
      });
      this.state = null;
    } else if (this.rawBuffer) {
      events.push({ type: 'text_delta', payload: { delta: this.rawBuffer } });
    }
    this.rawBuffer = '';
    return events;
  }

  reset() {
    this.state = null;
    this.rawBuffer = '';
  }
}
