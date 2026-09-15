-- ============================================================
-- Migration: 20260919_custom_skills.sql
-- Table & RLS Policies for Custom Marketing Skills
-- ============================================================

CREATE TABLE IF NOT EXISTS custom_skills (
  id TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_keywords TEXT[] DEFAULT '{}'::TEXT[],
  system_prompt_injection TEXT NOT NULL,
  rules JSONB DEFAULT '[]'::JSONB,
  suggested_tools TEXT[] DEFAULT '{}'::TEXT[],
  default_artifact_type TEXT DEFAULT 'markdown',
  scope TEXT DEFAULT 'personal' CHECK (scope IN ('personal', 'team', 'catalog')),
  icon TEXT DEFAULT 'Sparkles',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast autocomplete lookups
CREATE INDEX IF NOT EXISTS idx_custom_skills_slug ON custom_skills(slug);
CREATE INDEX IF NOT EXISTS idx_custom_skills_user ON custom_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_skills_project ON custom_skills(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_skills_scope ON custom_skills(scope);

-- Enable RLS
ALTER TABLE custom_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view accessible skills" ON custom_skills;
CREATE POLICY "Users can view accessible skills" ON custom_skills
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR scope = 'catalog'
    OR (
      scope = 'team'
      AND project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert their own skills" ON custom_skills;
CREATE POLICY "Users can insert their own skills" ON custom_skills
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "Users can update their own skills" ON custom_skills;
CREATE POLICY "Users can update their own skills" ON custom_skills
  FOR UPDATE
  USING (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can delete their own skills" ON custom_skills;
CREATE POLICY "Users can delete their own skills" ON custom_skills
  FOR DELETE
  USING (
    user_id = auth.uid()
  );
