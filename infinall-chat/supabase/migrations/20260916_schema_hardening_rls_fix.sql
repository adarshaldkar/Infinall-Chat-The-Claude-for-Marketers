-- ====================================================================
-- Infinall Chat: Schema Hardening & RLS Fix
-- Migration: 20260916_schema_hardening_rls_fix.sql
-- Addresses: audit findings E1-E5, F-RLS
-- ====================================================================

-- ── 1. Add missing columns to knowledge_documents ─────────────────

-- file_hash: SHA-256 of file content for idempotent dedup
ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- file_type alias: some app code uses file_type instead of source_type
ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS file_type TEXT GENERATED ALWAYS AS (source_type) STORED;

-- error_message column for ingestion failures
ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Unique constraint on file_hash per project for dedup enforcement
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_documents_file_hash_project
  ON public.knowledge_documents (file_hash, project_id)
  WHERE file_hash IS NOT NULL AND project_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_documents_file_hash_user
  ON public.knowledge_documents (file_hash, user_id)
  WHERE file_hash IS NOT NULL AND project_id IS NULL;

-- ── 2. Add embedding provenance columns to knowledge_chunks ────────

-- These columns are critical to detect vector space drift when embedding
-- models/providers change. Old chunks (model A) must not mix with
-- new chunks (model B) in the same retrieval space.
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

-- ── 3. Add memory_key / memory_value aliases to brand_memories ─────
-- The enterprise migration uses 'key'/'value' but app code expects
-- 'memory_key'/'memory_value' column names per the earlier RAG migration.

ALTER TABLE public.brand_memories
  ADD COLUMN IF NOT EXISTS memory_key TEXT;
ALTER TABLE public.brand_memories
  ADD COLUMN IF NOT EXISTS memory_value TEXT;
ALTER TABLE public.brand_memories
  ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.brand_memories
  ADD COLUMN IF NOT EXISTS superseded_by UUID;

-- Backfill aliases from canonical columns if data exists
UPDATE public.brand_memories SET memory_key = key, memory_value = value
  WHERE memory_key IS NULL OR memory_value IS NULL;

-- ── 4. Fix the match_scoped_knowledge_chunks RPC ───────────────────
-- SECURITY: The existing hybrid_match_knowledge_chunks RPC takes
-- filter_user_id and filter_project_id as caller-supplied parameters.
-- This creates an IDOR risk: a caller could supply someone else's
-- project_id and bypass isolation.
--
-- Fix: Create/replace the RPC to enforce auth.uid() for access control,
-- supplemented by check_user_project_access() rather than raw ID comparison.
-- filter_project_id is kept as a scope hint but never used as the sole
-- access gate.

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
-- SECURITY: Uses auth.uid() to enforce row-level access.
-- filter_user_id / filter_project_id are optional scope hints
-- but cannot grant access beyond what the authenticated user owns.
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    -- Reject unauthenticated callers immediately
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'match_scoped_knowledge_chunks: authentication required (auth.uid() is null)';
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
            -- SECURITY: Access enforced via auth.uid() + project membership, NOT caller-supplied IDs
            (kc.user_id = v_uid OR public.check_user_project_access(kc.project_id, v_uid)) AND
            -- Optional scope narrowing (user choosing to query within a specific project)
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
            -- SECURITY: Same access enforcement via auth.uid()
            (kc.user_id = v_uid OR public.check_user_project_access(kc.project_id, v_uid)) AND
            (filter_project_id IS NULL OR kc.project_id = filter_project_id) AND
            query_text IS NOT NULL AND
            query_text != '' AND
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

-- ── 5. Fix match_scoped_brand_memories RPC ──────────────────────────

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
        -- SECURITY: Enforce auth.uid() access, not caller-supplied IDs
        (bm.user_id = v_uid OR public.check_user_project_access(bm.project_id, v_uid)) AND
        (filter_project_id IS NULL OR bm.project_id = filter_project_id) AND
        bm.status = 'active' AND
        bm.embedding IS NOT NULL AND
        (1.0 - (bm.embedding <=> query_embedding)) >= match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- ── 6. Grant execute permissions ───────────────────────────────────

GRANT EXECUTE ON FUNCTION public.match_scoped_knowledge_chunks(vector, TEXT, FLOAT, INT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_scoped_brand_memories(vector, FLOAT, INT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_project_access(UUID, UUID) TO authenticated;

-- ── 7. Add indexes for new columns ────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_provider
    ON public.knowledge_chunks (embedding_provider, embedding_model, embedding_dimension);

CREATE INDEX IF NOT EXISTS idx_brand_memories_vector_hnsw
    ON public.brand_memories
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE embedding IS NOT NULL;

-- ── 8. Comments for maintainability ───────────────────────────────

COMMENT ON COLUMN public.knowledge_documents.file_hash IS
    'SHA-256 of the original file content. Used for idempotent upload dedup.';

COMMENT ON COLUMN public.knowledge_chunks.embedding_provider IS
    'The embedding provider used (openai, gemini, etc). Never mix vectors from different providers in retrieval.';

COMMENT ON COLUMN public.knowledge_chunks.embedding_model IS
    'The embedding model version used. Dimension drift between model versions will cause retrieval corruption.';

COMMENT ON FUNCTION public.match_scoped_knowledge_chunks IS
    'Hybrid RRF retrieval enforcing auth.uid() access. filter_project_id is a scope hint only — never a sole access gate.';
