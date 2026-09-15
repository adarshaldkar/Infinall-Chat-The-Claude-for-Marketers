// ============================================================
// Asynchronous Knowledge Ingestion Worker & SSE Telemetry
// Lifecycle: validating → parsing → chunking → embedding → indexing → ready / failed
// Unified pipeline: all parsing goes through ParserRegistry
// ============================================================

import crypto from 'crypto';
import { ParserRegistry } from '@/lib/ingestion/registry';
import { chunkDocument, TextChunk } from './chunker';
import { defaultEmbeddingGateway } from './embedding-gateway';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface IngestionJobEvent {
  jobId: string;
  documentId: string;
  fileName: string;
  projectId?: string;
  status: 'validating' | 'parsing' | 'chunking' | 'embedding' | 'indexing' | 'ready' | 'failed';
  progressPct: number;
  pageCount?: number;
  chunkCount?: number;
  message?: string;
  error?: string;
  timestamp: string;
}

export type IngestionListener = (event: IngestionJobEvent) => void;

class IngestionWorkerManager {
  private listeners: Map<string, Set<IngestionListener>> = new Map();
  private jobStatuses: Map<string, IngestionJobEvent> = new Map();

  public subscribe(documentId: string, listener: IngestionListener): () => void {
    if (!this.listeners.has(documentId)) {
      this.listeners.set(documentId, new Set());
    }
    this.listeners.get(documentId)!.add(listener);

    // Send latest status immediately if available
    const lastStatus = this.jobStatuses.get(documentId);
    if (lastStatus) {
      listener(lastStatus);
    }

    return () => {
      const set = this.listeners.get(documentId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.listeners.delete(documentId);
      }
    };
  }

  public emit(event: IngestionJobEvent) {
    this.jobStatuses.set(event.documentId, event);
    const set = this.listeners.get(event.documentId);
    if (set) {
      for (const listener of set) {
        try {
          listener(event);
        } catch (err) {
          console.error('[IngestionWorker] Error in listener callback:', err);
        }
      }
    }
  }

  public getStatus(documentId: string): IngestionJobEvent | undefined {
    return this.jobStatuses.get(documentId);
  }

  /**
   * Enqueues and starts asynchronous ingestion job.
   * Uses ParserRegistry exclusively — the old lib/rag/parsers/ path is no longer called.
   */
  public async processIngestionAsync(
    fileBuffer: Buffer,
    fileName: string,
    fileSizeBytes: number,
    userId: string,
    projectId?: string,
    existingDocId?: string
  ): Promise<string> {
    const jobId = crypto.randomUUID();

    // Compute SHA-256 hash for dedup and idempotency
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const updateProgress = (
      status: IngestionJobEvent['status'],
      progressPct: number,
      message: string,
      extra: Partial<IngestionJobEvent> = {}
    ) => {
      this.emit({
        jobId,
        documentId: existingDocId || fileHash, // use hash as temp ID before doc creation
        fileName,
        projectId,
        status,
        progressPct,
        message,
        timestamp: new Date().toISOString(),
        ...extra,
      });
    };

    // Run async background processing
    (async () => {
      const supabase = getSupabaseServerClient() as SupabaseClient | null;
      let documentId = existingDocId || crypto.randomUUID();

      try {
        // ── 1. VALIDATING ──────────────────────────────────────────
        updateProgress('validating', 5, 'Validating file constraints and integrity...');
        if (!fileBuffer || fileBuffer.length === 0) {
          throw new Error('File buffer is empty or corrupted');
        }

        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        if (fileSizeBytes > MAX_SIZE) {
          throw new Error(`File size ${(fileSizeBytes / (1024 * 1024)).toFixed(1)}MB exceeds 50MB maximum`);
        }

        // ── 2. DEDUP CHECK (SHA-256 idempotency) ──────────────────
        updateProgress('validating', 10, 'Checking for duplicate documents...');
        if (supabase) {
          const { data: existing } = await supabase
            .from('knowledge_documents')
            .select('id, status')
            .eq('file_hash', fileHash)
            .eq('user_id', userId)
            .match(projectId ? { project_id: projectId } : {})
            .maybeSingle();

          if (existing && existing.status === 'ready') {
            console.log(`[IngestionWorker] Duplicate detected (hash ${fileHash.slice(0, 12)}), returning existing doc: ${existing.id}`);
            documentId = existing.id;
            updateProgress('ready', 100, `Duplicate detected — document already indexed.`, {
              documentId: existing.id,
            });
            return;
          }
        }

        // Upsert pending record in Supabase
        if (supabase) {
          const mimeType = ''; // will be detected by parser
          await supabase.from('knowledge_documents').upsert({
            id: documentId,
            user_id: userId,
            project_id: projectId || null,
            title: fileName,
            file_type: (fileName.split('.').pop() || 'txt').toLowerCase(),
            file_size_bytes: fileSizeBytes,
            file_hash: fileHash,
            status: 'validating',
            updated_at: new Date().toISOString(),
          });
        }

        // ── 3. PARSING via ParserRegistry (unified pipeline) ──────
        updateProgress('parsing', 25, 'Extracting text, tables, and document structure...', { documentId });
        if (supabase) {
          await supabase.from('knowledge_documents').update({ status: 'parsing' }).eq('id', documentId);
        }

        const mimeType = `application/octet-stream`; // Registry resolves actual type from extension/magic bytes
        const parseResult = await ParserRegistry.resolveAndParse({
          fileName,
          buffer: fileBuffer,
          mimeType,
          sizeBytes: fileSizeBytes,
          userId,
        });

        if (!parseResult.ok) {
          throw new Error(`Document parsing failed (${parseResult.code}): ${parseResult.message}`);
        }

        const parsed = parseResult.document;
        const pageCount = parsed.pages?.length || parsed.slides?.length || parsed.sections?.length || 1;

        // ── 4. CHUNKING ────────────────────────────────────────────
        updateProgress('chunking', 50, `Dividing into semantic token chunks across ${pageCount} pages...`, { pageCount, documentId });
        if (supabase) {
          await supabase.from('knowledge_documents').update({ status: 'chunking', page_count: pageCount }).eq('id', documentId);
        }

        const chunks: TextChunk[] = chunkDocument(parsed, {
          targetTokens: 512,  // Agreed spec
          overlapTokens: 64,  // Agreed spec
        });

        if (chunks.length === 0) {
          throw new Error('Document produced 0 extractable text chunks. Ensure the file contains text.');
        }

        // ── 5. EMBEDDING (1536-d vectors) ──────────────────────────
        updateProgress('embedding', 75, `Generating high-dimensional embeddings for ${chunks.length} chunks...`, {
          pageCount,
          chunkCount: chunks.length,
          documentId,
        });
        if (supabase) {
          await supabase.from('knowledge_documents').update({ status: 'embedding', chunk_count: chunks.length }).eq('id', documentId);
        }

        const texts = chunks.map((c) => c.content);
        const embeddings = await defaultEmbeddingGateway.embedBatch(texts);

        // Track embedding provenance
        const embeddingProvider = (process.env.EMBEDDING_PROVIDER as string) || 'openai';
        const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
        const embeddingDimension = 1536;

        // ── 6. INDEXING TO DATABASE ────────────────────────────────
        updateProgress('indexing', 90, 'Writing chunks and HNSW vector indexes to database...', { documentId });

        if (supabase) {
          // Delete any existing chunks for this document if re-indexing
          await supabase.from('knowledge_chunks').delete().eq('document_id', documentId);

          const chunkRows = chunks.map((chunk, index) => ({
            id: chunk.id,
            document_id: documentId,
            user_id: userId,
            project_id: projectId || null,
            chunk_index: chunk.chunkIndex,
            page_number: chunk.pageNumber,
            section_title: chunk.sectionTitle,
            content: chunk.content,
            token_count: chunk.tokenCount,
            chunk_hash: chunk.chunkHash,
            metadata: {
              ...chunk.metadata,
              documentTitle: fileName,
              projectId: projectId || null,
            },
            embedding: embeddings[index] || null,
            // Embedding provenance — required to detect vector space drift
            embedding_provider: embeddingProvider,
            embedding_model: embeddingModel,
            embedding_dimension: embeddingDimension,
          }));

          // Batch insert in groups of 50
          const BATCH_SIZE = 50;
          for (let i = 0; i < chunkRows.length; i += BATCH_SIZE) {
            const batch = chunkRows.slice(i, i + BATCH_SIZE);
            const { error: insertErr } = await supabase.from('knowledge_chunks').insert(batch);
            if (insertErr) {
              console.error('[IngestionWorker] Supabase chunk insert error:', insertErr);
            }
          }

          await supabase.from('knowledge_documents').update({
            status: 'ready',
            chunk_count: chunks.length,
            page_count: pageCount,
            updated_at: new Date().toISOString(),
          }).eq('id', documentId);
        }

        // Local write only in development/test mode (not a production fallback)
        if (process.env.NODE_ENV !== 'production' && process.env.STORAGE_MODE === 'local') {
          const fs = await import('fs');
          const path = await import('path');
          const DATA_DIR = path.resolve(process.cwd(), '.data', 'knowledge');
          if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

          const docRecord = {
            id: documentId,
            userId,
            projectId,
            title: fileName,
            fileHash,
            fileType: (fileName.split('.').pop() || 'txt').toLowerCase(),
            fileSizeBytes,
            pageCount,
            chunkCount: chunks.length,
            status: 'ready',
            updatedAt: new Date().toISOString(),
          };

          const docsPath = path.join(DATA_DIR, 'documents.json');
          let docsList: Array<{ id: string; [key: string]: unknown }> = [];
          if (fs.existsSync(docsPath)) {
            try { docsList = JSON.parse(fs.readFileSync(docsPath, 'utf-8')); } catch (_) { docsList = []; }
          }
          docsList = docsList.filter((d) => d.id !== documentId);
          docsList.unshift(docRecord);
          fs.writeFileSync(docsPath, JSON.stringify(docsList, null, 2), 'utf-8');
        }

        // ── 7. READY ───────────────────────────────────────────────
        updateProgress('ready', 100, `Successfully ingested ${chunks.length} chunks from ${fileName}`, {
          pageCount,
          chunkCount: chunks.length,
          documentId,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[IngestionWorker] Ingestion failure:', errorMsg);

        if (supabase) {
          try {
            await supabase.from('knowledge_documents').update({
              status: 'failed',
              error_message: errorMsg,
              updated_at: new Date().toISOString(),
            }).eq('id', documentId);
          } catch (_) {}
        }

        updateProgress('failed', 100, `Ingestion failed: ${errorMsg}`, {
          error: errorMsg,
          documentId,
        });
      }
    })();

    return existingDocId || fileHash; // return deterministic ID based on content hash
  }
}

export const ingestionWorker = new IngestionWorkerManager();
