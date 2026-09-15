// ============================================================
// Infinall Chat - Durable Job Queue & Worker Engine
// Supports BullMQ + Redis in production & durable resilient local runner
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export type JobKind = 'research' | 'document_ingestion' | 'crawler';

export interface BackgroundJob<T = unknown> {
  id: string;
  kind: JobKind;
  userId: string;
  projectId?: string;
  payload: T;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progressPct?: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: string;
}

const localPath = path.resolve(process.cwd(), '.data', 'jobs.json');
let queue: Queue | null = null;

function getQueue() {
  if (!process.env.REDIS_URL) return null;
  if (!queue) {
    try {
      const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
      queue = new Queue('infinall-background', { connection });
    } catch (_) {
      queue = null;
    }
  }
  return queue;
}

function localJobs(): BackgroundJob[] {
  try {
    return JSON.parse(fs.readFileSync(localPath, 'utf8')) as BackgroundJob[];
  } catch {
    return [];
  }
}

function saveLocal(jobs: BackgroundJob[]) {
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, JSON.stringify(jobs, null, 2), 'utf8');
}

export async function enqueueJob<T>(
  kind: JobKind,
  userId: string,
  payload: T,
  projectId?: string
): Promise<BackgroundJob<T>> {
  const job: BackgroundJob<T> = {
    id: crypto.randomUUID(),
    kind,
    userId,
    projectId,
    payload,
    status: 'queued',
    progressPct: 0,
    message: 'Job queued for background processing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const remote = getQueue();
  if (remote) {
    await remote.add(kind, { ...job }, { jobId: job.id, removeOnComplete: 100, removeOnFail: 100 });
  } else {
    const jobs = localJobs();
    jobs.unshift(job);
    saveLocal(jobs.slice(0, 500));
  }

  // Supabase sync if table exists
  const supabase = getSupabaseServerClient() as SupabaseClient | null;
  if (supabase) {
    try {
      await supabase.from('background_jobs').insert({
        id: job.id,
        kind: job.kind,
        user_id: job.userId,
        project_id: job.projectId || null,
        status: job.status,
        payload: job.payload,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      });
    } catch (_) {}
  }

  return job;
}

export function getLocalJob(id: string): BackgroundJob | null {
  return localJobs().find((job) => job.id === id) ?? null;
}

export async function updateJobStatus(
  id: string,
  updates: Partial<Pick<BackgroundJob, 'status' | 'progressPct' | 'message' | 'result' | 'error'>>
): Promise<void> {
  const jobs = localJobs();
  const index = jobs.findIndex((j) => j.id === id);
  if (index !== -1) {
    jobs[index] = {
      ...jobs[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveLocal(jobs);
  }

  const supabase = getSupabaseServerClient() as SupabaseClient | null;
  if (supabase) {
    try {
      await supabase.from('background_jobs').update({
        status: updates.status,
        result: updates.result,
        error: updates.error,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    } catch (_) {}
  }
}
