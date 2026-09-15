-- ====================================================================
-- Emergency Fix: Drop ALL policies on projects and rebuild from scratch
-- Run this in SQL Editor to fix the infinite recursion error
-- ====================================================================

-- Step 1: List existing policies (for reference)
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'projects';
