// ============================================================
// Infinall Chat - Knowledge & Chunks Database Repository
// ============================================================

import { getSupabaseServerClient } from '../../supabase/server';
import { KnowledgeDocument, IngestionJobStatus } from '../types';

export class KnowledgeRepository {
  private static getClient() {
    return getSupabaseServerClient();
  }

  static async createDocument(doc: {
    id?: string;
    projectId?: string;
    userId: string;
    title: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    sourceType: string;
    storagePath?: string;
    metadata?: Record<string, unknown>;
  }): Promise<KnowledgeDocument | null> {
    const supabase = this.getClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('knowledge_documents')
      .insert({
        id: doc.id,
        project_id: doc.projectId || null,
        user_id: doc.userId,
        title: doc.title,
        file_name: doc.fileName,
        file_size_bytes: doc.fileSizeBytes,
        mime_type: doc.mimeType,
        source_type: doc.sourceType,
        storage_path: doc.storagePath || null,
        status: 'pending',
        metadata: (doc.metadata as any) || {},
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[KnowledgeRepository.createDocument] error:', error?.message);
      return null;
    }

    return this.mapDocument(data);
  }

  static async updateDocumentStatus(
    documentId: string,
    status: IngestionJobStatus,
    stats?: {
      pageCount?: number;
      slideCount?: number;
      sheetCount?: number;
      chunkCount?: number;
      errorMessage?: string;
    }
  ): Promise<boolean> {
    const supabase = this.getClient();
    if (!supabase) return false;

    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (stats) {
      if (stats.pageCount !== undefined) updatePayload.page_count = stats.pageCount;
      if (stats.slideCount !== undefined) updatePayload.slide_count = stats.slideCount;
      if (stats.sheetCount !== undefined) updatePayload.sheet_count = stats.sheetCount;
      if (stats.chunkCount !== undefined) updatePayload.chunk_count = stats.chunkCount;
      if (stats.errorMessage !== undefined) updatePayload.error_message = stats.errorMessage;
    }

    const { error } = await supabase
      .from('knowledge_documents')
      .update(updatePayload as any)
      .eq('id', documentId);

    if (error) {
      console.error('[KnowledgeRepository.updateDocumentStatus] error:', error.message);
      return false;
    }

    return true;
  }

  static async insertChunks(chunks: Array<{
    documentId: string;
    projectId?: string;
    userId: string;
    chunkIndex: number;
    content: string;
    tokenCount: number;
    breadcrumb?: Record<string, unknown>;
    embedding?: number[];
    metadata?: Record<string, unknown>;
  }>): Promise<number> {
    const supabase = this.getClient();
    if (!supabase || chunks.length === 0) return 0;

    const rows = chunks.map((c) => ({
      document_id: c.documentId,
      project_id: c.projectId || null,
      user_id: c.userId,
      chunk_index: c.chunkIndex,
      content: c.content,
      token_count: c.tokenCount,
      breadcrumb: (c.breadcrumb as any) || {},
      embedding: c.embedding ? JSON.stringify(c.embedding) : null,
      metadata: (c.metadata as any) || {},
    }));

    // Insert in batches of 50 to maintain fast network throughput
    let insertedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from('knowledge_chunks').insert(batch as any);
      if (error) {
        console.error('[KnowledgeRepository.insertChunks] batch error:', error.message);
      } else {
        insertedCount += batch.length;
      }
    }

    return insertedCount;
  }

  static async getDocumentById(documentId: string): Promise<KnowledgeDocument | null> {
    const supabase = this.getClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !data) return null;
    return this.mapDocument(data);
  }

  static async listDocuments(userId: string, projectId?: string): Promise<KnowledgeDocument[]> {
    const supabase = this.getClient();
    if (!supabase) return [];

    let query = supabase.from('knowledge_documents').select('*').eq('user_id', userId);
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error || !data) return [];

    return data.map(this.mapDocument);
  }

  private static mapDocument(row: any): KnowledgeDocument {
    return {
      id: row.id,
      projectId: row.project_id || undefined,
      userId: row.user_id,
      title: row.title,
      fileName: row.file_name,
      fileSizeBytes: Number(row.file_size_bytes || 0),
      mimeType: row.mime_type,
      sourceType: row.source_type,
      storagePath: row.storage_path || undefined,
      status: row.status,
      pageCount: row.page_count,
      slideCount: row.slide_count,
      sheetCount: row.sheet_count,
      chunkCount: row.chunk_count,
      errorMessage: row.error_message || undefined,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
