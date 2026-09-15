-- ====================================================================
-- Infinall Chat: Enterprise Knowledge, Scoped RAG, Brand Memory & Ingestion
-- Migration: 20260915_enterprise_knowledge_memory_ingestion.sql
-- ====================================================================

-- 1. Ensure Extensions
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- 2. Projects & Project Members Tables
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_project_member UNIQUE (project_id, user_id)
);

-- 3. Knowledge Documents Table
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'unknown',
    storage_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'parsing', 'chunking', 'embedding', 'indexing', 'ready', 'failed')),
    page_count INT NOT NULL DEFAULT 0,
    slide_count INT NOT NULL DEFAULT 0,
    sheet_count INT NOT NULL DEFAULT 0,
    chunk_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Knowledge Chunks Table with Vector(1536) and tsvector
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    token_count INT NOT NULL DEFAULT 0,
    breadcrumb JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536),
    content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Brand Memories Table
CREATE TABLE IF NOT EXISTS public.brand_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    key TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom',
    value TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'conflicted', 'archived')),
    provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
    superseded_by UUID REFERENCES public.brand_memories(id) ON DELETE SET NULL,
    conflict_with UUID[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Ingestion Jobs & Events
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

-- ── 7. Optimized Indexes ────────────────────────────────────────

-- Vector Cosine HNSW Index
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
    ON public.knowledge_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Full-Text GIN Index
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_tsv
    ON public.knowledge_chunks
    USING gin (content_tsv);

-- Relational & Scoping Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects (user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_project ON public.project_members (user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_user_project ON public.knowledge_documents (user_id, project_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc_chunk ON public.knowledge_chunks (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user_project ON public.knowledge_chunks (user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_brand_memories_user_project_status ON public.brand_memories (user_id, project_id, status);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_doc_status ON public.ingestion_jobs (document_id, status);
CREATE INDEX IF NOT EXISTS idx_ingestion_events_job_id ON public.ingestion_events (job_id, timestamp);

-- ── 8. Row-Level Security (RLS) ────────────────────────────────

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_events ENABLE ROW LEVEL SECURITY;

-- Helper function for team/project access check
CREATE OR REPLACE FUNCTION public.check_user_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
    SELECT (
        p_project_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.projects p WHERE p.id = p_project_id AND p.user_id = p_user_id
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members pm WHERE pm.project_id = p_project_id AND pm.user_id = p_user_id
        )
    );
$$;

-- Projects RLS Policies
CREATE POLICY "projects_select" ON public.projects
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = id AND pm.user_id = (SELECT auth.uid()))
    );

CREATE POLICY "projects_insert" ON public.projects
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "projects_update" ON public.projects
    FOR UPDATE TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = id AND pm.user_id = (SELECT auth.uid()) AND pm.role IN ('owner', 'admin'))
    )
    WITH CHECK (
        user_id = (SELECT auth.uid()) OR
        EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = id AND pm.user_id = (SELECT auth.uid()) AND pm.role IN ('owner', 'admin'))
    );

CREATE POLICY "projects_delete" ON public.projects
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Project Members RLS Policies
CREATE POLICY "project_members_select" ON public.project_members
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = (SELECT auth.uid()))
    );

CREATE POLICY "project_members_modify" ON public.project_members
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = (SELECT auth.uid()))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = (SELECT auth.uid()))
    );

-- Knowledge Documents RLS Policies
CREATE POLICY "knowledge_documents_select" ON public.knowledge_documents
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        public.check_user_project_access(project_id, (SELECT auth.uid()))
    );

CREATE POLICY "knowledge_documents_insert" ON public.knowledge_documents
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = (SELECT auth.uid()) AND
        public.check_user_project_access(project_id, (SELECT auth.uid()))
    );

CREATE POLICY "knowledge_documents_update" ON public.knowledge_documents
    FOR UPDATE TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        public.check_user_project_access(project_id, (SELECT auth.uid()))
    )
    WITH CHECK (
        user_id = (SELECT auth.uid()) AND
        public.check_user_project_access(project_id, (SELECT auth.uid()))
    );

CREATE POLICY "knowledge_documents_delete" ON public.knowledge_documents
    FOR DELETE TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = (SELECT auth.uid()))
    );

-- Knowledge Chunks RLS Policies
CREATE POLICY "knowledge_chunks_select" ON public.knowledge_chunks
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        public.check_user_project_access(project_id, (SELECT auth.uid()))
    );

CREATE POLICY "knowledge_chunks_insert" ON public.knowledge_chunks
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = (SELECT auth.uid()) AND
        public.check_user_project_access(project_id, (SELECT auth.uid()))
    );

CREATE POLICY "knowledge_chunks_delete" ON public.knowledge_chunks
    FOR DELETE TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = (SELECT auth.uid()))
    );

-- Brand Memories RLS Policies
CREATE POLICY "brand_memories_select" ON public.brand_memories
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        public.check_user_project_access(project_id, (SELECT auth.uid()))
    );

CREATE POLICY "brand_memories_modify" ON public.brand_memories
    FOR ALL TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        public.check_user_project_access(project_id, (SELECT auth.uid()))
    )
    WITH CHECK (
        user_id = (SELECT auth.uid()) AND
        public.check_user_project_access(project_id, (SELECT auth.uid()))
    );

-- Ingestion Jobs & Events RLS Policies
CREATE POLICY "ingestion_jobs_access" ON public.ingestion_jobs
    FOR ALL TO authenticated
    USING (
        user_id = (SELECT auth.uid()) OR
        public.check_user_project_access(project_id, (SELECT auth.uid()))
    )
    WITH CHECK (
        user_id = (SELECT auth.uid()) AND
        public.check_user_project_access(project_id, (SELECT auth.uid()))
    );

CREATE POLICY "ingestion_events_access" ON public.ingestion_events
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.ingestion_jobs j WHERE j.id = job_id AND (j.user_id = (SELECT auth.uid()) OR public.check_user_project_access(j.project_id, (SELECT auth.uid()))))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.ingestion_jobs j WHERE j.id = job_id AND (j.user_id = (SELECT auth.uid()) OR public.check_user_project_access(j.project_id, (SELECT auth.uid()))))
    );

-- ── 9. Retrieval RPC Functions ──────────────────────────────────

-- A. Explicit Hybrid Search RPC with Reciprocal Rank Fusion (RRF k=60)
CREATE OR REPLACE FUNCTION public.hybrid_match_knowledge_chunks(
    query_text TEXT,
    query_embedding vector(1536),
    match_count INT DEFAULT 8,
    vector_candidates_limit INT DEFAULT 25,
    fts_candidates_limit INT DEFAULT 25,
    filter_user_id UUID DEFAULT NULL,
    filter_project_id UUID DEFAULT NULL,
    rrf_k INT DEFAULT 60
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    document_title TEXT,
    content TEXT,
    breadcrumb JSONB,
    source_type TEXT,
    rrf_score DOUBLE PRECISION,
    vector_rank INT,
    vector_score DOUBLE PRECISION,
    fts_rank INT,
    fts_score DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    WITH vector_matches AS (
        SELECT
            kc.id AS c_id,
            kc.document_id AS d_id,
            kd.title AS d_title,
            kc.content AS c_content,
            kc.breadcrumb AS c_breadcrumb,
            kd.source_type AS d_source_type,
            (1.0 - (kc.embedding <=> query_embedding))::DOUBLE PRECISION AS v_score,
            ROW_NUMBER() OVER (ORDER BY kc.embedding <=> query_embedding ASC)::INT AS v_rank
        FROM public.knowledge_chunks kc
        JOIN public.knowledge_documents kd ON kd.id = kc.document_id
        WHERE
            (filter_user_id IS NULL OR kc.user_id = filter_user_id) AND
            (filter_project_id IS NULL OR kc.project_id = filter_project_id) AND
            kc.embedding IS NOT NULL
        ORDER BY kc.embedding <=> query_embedding ASC
        LIMIT vector_candidates_limit
    ),
    fts_matches AS (
        SELECT
            kc.id AS c_id,
            kc.document_id AS d_id,
            kd.title AS d_title,
            kc.content AS c_content,
            kc.breadcrumb AS c_breadcrumb,
            kd.source_type AS d_source_type,
            ts_rank_cd(kc.content_tsv, websearch_to_tsquery('english', query_text))::DOUBLE PRECISION AS f_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(kc.content_tsv, websearch_to_tsquery('english', query_text)) DESC)::INT AS f_rank
        FROM public.knowledge_chunks kc
        JOIN public.knowledge_documents kd ON kd.id = kc.document_id
        WHERE
            (filter_user_id IS NULL OR kc.user_id = filter_user_id) AND
            (filter_project_id IS NULL OR kc.project_id = filter_project_id) AND
            kc.content_tsv @@ websearch_to_tsquery('english', query_text)
        ORDER BY ts_rank_cd(kc.content_tsv, websearch_to_tsquery('english', query_text)) DESC
        LIMIT fts_candidates_limit
    ),
    fused AS (
        SELECT
            coalesce(v.c_id, f.c_id) AS chunk_id,
            coalesce(v.d_id, f.d_id) AS document_id,
            coalesce(v.d_title, f.d_title) AS document_title,
            coalesce(v.c_content, f.c_content) AS content,
            coalesce(v.c_breadcrumb, f.c_breadcrumb) AS breadcrumb,
            coalesce(v.d_source_type, f.d_source_type) AS source_type,
            (
                coalesce(1.0 / (rrf_k + v.v_rank), 0.0) +
                coalesce(1.0 / (rrf_k + f.f_rank), 0.0)
            )::DOUBLE PRECISION AS rrf_score,
            v.v_rank AS vector_rank,
            v.v_score AS vector_score,
            f.f_rank AS fts_rank,
            f.f_score AS fts_score
        FROM vector_matches v
        FULL OUTER JOIN fts_matches f ON v.c_id = f.c_id
    )
    SELECT
        f.chunk_id,
        f.document_id,
        f.document_title,
        f.content,
        f.breadcrumb,
        f.source_type,
        f.rrf_score,
        f.vector_rank,
        f.vector_score,
        f.fts_rank,
        f.fts_score
    FROM fused f
    ORDER BY f.rrf_score DESC
    LIMIT match_count;
END;
$$;

-- B. Brand Memory Active Fetcher RPC
CREATE OR REPLACE FUNCTION public.get_active_brand_memories(
    p_user_id UUID,
    p_project_id UUID DEFAULT NULL,
    p_min_confidence REAL DEFAULT 0.6
)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    user_id UUID,
    key TEXT,
    category TEXT,
    value TEXT,
    confidence REAL,
    provenance JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
    SELECT
        bm.id,
        bm.project_id,
        bm.user_id,
        bm.key,
        bm.category,
        bm.value,
        bm.confidence,
        bm.provenance,
        bm.created_at,
        bm.updated_at
    FROM public.brand_memories bm
    WHERE
        bm.user_id = p_user_id AND
        (p_project_id IS NULL OR bm.project_id = p_project_id) AND
        bm.status = 'active' AND
        bm.confidence >= p_min_confidence
    ORDER BY bm.confidence DESC, bm.updated_at DESC;
$$;
