-- ============================================================
-- Migration: 20260920_fts_and_retention_worker.sql
-- 30-Day Soft Delete Retention, Hard Delete Cleanup & FTS GIN
-- ============================================================

-- 1. Ensure archived and deleted_at columns exist with indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_sessions' AND column_name = 'archived'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN archived BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_sessions' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_sessions' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_deleted_at ON chat_sessions(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived_at ON chat_sessions(archived_at) WHERE archived_at IS NOT NULL;

-- 2. Enhanced GIN Full Text Search Indexes on sessions & messages
CREATE INDEX IF NOT EXISTS idx_sessions_title_fts ON chat_sessions USING gin(to_tsvector('english', COALESCE(title, '')));

-- 3. Stored Procedure: purge_expired_archived_sessions (30-day retention hard cleanup)
CREATE OR REPLACE FUNCTION purge_expired_archived_sessions(retention_days int DEFAULT 30)
RETURNS TABLE (
  purged_sessions_count int,
  purged_messages_count int,
  purged_artifacts_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_ids uuid[];
  v_purged_sessions int := 0;
  v_purged_messages int := 0;
  v_purged_artifacts int := 0;
  v_cutoff timestamptz;
BEGIN
  v_cutoff := NOW() - (retention_days || ' days')::interval;

  -- Select session IDs marked deleted or archived beyond the retention window
  SELECT ARRAY_AGG(id) INTO v_session_ids
  FROM chat_sessions
  WHERE (deleted_at IS NOT NULL AND deleted_at < v_cutoff)
     OR (archived = true AND archived_at IS NOT NULL AND archived_at < v_cutoff);

  IF v_session_ids IS NOT NULL AND ARRAY_LENGTH(v_session_ids, 1) > 0 THEN
    -- Delete child doc artifacts
    WITH deleted_arts AS (
      DELETE FROM doc_artifacts WHERE session_id = ANY(v_session_ids) RETURNING id
    )
    SELECT COUNT(*) INTO v_purged_artifacts FROM deleted_arts;

    -- Delete child chat messages
    WITH deleted_msgs AS (
      DELETE FROM chat_messages WHERE session_id = ANY(v_session_ids) RETURNING id
    )
    SELECT COUNT(*) INTO v_purged_messages FROM deleted_msgs;

    -- Delete chat sessions
    WITH deleted_sess AS (
      DELETE FROM chat_sessions WHERE id = ANY(v_session_ids) RETURNING id
    )
    SELECT COUNT(*) INTO v_purged_sessions FROM deleted_sess;
  END IF;

  RETURN QUERY SELECT v_purged_sessions, v_purged_messages, v_purged_artifacts;
END;
$$;

-- 4. Stored Procedure: restore_archived_session
CREATE OR REPLACE FUNCTION restore_archived_session(p_session_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE chat_sessions
  SET archived = false,
      archived_at = NULL,
      deleted_at = NULL,
      updated_at = NOW()
  WHERE id = p_session_id 
    AND (user_id = p_user_id OR user_id IS NULL);

  RETURN FOUND;
END;
$$;
