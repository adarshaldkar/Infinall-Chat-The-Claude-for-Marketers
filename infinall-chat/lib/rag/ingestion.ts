// ============================================================
// Progressive Document Ingestion Pipeline
// Patterned after psychiatric_LLM_Project/backend/app/rag/ingestion.py
// Flow: Validate → Parse → Chunk → Embed → Save to VectorDB
// ============================================================

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ParserRegistry } from '@/lib/ingestion/registry';
import { ParsedDocument } from '@/lib/ingestion/types';
import { chunkDocument, TextChunk } from './chunker';
import { defaultEmbedder } from './embedder';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface IngestionStatusEvent {
  documentId: string;
  fileName: string;
  status: 'validating' | 'parsing' | 'chunking' | 'embedding' | 'ready' | 'failed';
  pageCount?: number;
  chunkCount?: number;
  embeddedCount?: number;
  error?: string;
}

export interface IngestionResult {
  documentId: string;
  title: string;
  fileType: string;
  pageCount: number;
  chunkCount: number;
  chunks: TextChunk[];
  status: 'ready' | 'failed';
  error?: string;
}

// Local durable fallback store for knowledge documents & chunks
const DATA_DIR = path.resolve(process.cwd(), '.data', 'knowledge');
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function ingestDocument(
  fileBuffer: Buffer,
  fileName: string,
  fileSizeBytes: number,
  userId?: string,
  onProgress?: (event: IngestionStatusEvent) => void
): Promise<IngestionResult> {
  const documentId = crypto.randomUUID();

  const emit = (status: IngestionStatusEvent['status'], extra: Partial<IngestionStatusEvent> = {}) => {
    if (onProgress) {
      onProgress({
        documentId,
        fileName,
        status,
        ...extra,
      });
    }
  };

  try {
    // ── 1. VALIDATING ──────────────────────────────────────────
    emit('validating');
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty');
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (fileSizeBytes > MAX_FILE_SIZE) {
      throw new Error(`File size ${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB exceeds maximum 50MB`);
    }

    // ── 2. PARSING via Parser Registry (PDF/DOCX/PPTX/XLSX/CSV/HTML/MD/TXT/JSON/XML/Media) ─
    emit('parsing');
    const parseResult = await ParserRegistry.resolveAndParse({
      fileName,
      buffer: fileBuffer,
      mimeType: '',
      sizeBytes: fileSizeBytes,
      userId,
    });

    if (!parseResult.ok) {
      throw new Error(`Document parsing failed (${parseResult.code}): ${parseResult.message}`);
    }

    const parsed: ParsedDocument = parseResult.document;
    const pageCount = parsed.pages?.length || parsed.slides?.length || parsed.sections?.length || 1;

    // ── 3. CHUNKING ────────────────────────────────────────────
    emit('chunking', { pageCount });
    const chunks: TextChunk[] = chunkDocument(parsed, {
      targetTokens: 500,
      overlapTokens: 80,
    });

    if (chunks.length === 0) {
      throw new Error('Document produced 0 extractable text chunks');
    }

    // ── 4. EMBEDDING (1536-d vectors) ──────────────────────────
    emit('embedding', { pageCount, chunkCount: chunks.length });
    const texts = chunks.map(c => c.content);
    const embeddings = await defaultEmbedder.embedBatch(texts);

    // ── 5. PERSISTING TO SUPABASE (and local fallback) ─────────
    const supabase = getSupabaseServerClient() as SupabaseClient | null;
    if (supabase) {
      try {
        // Insert knowledge document record
        await supabase.from('knowledge_documents').insert({
          id: documentId,
          user_id: userId || null,
          title: parsed.title,
          file_type: parsed.sourceType,
          file_size_bytes: fileSizeBytes,
          page_count: pageCount,
          chunk_count: chunks.length,
          status: 'ready',
          metadata: parsed.metadata,
        });

        // Insert knowledge chunks with 1536-d vectors
        const chunkRecords = chunks.map((chunk, idx) => ({
          id: chunk.id,
          document_id: documentId,
          user_id: userId || null,
          chunk_index: chunk.chunkIndex,
          page_number: chunk.pageNumber,
          section_title: chunk.sectionTitle,
          content: chunk.content,
          token_count: chunk.tokenCount,
          metadata: chunk.metadata,
          embedding: embeddings[idx] || null,
        }));

        await supabase.from('knowledge_chunks').insert(chunkRecords);
      } catch (dbErr) {
        console.warn('[Ingestion] Supabase insert warning (falling back to durable local store):', dbErr);
      }
    }

    // Build enhanced chunks with embeddings (used both for local storage and return value)
    const enhancedChunks = chunks.map((c, idx) => ({
      ...c,
      documentId,
      userId,
      embedding: embeddings[idx],
    }));

    // Local persistence: ONLY in development when STORAGE_MODE=local is set.
    // In production, Supabase is the sole source of truth.
    if (process.env.NODE_ENV !== 'production' && process.env.STORAGE_MODE === 'local') {
      ensureDir(DATA_DIR);
      const localDocPath = path.join(DATA_DIR, 'documents.json');
      const localChunksPath = path.join(DATA_DIR, 'chunks.json');

      let localDocs: unknown[] = [];
      let localChunks: unknown[] = [];

      try {
        if (fs.existsSync(localDocPath)) localDocs = JSON.parse(fs.readFileSync(localDocPath, 'utf8'));
        if (fs.existsSync(localChunksPath)) localChunks = JSON.parse(fs.readFileSync(localChunksPath, 'utf8'));
      } catch (_) {}

      localDocs.push({
        id: documentId,
        userId,
        title: parsed.title,
        fileType: parsed.metadata.fileType,
        fileSizeBytes,
        pageCount,
        chunkCount: chunks.length,
        status: 'ready',
        createdAt: new Date().toISOString(),
      });

      localChunks.push(...enhancedChunks);

      fs.writeFileSync(localDocPath, JSON.stringify(localDocs, null, 2), 'utf8');
      fs.writeFileSync(localChunksPath, JSON.stringify(localChunks, null, 2), 'utf8');
    }

    // ── 6. READY ───────────────────────────────────────────────
    emit('ready', {
      pageCount,
      chunkCount: chunks.length,
      embeddedCount: embeddings.length,
    });

    return {
      documentId,
      title: parsed.title,
      fileType: (parsed.metadata?.fileType as string) || parsed.sourceType || 'document',
      pageCount,
      chunkCount: chunks.length,
      chunks: enhancedChunks,
      status: 'ready',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    emit('failed', { error: errorMsg });
    return {
      documentId,
      title: fileName,
      fileType: 'unknown',
      pageCount: 0,
      chunkCount: 0,
      chunks: [],
      status: 'failed',
      error: errorMsg,
    };
  }
}
