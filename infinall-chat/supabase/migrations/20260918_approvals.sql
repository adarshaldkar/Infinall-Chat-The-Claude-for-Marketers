-- ============================================================
-- Infinall Chat - Approval Requests & Governance Center
-- Manages high-stakes mutations (ad spend, copy push, audience delete)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'ad_spend_mutation', 'campaign_launch', 'copy_publish', 'audience_sync', 'tool_mutation'
    tool_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- parameters and diff of the mutation
    impact_level TEXT NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    estimated_cost_cents BIGINT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'cancelled')),
    rejection_reason TEXT,
    approval_notes TEXT,
    hmac_signature TEXT,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for quick lookups
CREATE INDEX IF NOT EXISTS idx_approval_requests_project ON public.approval_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON public.approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if any
DROP POLICY IF EXISTS "Users can view approval requests for their projects or submissions" ON public.approval_requests;
DROP POLICY IF EXISTS "Users can create approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Reviewers and creators can update approval requests" ON public.approval_requests;

-- Policies
CREATE POLICY "Users can view approval requests for their projects or submissions"
ON public.approval_requests
FOR SELECT
TO authenticated
USING (
    requester_id = auth.uid() OR
    reviewer_id = auth.uid() OR
    (project_id IS NOT NULL AND public.check_user_project_access(project_id, auth.uid()))
);

CREATE POLICY "Users can create approval requests"
ON public.approval_requests
FOR INSERT
TO authenticated
WITH CHECK (
    requester_id = auth.uid() OR
    (project_id IS NOT NULL AND public.check_user_project_access(project_id, auth.uid()))
);

CREATE POLICY "Reviewers and creators can update approval requests"
ON public.approval_requests
FOR UPDATE
TO authenticated
USING (
    requester_id = auth.uid() OR
    reviewer_id = auth.uid() OR
    (project_id IS NOT NULL AND public.check_user_project_access(project_id, auth.uid()))
)
WITH CHECK (
    requester_id = auth.uid() OR
    reviewer_id = auth.uid() OR
    (project_id IS NOT NULL AND public.check_user_project_access(project_id, auth.uid()))
);
