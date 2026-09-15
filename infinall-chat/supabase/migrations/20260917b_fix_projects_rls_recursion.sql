-- ====================================================================
-- Infinall Chat: RLS Recursion Fix for projects table
-- Paste this into Supabase SQL Editor and Run
-- ====================================================================

-- Drop conflicting overlapping policies on projects
DROP POLICY IF EXISTS "Project owners and members can access projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can manage projects" ON public.projects;

-- Re-create as a single unified non-recursive policy
-- Uses security barrier subquery pattern (SELECT auth.uid()) to prevent recursion
CREATE POLICY "Projects: owner full access, members read"
  ON public.projects FOR ALL TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id
        AND pm.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid())
  );
