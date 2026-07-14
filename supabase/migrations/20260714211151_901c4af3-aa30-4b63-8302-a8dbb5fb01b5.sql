
-- 1) messages: admin inserts só como próprio remetente
DROP POLICY IF EXISTS "admins send messages" ON public.messages;
CREATE POLICY "admins send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'admin')
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user_id = auth.uid() OR c.volunteer_id = auth.uid())
    )
  );

-- 2) queue: separar por operação
DROP POLICY IF EXISTS "User manages own queue entries" ON public.queue;

CREATE POLICY "Users insert own queue entry" ON public.queue FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own queue entry" ON public.queue FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own queue entry" ON public.queue FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users read own queue entry" ON public.queue FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Volunteers read queue" ON public.queue FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'volunteer') OR has_role(auth.uid(),'admin'));

CREATE POLICY "Volunteers claim queue entries" ON public.queue FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'volunteer') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'volunteer') OR has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete queue entries" ON public.queue FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- 3) storage: DELETE/UPDATE explícitos apenas para admins no bucket consultation-files
DROP POLICY IF EXISTS "admins delete consultation files" ON storage.objects;
CREATE POLICY "admins delete consultation files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'consultation-files' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins update consultation files" ON storage.objects;
CREATE POLICY "admins update consultation files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'consultation-files' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'consultation-files' AND public.has_role(auth.uid(),'admin'));

-- 4) Funções SECURITY DEFINER: revogar EXECUTE onde possível
REVOKE EXECUTE ON FUNCTION public.check_mfa_lock(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_mfa_attempt(text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_conversation_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
-- has_role continua acessível a authenticated: é chamada pelas próprias policies RLS.
-- check_mfa_lock/record_mfa_attempt continuam acessíveis a authenticated: usados no fluxo 2FA do app.
