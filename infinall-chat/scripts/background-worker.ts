// ============================================================
// Infinall Chat - Durable Production Background Worker
// Powered by BullMQ & Redis for:
// 1. Long-running Autonomous Deep Research subagent swarms
// 2. Async document ingestion, semantic chunking & pgvector embedding
// 3. 30-day session retention cleanup worker
// ============================================================

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ResearchOrchestrator } from '../lib/subagents/orchestrator';
import { ParserRegistry } from '../lib/ingestion/registry';
import { defaultEmbeddingGateway } from '../lib/rag/embedding-gateway';
import { getSupabaseAdminClient } from '../lib/supabase/server';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export const worker = new Worker(
  'infinall-background',
  async (job) => {
    // 1. Deep Research Subagent Swarms
    if (job.name === 'research') {
      const prompt = String((job.data.payload as { prompt?: string })?.prompt ?? '');
      const events = [];
      for await (const event of ResearchOrchestrator.executeResearch(prompt)) {
        events.push(event);
      }
      return { success: true, eventCount: events.length, events };
    }

    // 2. Async Document Ingestion Pipeline
    if (job.name === 'document_ingestion') {
      const {
        userId,
        projectId,
        fileName,
        mimeType,
        storagePath,
        rawBase64,
      } = job.data as {
        userId: string;
        projectId?: string;
        fileName: string;
        mimeType: string;
        storagePath?: string;
        rawBase64?: string;
      };

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        throw new Error('Supabase client unavailable for document ingestion worker');
      }

      let buffer: Buffer;

      if (rawBase64) {
        buffer = Buffer.from(rawBase64, 'base64');
      } else if (storagePath) {
        const { data: fileData, error: downloadErr } = await supabase.storage
          .from('chat-attachments')
          .download(storagePath);

        if (downloadErr || !fileData) {
          throw new Error(`Failed to download file from storage (${storagePath}): ${downloadErr?.message}`);
        }
        buffer = Buffer.from(await fileData.arrayBuffer());
      } else {
        throw new Error('Document ingestion payload requires either storagePath or rawBase64');
      }

      // Step A: Parse document into clean text using ParserRegistry
      const parseResult = await ParserRegistry.resolveAndParse({ buffer, fileName, mimeType, sizeBytes: buffer.length });
      if (!parseResult.ok) {
        throw new Error(`Parser failed for ${fileName}: ${parseResult.message}`);
      }
      const text = parseResult.document.text;

      if (!text || text.trim().length === 0) {
        throw new Error(`Document ${fileName} yielded 0 characters of extractable text.`);
      }

      // Step B: Create knowledge_document entry
      const { data: doc, error: docErr } = await supabase
        .from('knowledge_documents')
        .insert({
          user_id: userId,
          project_id: projectId || null,
          title: fileName,
          file_name: fileName,
          file_size_bytes: buffer.length,
          source_type: 'upload',
          mime_type: mimeType,
          status: 'processing',
          metadata: {
            fileName,
            parsedLength: text.length,
            pageCount: parseResult.document.metadata.pageCount,
          },
        })
        .select('id')
        .single();

      if (docErr || !doc) {
        throw new Error(`Failed to create knowledge_document: ${docErr?.message}`);
      }

      // Step C: Chunking (512 tokens / ~1800 chars with 64 tokens / ~220 chars overlap)
      const chunkSize = 1800;
      const overlap = 220;
      const chunks: string[] = [];

      for (let i = 0; i < text.length; i += chunkSize - overlap) {
        chunks.push(text.slice(i, i + chunkSize));
      }

      // Step D: Embed chunks and save to knowledge_chunks
      let savedChunks = 0;
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunkText = chunks[idx];
        let embedding: number[] | null = null;
        try {
          embedding = await defaultEmbeddingGateway.embedText(chunkText);
        } catch (_) {}

        await supabase.from('knowledge_chunks').insert({
          document_id: doc.id,
          user_id: userId,
          project_id: projectId || null,
          chunk_index: idx,
          content: chunkText,
          embedding: embedding as any,
          metadata: {
            fileName,
            chunkIndex: idx,
            totalChunks: chunks.length,
          },
        });
        savedChunks++;
      }

      // Step E: Update document status to completed
      await supabase
        .from('knowledge_documents')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', doc.id);

      return {
        success: true,
        documentId: doc.id,
        chunksCreated: savedChunks,
        fileName,
      };
    }

    // 3. 30-Day Retention Worker
    if (job.name === 'retention_cleanup') {
      const supabase = getSupabaseAdminClient();
      if (!supabase) throw new Error('Supabase client unavailable');
      const { data, error } = await (supabase as any).rpc('purge_expired_archived_sessions', { retention_days: 30 });
      if (error) throw error;
      return { success: true, result: data };
    }

    throw new Error(`Unsupported background job: ${job.name}`);
  },
  {
    connection,
    concurrency: Number(process.env.BACKGROUND_WORKER_CONCURRENCY ?? 4),
  }
);

worker.on('completed', (job) => console.log(`[background-worker] completed job ${job.id} (${job.name})`));
worker.on('failed', (job, error) => console.error(`[background-worker] failed job ${job?.id}:`, error.message));
