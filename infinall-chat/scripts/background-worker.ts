import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ResearchOrchestrator } from '../lib/subagents/orchestrator';

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error('REDIS_URL is required to run the background worker');

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const worker = new Worker('infinall-background', async (job) => {
  if (job.name === 'research') {
    const prompt = String((job.data.payload as { prompt?: string }).prompt ?? '');
    const events = [];
    for await (const event of ResearchOrchestrator.executeResearch(prompt)) events.push(event);
    return events;
  }
  if (job.name === 'document_ingestion') {
    throw new Error('Document ingestion worker requires object storage payload wiring');
  }
  throw new Error(`Unsupported background job: ${job.name}`);
}, { connection, concurrency: Number(process.env.BACKGROUND_WORKER_CONCURRENCY ?? 2) });

worker.on('completed', (job) => console.log(`[background] completed ${job.id}`));
worker.on('failed', (job, error) => console.error(`[background] failed ${job?.id}:`, error.message));
