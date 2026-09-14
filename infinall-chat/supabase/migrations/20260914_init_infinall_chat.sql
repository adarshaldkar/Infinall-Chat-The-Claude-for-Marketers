-- ============================================================
-- Infinall Chat - Core Database Migration
-- Corresponds directly to PRD §11 (Data Architecture & Storage)
-- ============================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Strategy Chat',
  model_id TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Chat Messages Table (with JSONB & tsvector full-text search)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content JSONB NOT NULL,
  thinking TEXT,
  tokens INT,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(content->>'text', '') || ' ' || coalesce(thinking, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_search ON chat_messages USING GIN(search_vector);

-- 4. Document Artifacts Table
CREATE TABLE IF NOT EXISTS doc_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  language TEXT,
  content TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Artifact Version History Snapshots
CREATE TABLE IF NOT EXISTS artifact_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artifact_id UUID NOT NULL REFERENCES doc_artifacts(id) ON DELETE CASCADE,
  version INT NOT NULL,
  content TEXT NOT NULL,
  diff_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. MCP Connectors Directory Table
CREATE TABLE IF NOT EXISTS mcp_connectors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  server_endpoint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sandbox',
  latency_ms INT NOT NULL DEFAULT 150,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Approval Audit Log (Immutable append-only log)
CREATE TABLE IF NOT EXISTS approval_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  args JSONB NOT NULL,
  hmac_hash TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Row Level Security (RLS)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own chat sessions"
  ON chat_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can access messages for their sessions"
  ON chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access artifacts for their sessions"
  ON doc_artifacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = doc_artifacts.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );
