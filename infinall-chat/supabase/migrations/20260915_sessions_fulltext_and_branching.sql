-- ============================================================
-- Migration: 20260915_sessions_fulltext_and_branching.sql
-- Full-Text History Search (tsvector + GIN) & Message Tree Branching
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ensure parent_id exists on chat_messages for conversation tree branching
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN parent_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'branch_index'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN branch_index INT DEFAULT 0;
  END IF;
END $$;

-- 2. Add GIN full-text index on chat_sessions title
CREATE INDEX IF NOT EXISTS idx_sessions_title_gin ON chat_sessions USING gin(to_tsvector('english', title));

-- 3. Stored Procedure: search_chat_history
CREATE OR REPLACE FUNCTION search_chat_history (
  search_query text,
  filter_user_id uuid DEFAULT NULL,
  filter_project_id uuid DEFAULT NULL,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  session_id uuid,
  session_title text,
  message_id uuid,
  role text,
  content_snippet text,
  is_pinned boolean,
  updated_at timestamptz,
  rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id AS session_id,
    cs.title AS session_title,
    cm.id AS message_id,
    cm.role,
    SUBSTRING(
      CASE 
        WHEN jsonb_typeof(cm.content) = 'string' THEN cm.content #>> '{}'
        WHEN jsonb_typeof(cm.content) = 'object' THEN cm.content ->> 'content'
        ELSE cm.content::text
      END
      FROM 1 FOR 250
    ) AS content_snippet,
    cs.is_pinned,
    cs.updated_at,
    ts_rank(
      to_tsvector('english', COALESCE(cs.title, '') || ' ' || COALESCE(cm.content::text, '')),
      plainto_tsquery('english', search_query)
    )::float AS rank
  FROM chat_sessions cs
  JOIN chat_messages cm ON cs.id = cm.session_id
  WHERE (filter_user_id IS NULL OR cs.user_id = filter_user_id)
    AND (filter_project_id IS NULL OR cs.project_id = filter_project_id)
    AND cs.deleted_at IS NULL
    AND (
      to_tsvector('english', cs.title || ' ' || cm.content::text) @@ plainto_tsquery('english', search_query)
      OR cs.title ILIKE '%' || search_query || '%'
    )
  ORDER BY rank DESC, cs.updated_at DESC
  LIMIT match_count;
END;
$$;
