-- Dynamic workspace foundation: projects, lifecycle state, sharing, and durable artifact versions.

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_knowledge (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, document_id)
);

ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

ALTER TABLE artifact_versions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE artifact_versions ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_owner_updated ON projects(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_lifecycle ON chat_sessions(user_id, deleted_at, archived_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_share_token ON chat_sessions(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artifact_versions_artifact_version ON artifact_versions(artifact_id, version DESC);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifact_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners and members can access projects"
  ON projects FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Project owners can manage projects"
  ON projects FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "Project members can access membership"
  ON project_members FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = (SELECT auth.uid())
  ));

CREATE POLICY "Project owners can manage membership"
  ON project_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = (SELECT auth.uid())));

CREATE POLICY "Project members can access project knowledge"
  ON project_knowledge FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM project_members pm WHERE pm.project_id = project_knowledge.project_id AND pm.user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_knowledge.project_id AND p.owner_id = (SELECT auth.uid())
  ));

CREATE POLICY "Artifact owners can access versions"
  ON artifact_versions FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Existing nullable ownership is retained for backward-compatible local migrations,
-- but new application writes must always provide an authenticated user_id.