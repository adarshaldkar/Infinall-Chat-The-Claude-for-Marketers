-- ============================================================
-- Migration: 20260915_rag_scoped_knowledge_memory.sql
-- Project/Brand Scoped Knowledge Base & Persistent Memory
-- ============================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Add project_id column if not exists to knowledge_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'knowledge_documents' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE knowledge_documents ADD COLUMN project_id UUID;
  END IF;
END $$;

-- 3. Add project_id column to knowledge_chunks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'knowledge_chunks' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE knowledge_chunks ADD COLUMN project_id UUID;
  END IF;
END $$;

-- 4. Add project_id and status to brand_memories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brand_memories' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE brand_memories ADD COLUMN project_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brand_memories' AND column_name = 'status'
  ) THEN
    ALTER TABLE brand_memories ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brand_memories' AND column_name = 'superseded_by'
  ) THEN
    ALTER TABLE brand_memories ADD COLUMN superseded_by UUID REFERENCES brand_memories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Indexes for fast project-scoped lookups
CREATE INDEX IF NOT EXISTS idx_docs_project_user ON knowledge_documents(project_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_chunks_project ON knowledge_chunks(project_id, document_id);
CREATE INDEX IF NOT EXISTS idx_brand_memories_project ON brand_memories(project_id, user_id, status);

-- 6. Stored Procedure: match_scoped_knowledge_chunks (Hybrid RRF & Vector Search)
CREATE OR REPLACE FUNCTION match_scoped_knowledge_chunks (
  query_embedding vector(1536),
  query_text text DEFAULT '',
  match_threshold float DEFAULT 0.15,
  match_count int DEFAULT 8,
  filter_user_id uuid DEFAULT NULL,
  filter_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  project_id uuid,
  chunk_index int,
  page_number int,
  section_title text,
  content text,
  metadata jsonb,
  vector_similarity float,
  text_rank float,
  rrf_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_matches AS (
    SELECT 
      kc.id,
      1 - (kc.embedding <=> query_embedding) AS sim,
      ROW_NUMBER() OVER (ORDER BY (kc.embedding <=> query_embedding) ASC) AS v_rank
    FROM knowledge_chunks kc
    WHERE (filter_user_id IS NULL OR kc.user_id = filter_user_id)
      AND (filter_project_id IS NULL OR kc.project_id = filter_project_id)
      AND (kc.embedding IS NOT NULL)
      AND (1 - (kc.embedding <=> query_embedding)) >= match_threshold
    LIMIT match_count * 2
  ),
  text_matches AS (
    SELECT 
      kc.id,
      ts_rank_cd(kc.search_vector, plainto_tsquery('english', query_text)) AS trank,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(kc.search_vector, plainto_tsquery('english', query_text)) DESC) AS t_rank
    FROM knowledge_chunks kc
    WHERE (filter_user_id IS NULL OR kc.user_id = filter_user_id)
      AND (filter_project_id IS NULL OR kc.project_id = filter_project_id)
      AND (query_text <> '' AND kc.search_vector @@ plainto_tsquery('english', query_text))
    LIMIT match_count * 2
  )
  SELECT
    kc.id,
    kc.document_id,
    kc.project_id,
    kc.chunk_index,
    kc.page_number,
    kc.section_title,
    kc.content,
    kc.metadata,
    COALESCE(vm.sim, 0.0)::float AS vector_similarity,
    COALESCE(tm.trank, 0.0)::float AS text_rank,
    (
      COALESCE(1.0 / (60.0 + vm.v_rank), 0.0) +
      COALESCE(1.0 / (60.0 + tm.t_rank), 0.0)
    )::float AS rrf_score
  FROM knowledge_chunks kc
  LEFT JOIN vector_matches vm ON kc.id = vm.id
  LEFT JOIN text_matches tm ON kc.id = tm.id
  WHERE (vm.id IS NOT NULL OR tm.id IS NOT NULL)
  ORDER BY rrf_score DESC
  LIMIT match_count;
END;
$$;

-- 7. Stored Procedure: match_scoped_brand_memories
CREATE OR REPLACE FUNCTION match_scoped_brand_memories (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.20,
  match_count int DEFAULT 6,
  filter_user_id uuid DEFAULT NULL,
  filter_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  category text,
  memory_key text,
  memory_value text,
  confidence float,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bm.id,
    bm.project_id,
    bm.category,
    bm.memory_key,
    bm.memory_value,
    bm.confidence,
    (1 - (bm.embedding <=> query_embedding))::float AS similarity
  FROM brand_memories bm
  WHERE bm.status = 'active'
    AND (filter_user_id IS NULL OR bm.user_id = filter_user_id)
    AND (filter_project_id IS NULL OR bm.project_id = filter_project_id)
    AND (bm.embedding IS NOT NULL)
    AND (1 - (bm.embedding <=> query_embedding)) >= match_threshold
  ORDER BY bm.confidence DESC, (bm.embedding <=> query_embedding) ASC
  LIMIT match_count;
END;
$$;
