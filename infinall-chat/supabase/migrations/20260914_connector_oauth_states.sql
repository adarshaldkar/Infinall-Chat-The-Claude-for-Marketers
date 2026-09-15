CREATE TABLE IF NOT EXISTS connector_oauth_states (
  state UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_oauth_states_expiry ON connector_oauth_states(expires_at);
ALTER TABLE connector_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their oauth states"
  ON connector_oauth_states FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
