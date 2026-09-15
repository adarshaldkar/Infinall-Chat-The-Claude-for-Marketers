-- Per-user connector lifecycle and encrypted credential references.
CREATE TABLE IF NOT EXISTS connector_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  encrypted_credentials TEXT,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'degraded', 'expired', 'revoked')),
  last_health_check_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, connector_id)
);

CREATE INDEX IF NOT EXISTS idx_connector_connections_user_status ON connector_connections(user_id, status);
ALTER TABLE connector_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their connector connections"
  ON connector_connections FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
