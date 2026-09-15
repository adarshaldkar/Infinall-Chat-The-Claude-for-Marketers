-- ====================================================================
-- Infinall Chat: Migration Fix-Up
-- Run this in the Supabase SQL Editor AFTER all other migrations.
-- Fixes:
--   1. content_tsv column missing from knowledge_chunks
--   2. key/value column missing from brand_memories
--   3. Safe backfill for memory_key / memory_value aliases
--   4. Re-creates the RRF RPC if content_tsv was missing earlier
-- ====================================================================

-- ── 1. Ensure pgvector extension exists ───────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 1b. Create missing tables (ingestion_jobs, ingestion_events) ──
CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'parsing', 'chunking', 'embedding', 'indexing', 'ready', 'failed')),
    progress_percent INT NOT NULL DEFAULT 0,
    current_step TEXT NOT NULL DEFAULT 'Queued',
    total_steps INT NOT NULL DEFAULT 6,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    error_message TEXT,
    retryable BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ingestion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.ingestion_jobs(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    step TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on ingestion tables
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own ingestion jobs" ON public.ingestion_jobs;
CREATE POLICY "Users manage their own ingestion jobs"
  ON public.ingestion_jobs FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users view their own ingestion events" ON public.ingestion_events;
CREATE POLICY "Users view their own ingestion events"
  ON public.ingestion_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ingestion_jobs j
    WHERE j.id = ingestion_events.job_id AND j.user_id = (SELECT auth.uid())
  ));


-- ── 2. Fix knowledge_chunks — add content_tsv if missing ──────────
-- This column was defined in the enterprise migration but may have
-- failed if pgvector was not yet enabled when that migration ran.
ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

-- Add FTS index on content_tsv
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_tsv
  ON public.knowledge_chunks USING gin (content_tsv);

-- ── 3. Fix knowledge_chunks — add other missing columns ───────────
ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS embedding_provider TEXT DEFAULT 'openai';
ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';
ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS embedding_dimension INT DEFAULT 1536;
ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS chunk_hash TEXT;
ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS page_number INT;
ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS section_title TEXT;

-- ── 4. Fix brand_memories — ensure key/value columns exist ────────
-- These are the canonical columns from the enterprise migration.
ALTER TABLE public.brand_memories
  ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE public.brand_memories
  ADD COLUMN IF NOT EXISTS value TEXT;

-- Add alias columns (used by app code)
ALTER TABLE public.brand_memories
  ADD COLUMN IF NOT EXISTS memory_key TEXT;
ALTER TABLE public.brand_memories
  ADD COLUMN IF NOT EXISTS memory_value TEXT;
ALTER TABLE public.brand_memories
  ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Safe backfill: sync memory_key/memory_value from key/value (if key exists and has data)
UPDATE public.brand_memories
  SET memory_key = key, memory_value = value
  WHERE key IS NOT NULL
    AND (memory_key IS NULL OR memory_value IS NULL);

-- Safe backfill: sync key/value from memory_key/memory_value (if memory_key exists)
UPDATE public.brand_memories
  SET key = memory_key, value = memory_value
  WHERE memory_key IS NOT NULL
    AND (key IS NULL OR value IS NULL);

-- Add embedding column if missing
ALTER TABLE public.brand_memories
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- ── 5. Fix knowledge_documents — ensure all columns exist ─────────
ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Unique index for dedup (safe — uses IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_documents_file_hash_project
  ON public.knowledge_documents (file_hash, project_id)
  WHERE file_hash IS NOT NULL AND project_id IS NOT NULL;

-- ── 6. HNSW index on brand_memories embedding ─────────────────────
CREATE INDEX IF NOT EXISTS idx_brand_memories_vector_hnsw
  ON public.brand_memories
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding IS NOT NULL;

-- ── 7. Re-create the RRF RPCs (drop first to avoid return-type conflict) ────

-- Drop existing functions to allow changing return type
DROP FUNCTION IF EXISTS public.check_user_project_access(UUID, UUID);
DROP FUNCTION IF EXISTS public.match_scoped_knowledge_chunks(vector, TEXT, FLOAT, INT, UUID, UUID);
DROP FUNCTION IF EXISTS public.match_scoped_brand_memories(vector, FLOAT, INT, UUID, UUID);

-- check_user_project_access helper
-- NOTE: projects table uses owner_id (not user_id)
CREATE OR REPLACE FUNCTION public.check_user_project_access(
  p_project_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
      AND owner_id = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
  );
$$;

-- Hybrid RRF knowledge chunk retrieval
CREATE OR REPLACE FUNCTION public.match_scoped_knowledge_chunks(
    query_embedding vector(1536),
    query_text TEXT,
    match_threshold FLOAT DEFAULT 0.15,
    match_count INT DEFAULT 8,
    filter_user_id UUID DEFAULT NULL,
    filter_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    project_id UUID,
    user_id UUID,
    content TEXT,
    metadata JSONB,
    page_number INT,
    section_title TEXT,
    chunk_index INT,
    rrf_score DOUBLE PRECISION,
    vector_similarity DOUBLE PRECISION,
    text_rank DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'match_scoped_knowledge_chunks: authentication required';
    END IF;

    RETURN QUERY
    WITH vector_candidates AS (
        SELECT
            kc.id AS c_id,
            kc.document_id AS d_id,
            kc.project_id AS p_id,
            kc.user_id AS u_id,
            kc.content AS c_content,
            kc.metadata AS c_metadata,
            kc.page_number AS c_page,
            kc.section_title AS c_section,
            kc.chunk_index AS c_idx,
            (1.0 - (kc.embedding <=> query_embedding))::DOUBLE PRECISION AS v_score,
            ROW_NUMBER() OVER (ORDER BY kc.embedding <=> query_embedding ASC)::INT AS v_rank
        FROM public.knowledge_chunks kc
        WHERE
            (kc.user_id = v_uid OR public.check_user_project_access(kc.project_id, v_uid)) AND
            (filter_project_id IS NULL OR kc.project_id = filter_project_id) AND
            kc.embedding IS NOT NULL AND
            (1.0 - (kc.embedding <=> query_embedding)) >= match_threshold
        ORDER BY kc.embedding <=> query_embedding ASC
        LIMIT match_count * 3
    ),
    fts_candidates AS (
        SELECT
            kc.id AS c_id,
            ts_rank_cd(kc.content_tsv, websearch_to_tsquery('english', query_text))::DOUBLE PRECISION AS f_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(kc.content_tsv, websearch_to_tsquery('english', query_text)) DESC)::INT AS f_rank
        FROM public.knowledge_chunks kc
        WHERE
            (kc.user_id = v_uid OR public.check_user_project_access(kc.project_id, v_uid)) AND
            (filter_project_id IS NULL OR kc.project_id = filter_project_id) AND
            query_text IS NOT NULL AND query_text != '' AND
            kc.content_tsv @@ websearch_to_tsquery('english', query_text)
        ORDER BY f_score DESC
        LIMIT match_count * 3
    ),
    fused AS (
        SELECT
            COALESCE(v.c_id, f.c_id) AS chunk_id,
            v.d_id, v.p_id, v.u_id,
            v.c_content, v.c_metadata, v.c_page, v.c_section, v.c_idx,
            (
                COALESCE(1.0 / (60.0 + v.v_rank), 0.0) +
                COALESCE(1.0 / (60.0 + f.f_rank), 0.0)
            )::DOUBLE PRECISION AS rrf,
            COALESCE(v.v_score, 0.0)::DOUBLE PRECISION AS vsim,
            COALESCE(f.f_score, 0.0)::DOUBLE PRECISION AS trank
        FROM vector_candidates v
        FULL OUTER JOIN fts_candidates f ON v.c_id = f.c_id
    )
    SELECT
        f.chunk_id AS id,
        f.d_id AS document_id,
        f.p_id AS project_id,
        f.u_id AS user_id,
        f.c_content AS content,
        f.c_metadata AS metadata,
        f.c_page AS page_number,
        f.c_section AS section_title,
        f.c_idx AS chunk_index,
        f.rrf AS rrf_score,
        f.vsim AS vector_similarity,
        f.trank AS text_rank
    FROM fused f
    WHERE f.chunk_id IS NOT NULL
    ORDER BY f.rrf DESC
    LIMIT match_count;
END;
$$;

-- Brand memory semantic search RPC
CREATE OR REPLACE FUNCTION public.match_scoped_brand_memories(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.15,
    match_count INT DEFAULT 8,
    filter_user_id UUID DEFAULT NULL,
    filter_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    user_id UUID,
    category TEXT,
    memory_key TEXT,
    memory_value TEXT,
    confidence REAL,
    status TEXT,
    similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'match_scoped_brand_memories: authentication required';
    END IF;

    RETURN QUERY
    SELECT
        bm.id,
        bm.project_id,
        bm.user_id,
        bm.category,
        COALESCE(bm.memory_key, bm.key) AS memory_key,
        COALESCE(bm.memory_value, bm.value) AS memory_value,
        bm.confidence,
        bm.status,
        (1.0 - (bm.embedding <=> query_embedding))::DOUBLE PRECISION AS similarity
    FROM public.brand_memories bm
    WHERE
        (bm.user_id = v_uid OR public.check_user_project_access(bm.project_id, v_uid)) AND
        (filter_project_id IS NULL OR bm.project_id = filter_project_id) AND
        bm.status = 'active' AND
        bm.embedding IS NOT NULL AND
        (1.0 - (bm.embedding <=> query_embedding)) >= match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- ── 8. Grant permissions ──────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.match_scoped_knowledge_chunks(vector, TEXT, FLOAT, INT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_scoped_brand_memories(vector, FLOAT, INT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_project_access(UUID, UUID) TO authenticated;
