-- ============================================================
-- Infinall Chat - Phase 5 RAG Knowledge Base & Brand Memory
-- Supports ALL file formats: PDF, DOCX, PPTX, XLSX, CSV, MD, TXT
-- Corresponds to PRD §11 & pgvector Semantic Search
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Knowledge Documents Table (All file types)
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'csv', 'md', 'txt'
  file_size_bytes BIGINT DEFAULT 0,
  page_count INT DEFAULT 1,
  chunk_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'validating', -- 'validating', 'parsing', 'chunking', 'embedding', 'ready', 'failed'
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_user_status ON knowledge_documents(user_id, status);

-- 3. Knowledge Chunks Table (vector(1536) + tsvector FTS)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  page_number INT DEFAULT 1,
  section_title TEXT,
  content TEXT NOT NULL,
  token_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_search ON knowledge_chunks USING GIN(search_vector);

-- Create HNSW index for sub-millisecond approximate nearest neighbor search
DO $$
BEGIN
  CREATE INDEX idx_chunks_embedding_hnsw ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN OTHERS THEN
  CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivf ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
END $$;

-- 4. Brand Memories Table (Cross-Session Marketer Continuity)
CREATE TABLE IF NOT EXISTS brand_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  category TEXT NOT NULL, -- 'brand_voice', 'target_audience', 'product_catalog', 'campaign_learning', 'competitor_positioning'
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.9,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_memories_user ON brand_memories(user_id, category);

-- 5. Stored Procedure: match_knowledge_chunks (Cosine vector similarity)
CREATE OR REPLACE FUNCTION match_knowledge_chunks (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.15,
  match_count int DEFAULT 8,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_index int,
  page_number int,
  section_title text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.chunk_index,
    kc.page_number,
    kc.section_title,
    kc.content,
    kc.metadata,
    (1 - (kc.embedding <=> query_embedding))::float AS similarity
  FROM knowledge_chunks kc
  WHERE (filter_user_id IS NULL OR kc.user_id = filter_user_id)
    AND kc.embedding IS NOT NULL
    AND (1 - (kc.embedding <=> query_embedding)) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. Stored Procedure: match_brand_memories (Cosine vector similarity)
CREATE OR REPLACE FUNCTION match_brand_memories (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.15,
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
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
    bm.category,
    bm.memory_key,
    bm.memory_value,
    bm.confidence,
    (1 - (bm.embedding <=> query_embedding))::float AS similarity
  FROM brand_memories bm
  WHERE (filter_user_id IS NULL OR bm.user_id = filter_user_id)
    AND bm.embedding IS NOT NULL
    AND (1 - (bm.embedding <=> query_embedding)) > match_threshold
  ORDER BY bm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Row Level Security
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own knowledge documents"
  ON knowledge_documents FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can access their own knowledge chunks"
  ON knowledge_chunks FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage their own brand memories"
  ON brand_memories FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL);
