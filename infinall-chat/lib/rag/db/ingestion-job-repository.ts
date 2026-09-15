// ============================================================
// Infinall Chat - Ingestion Job & Audit Event Repository
// ============================================================

import { getSupabaseServerClient } from '../../supabase/server';
import { IngestionJob, IngestionJobStatus } from '../types';

export class IngestionJobRepository {
  private static getClient() {
    return getSupabaseServerClient();
  }

  static async createJob(params: {
    id?: string;
    documentId: string;
    projectId?: string;
    userId: string;
    totalSteps?: number;
  }): Promise<IngestionJob | null> {
    const supabase = this.getClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('ingestion_jobs')
      .insert({
        id: params.id,
        document_id: params.documentId,
        project_id: params.projectId || null,
        user_id: params.userId,
        status: 'pending',
        progress_percent: 0,
        current_step: 'Queued',
        total_steps: params.totalSteps || 6,
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[IngestionJobRepository.createJob] error:', error?.message);
      return null;
    }

    return this.mapJob(data);
  }

  static async updateJobProgress(
    jobId: string,
    update: {
      status: IngestionJobStatus;
      progressPercent: number;
      currentStep: string;
      errorMessage?: string;
      retryable?: boolean;
    }
  ): Promise<boolean> {
    const supabase = this.getClient();
    if (!supabase) return false;

    const payload: Record<string, unknown> = {
      status: update.status,
      progress_percent: update.progressPercent,
      current_step: update.currentStep,
      retryable: update.retryable ?? false,
    };

    if (update.errorMessage) {
      payload.error_message = update.errorMessage;
    }

    if (update.status === 'ready' || update.status === 'failed') {
      payload.completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('ingestion_jobs').update(payload as any).eq('id', jobId);
    if (error) {
      console.error('[IngestionJobRepository.updateJobProgress] error:', error.message);
      return false;
    }

    return true;
  }

  static async recordEvent(event: {
    jobId: string;
    documentId: string;
    step: IngestionJobStatus;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    const supabase = this.getClient();
    if (!supabase) return false;

    const { error } = await supabase.from('ingestion_events').insert({
      job_id: event.jobId,
      document_id: event.documentId,
      step: event.step,
      message: event.message,
      metadata: (event.metadata as any) || {},
      timestamp: new Date().toISOString(),
    });

    return !error;
  }

  static async getJobStatus(jobId: string): Promise<IngestionJob | null> {
    const supabase = this.getClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('ingestion_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) return null;
    return this.mapJob(data);
  }

  private static mapJob(row: any): IngestionJob {
    return {
      id: row.id,
      documentId: row.document_id,
      projectId: row.project_id || undefined,
      userId: row.user_id,
      status: row.status as IngestionJobStatus,
      progressPercent: row.progress_percent,
      currentStep: row.current_step,
      totalSteps: row.total_steps,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      errorMessage: row.error_message || undefined,
      retryable: row.retryable,
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
    };
  }
}
