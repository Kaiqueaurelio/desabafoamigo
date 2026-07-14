
-- 1) Policies admin: public -> authenticated
DROP POLICY IF EXISTS "admins update appointments" ON public.appointments;
CREATE POLICY "admins update appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins insert attachments" ON public.attachments;
CREATE POLICY "admins insert attachments" ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins read attachments" ON public.attachments;
CREATE POLICY "admins read attachments" ON public.attachments FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins update conversations" ON public.conversations;
CREATE POLICY "admins update conversations" ON public.conversations FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins read all messages" ON public.messages;
CREATE POLICY "admins read all messages" ON public.messages FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins send messages" ON public.messages;
CREATE POLICY "admins send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins update messages" ON public.messages;
CREATE POLICY "admins update messages" ON public.messages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 2) Anexos: permitir DELETE admin
CREATE POLICY "admins delete attachments" ON public.attachments FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- 3) Volunteers: remover exposição de PII entre voluntários
DROP POLICY IF EXISTS "volunteers can see other volunteers status" ON public.volunteers;

-- 4) user_roles: gatilho para bloquear autoescalada mesmo se novas policies forem adicionadas
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    -- inserts do sistema (service_role/triggers) sem sessão passam
    RETURN NEW;
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can grant roles' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.user_roles;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 5) Fixa search_path das funções restantes
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_random_alias() SET search_path = public;

-- 6) Revoga EXECUTE público/authenticated das funções sensíveis
REVOKE EXECUTE ON FUNCTION public.purge_ended_conversations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_incidents() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_push_logs() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.run_daily_maintenance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_pending_follow_ups() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._test_mfa_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit(text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_conversation_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_random_alias() FROM PUBLIC, anon;
-- Funções chamadas por triggers/RLS não precisam de EXECUTE público:
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_volunteer_row() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_volunteer_admin_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_appointments_for_flagged() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_flag_repeat_offender() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.schedule_follow_up_on_end() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_training_before_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_training_completion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_self_escalation() FROM PUBLIC, anon, authenticated;

-- has_role, check_mfa_lock, record_mfa_attempt permanecem executáveis por authenticated (usados em RLS/chamadas do app)
