
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purge_messages_on_end() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_volunteer_row() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "anyone can insert metric" ON public.metrics;
CREATE POLICY "auth can insert metric event only" ON public.metrics FOR INSERT TO authenticated
  WITH CHECK (event IN ('conversation_started','conversation_ended','joined_queue') AND (duration_seconds IS NULL OR duration_seconds >= 0));
