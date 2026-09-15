// ============================================================
// Recursive Sliding-Window Chunker Engine
// Patterned after psychiatric_LLM_Project/backend/app/rag/chunker.py
// Works seamlessly with Canonical Ingestion ParsedDocument
// ============================================================

import crypto from 'crypto';
import { ParsedDocument } from '@/lib/ingestion/types';

export interface TextChunk {
  id: string;
  chunkIndex: number;
  pageNumber: number;
  sectionTitle?: string;
  content: string;
  tokenCount: number;
  charCount: number;
  chunkHash: string;
  metadata: Record<string, unknown>;
}

export interface ChunkerOptions {
  targetTokens?: number; // Default: 512 (~1945 chars at 3.8 chars/token)
  overlapTokens?: number; // Default: 64 (~243 chars)
  minChunkTokens?: number; // Default: 40 (~152 chars)
}

// More accurate than /4. GPT-4 averages ~3.8 chars per token for English text.
// Use this approximation unless `tiktoken` is available.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.8);
}

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function chunkDocument(
  doc: ParsedDocument | any,
  options: ChunkerOptions = {}
): TextChunk[] {
  // 512 target, 64 overlap = agreed production spec
  const targetChars = (options.targetTokens ?? 512) * 4;
  const overlapChars = (options.overlapTokens ?? 64) * 4;
  const minChars = (options.minChunkTokens ?? 40) * 4;

  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  // Build normalized units to chunk (pages, slides, or sections)
  interface ChunkUnit {
    pageNumber: number;
    sectionTitle: string;
    text: string;
  }

  const units: ChunkUnit[] = [];

  if (doc.pages && Array.isArray(doc.pages) && doc.pages.length > 0) {
    doc.pages.forEach((p: any) => {
      units.push({
        pageNumber: p.pageNumber || 1,
        sectionTitle: p.sectionTitle || doc.title,
        text: p.text || '',
      });
    });
  } else if (doc.slides && Array.isArray(doc.slides) && doc.slides.length > 0) {
    doc.slides.forEach((s: any) => {
      units.push({
        pageNumber: s.slideNumber || 1,
        sectionTitle: s.title || `Slide ${s.slideNumber}`,
        text: s.text || '',
      });
    });
  } else if (doc.sections && Array.isArray(doc.sections) && doc.sections.length > 0) {
    doc.sections.forEach((sec: any, idx: number) => {
      units.push({
        pageNumber: sec.pageNumber || sec.slideNumber || idx + 1,
        sectionTitle: sec.heading || doc.title,
        text: sec.text || '',
      });
    });
  } else {
    // Fallback single unit
    units.push({
      pageNumber: 1,
      sectionTitle: doc.title || 'Document',
      text: doc.text || doc.fullText || '',
    });
  }

  // Process unit by unit
  for (const unit of units) {
    const unitText = unit.text.trim();
    if (!unitText) continue;

    if (unitText.length <= targetChars) {
      const hash = computeHash(unitText);
      chunks.push({
        id: crypto.randomUUID(),
        chunkIndex: chunkIndex++,
        pageNumber: unit.pageNumber,
        sectionTitle: unit.sectionTitle,
        content: unitText,
        tokenCount: estimateTokens(unitText),
        charCount: unitText.length,
        chunkHash: hash,
        metadata: {
          documentTitle: doc.title,
          sourceType: doc.sourceType || doc.metadata?.fileType || 'document',
          pageNumber: unit.pageNumber,
          sectionTitle: unit.sectionTitle,
        },
      });
      continue;
    }

    // Sliding window chunking across paragraph boundaries
    const paragraphs = unitText.split(/\n\s*\n/);
    let currentBuffer = '';

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if (currentBuffer.length + trimmedPara.length + 2 <= targetChars) {
        currentBuffer += (currentBuffer ? '\n\n' : '') + trimmedPara;
      } else {
        if (currentBuffer.length >= minChars) {
          const hash = computeHash(currentBuffer);
          chunks.push({
            id: crypto.randomUUID(),
            chunkIndex: chunkIndex++,
            pageNumber: unit.pageNumber,
            sectionTitle: unit.sectionTitle,
            content: currentBuffer,
            tokenCount: estimateTokens(currentBuffer),
            charCount: currentBuffer.length,
            chunkHash: hash,
            metadata: {
              documentTitle: doc.title,
              sourceType: doc.sourceType || doc.metadata?.fileType || 'document',
              pageNumber: unit.pageNumber,
              sectionTitle: unit.sectionTitle,
            },
          });

          const words = currentBuffer.split(/\s+/);
          const overlapWords = words.slice(-Math.floor(overlapChars / 5)).join(' ');
          currentBuffer = overlapWords + '\n\n' + trimmedPara;
        } else {
          currentBuffer += (currentBuffer ? '\n\n' : '') + trimmedPara;
        }
      }
    }

    if (currentBuffer.trim().length >= minChars) {
      const hash = computeHash(currentBuffer.trim());
      chunks.push({
        id: crypto.randomUUID(),
        chunkIndex: chunkIndex++,
        pageNumber: unit.pageNumber,
        sectionTitle: unit.sectionTitle,
        content: currentBuffer.trim(),
        tokenCount: estimateTokens(currentBuffer.trim()),
        charCount: currentBuffer.trim().length,
        chunkHash: hash,
        metadata: {
          documentTitle: doc.title,
          sourceType: doc.sourceType || doc.metadata?.fileType || 'document',
          pageNumber: unit.pageNumber,
          sectionTitle: unit.sectionTitle,
        },
      });
    }
  }

  return chunks;
}
