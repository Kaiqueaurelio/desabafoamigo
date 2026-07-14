
REVOKE EXECUTE ON FUNCTION public.enforce_training_before_approval() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_training_completion() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.schedule_follow_up_on_end() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_pending_follow_ups() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.run_daily_maintenance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_conversation_access(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.log_conversation_access(UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.send_pending_follow_ups() TO service_role;
GRANT  EXECUTE ON FUNCTION public.run_daily_maintenance() TO service_role;
