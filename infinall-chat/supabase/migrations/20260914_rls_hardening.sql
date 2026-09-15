-- Do not expose nullable-owner rows through user-scoped RLS policies.
DROP POLICY IF EXISTS "Users can manage their own knowledge documents" ON knowledge_documents;
CREATE POLICY "Users can manage their own knowledge documents"
  ON knowledge_documents FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can access their own knowledge chunks" ON knowledge_chunks;
CREATE POLICY "Users can access their own knowledge chunks"
  ON knowledge_chunks FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own brand memories" ON brand_memories;
CREATE POLICY "Users can manage their own brand memories"
  ON brand_memories FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can access their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can access their own chat sessions"
  ON chat_sessions FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
