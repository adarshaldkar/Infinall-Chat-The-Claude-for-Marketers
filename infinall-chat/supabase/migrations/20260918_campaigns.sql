-- ============================================================
-- Infinall Chat - Campaigns Pipeline Migration
-- Cross-channel campaign lifecycle management with RLS and project isolation
-- ============================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_review', 'approved', 'running', 'completed', 'paused', 'cancelled')),
    channels JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["meta_ads", "google_ads", "email", "linkedin", "seo"]
    budget_cents BIGINT DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    target_kpis JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"roas": 3.5, "cpa_cents": 2500, "leads": 500}
    actual_metrics JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"spend_cents": 120000, "impressions": 45000, "conversions": 120}
    deliverables JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{"type": "copy", "title": "Ad Headlines", "status": "approved"}]
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for high performance lookup
CREATE INDEX IF NOT EXISTS idx_campaigns_project ON public.campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Drop any previous policies
DROP POLICY IF EXISTS "Users can view campaigns they own or have project access to" ON public.campaigns;
DROP POLICY IF EXISTS "Users can create campaigns in their projects" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update their own or project campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.campaigns;

-- SELECT policy: user owns row OR has project access
CREATE POLICY "Users can view campaigns they own or have project access to"
ON public.campaigns
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    (project_id IS NOT NULL AND public.check_user_project_access(project_id, auth.uid()))
);

-- INSERT policy: authenticated user creates row for themselves
CREATE POLICY "Users can create campaigns in their projects"
ON public.campaigns
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() OR
    (project_id IS NOT NULL AND public.check_user_project_access(project_id, auth.uid()))
);

-- UPDATE policy
CREATE POLICY "Users can update their own or project campaigns"
ON public.campaigns
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid() OR
    (project_id IS NOT NULL AND public.check_user_project_access(project_id, auth.uid()))
)
WITH CHECK (
    user_id = auth.uid() OR
    (project_id IS NOT NULL AND public.check_user_project_access(project_id, auth.uid()))
);

-- DELETE policy
CREATE POLICY "Users can delete their own campaigns"
ON public.campaigns
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid() OR
    (project_id IS NOT NULL AND public.check_user_project_access(project_id, auth.uid()))
);
