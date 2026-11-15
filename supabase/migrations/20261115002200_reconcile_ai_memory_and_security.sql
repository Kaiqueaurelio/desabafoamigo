-- Reconcile the production schema with the checked-in AI memory contract.
-- Safe to re-run: no existing user data is deleted.

CREATE TABLE IF NOT EXISTS public.ai_user_memory (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_summary text NOT NULL CHECK (char_length(memory_summary) <= 1500),
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_user_memory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_user_memory FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_user_memory TO authenticated;
GRANT ALL ON TABLE public.ai_user_memory TO service_role;
COMMENT ON TABLE public.ai_user_memory IS
  'Private per-user AI memory. RLS restricts access to the authenticated owner.';

DROP POLICY IF EXISTS "Users can read their own AI memory" ON public.ai_user_memory;
CREATE POLICY "Users can read their own AI memory"
  ON public.ai_user_memory FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own AI memory" ON public.ai_user_memory;
CREATE POLICY "Users can insert their own AI memory"
  ON public.ai_user_memory FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own AI memory" ON public.ai_user_memory;
CREATE POLICY "Users can update their own AI memory"
  ON public.ai_user_memory FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own AI memory" ON public.ai_user_memory;
CREATE POLICY "Users can delete their own AI memory"
  ON public.ai_user_memory FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS ai_user_memory_expires_at_idx
  ON public.ai_user_memory (expires_at);

-- Privacy-preserving AI response telemetry. We deliberately do NOT store user
-- prompts, model responses, attachment content, or conversation text.
CREATE TABLE IF NOT EXISTS public.ai_response_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('nvidia', 'lovable', 'none')),
  degraded boolean NOT NULL DEFAULT false,
  severity smallint NOT NULL DEFAULT 0 CHECK (severity BETWEEN 0 AND 3),
  response_chars integer NOT NULL DEFAULT 0 CHECK (response_chars BETWEEN 0 AND 2000),
  latency_ms integer NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  forwarded_to_volunteer boolean NOT NULL DEFAULT false,
  forwarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_response_events_created_at_idx
  ON public.ai_response_events (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_response_events_forwarded_idx
  ON public.ai_response_events (created_at DESC)
  WHERE forwarded_to_volunteer;

ALTER TABLE public.ai_response_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_response_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ai_response_events TO authenticated;
GRANT ALL ON TABLE public.ai_response_events TO service_role;
COMMENT ON TABLE public.ai_response_events IS
  'Privacy-preserving AI response telemetry; never stores prompts, replies, or attachments.';

DROP POLICY IF EXISTS "Users insert own AI response events" ON public.ai_response_events;
DROP POLICY IF EXISTS "Users mark own AI response handoff" ON public.ai_response_events;
DROP POLICY IF EXISTS "Admins read AI response events" ON public.ai_response_events;
CREATE POLICY "Admins read AI response events"
  ON public.ai_response_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Guest sessions are authenticated JWTs. Keep guest access for the core
-- anonymous-support journey, but require a permanent account for MFA,
-- passkeys, and volunteer-only learning/response tools.
CREATE OR REPLACE FUNCTION public.is_persistent_user()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(auth.jwt() ->> 'is_anonymous', 'false') <> 'true';
$$;
REVOKE ALL ON FUNCTION public.is_persistent_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_persistent_user() TO authenticated;

DROP POLICY IF EXISTS "Permanent accounts only" ON public.mfa_attempts;
CREATE POLICY "Permanent accounts only"
  ON public.mfa_attempts AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_persistent_user())
  WITH CHECK (public.is_persistent_user());

DROP POLICY IF EXISTS "Permanent admins only" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Permanent admins and volunteers only" ON public.webauthn_credentials;
CREATE POLICY "Permanent admins and volunteers only"
  ON public.webauthn_credentials AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.is_persistent_user()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'volunteer'::public.app_role)
    )
  )
  WITH CHECK (
    public.is_persistent_user()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'volunteer'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Permanent volunteer applications only" ON public.volunteers;
CREATE POLICY "Permanent volunteer applications only"
  ON public.volunteers AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_persistent_user())
  WITH CHECK (public.is_persistent_user());

DROP POLICY IF EXISTS "Approved volunteers raise own escalations" ON public.crisis_escalations;
DROP POLICY IF EXISTS "volunteers raise their own" ON public.crisis_escalations;
CREATE POLICY "Approved volunteers raise own escalations"
  ON public.crisis_escalations FOR INSERT TO authenticated
  WITH CHECK (
    raised_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'volunteer'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    AND EXISTS (
      SELECT 1
      FROM public.conversations AS c
      WHERE c.id = crisis_escalations.conversation_id
        AND (
          c.volunteer_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  );

DROP POLICY IF EXISTS "Permanent volunteers only" ON public.volunteer_training_progress;
CREATE POLICY "Permanent volunteers only"
  ON public.volunteer_training_progress AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.is_persistent_user()
    AND (
      public.has_role(auth.uid(), 'volunteer'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    public.is_persistent_user()
    AND (
      public.has_role(auth.uid(), 'volunteer'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Permanent volunteers manage templates" ON public.volunteer_templates;
CREATE POLICY "Permanent volunteers manage templates"
  ON public.volunteer_templates AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.is_persistent_user()
    AND (
      public.has_role(auth.uid(), 'volunteer'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    public.is_persistent_user()
    AND (
      public.has_role(auth.uid(), 'volunteer'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Passkey challenges are intentionally server-only. RLS with no client policy
-- is the correct boundary here; never add a permissive browser policy.
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.webauthn_challenges FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.webauthn_challenges TO service_role;
COMMENT ON TABLE public.webauthn_challenges IS
  'Server-only WebAuthn challenge store. No browser role has table privileges or RLS policies.';

-- Reassert the private-bucket policy: users may read only media referenced by
-- published library records; admins may read unpublished drafts. Unreferenced
-- objects are never downloadable through the authenticated Storage API.
DROP POLICY IF EXISTS "library media read" ON storage.objects;
DROP POLICY IF EXISTS "library media read published assets" ON storage.objects;
CREATE POLICY "library media read published assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'library-media'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.library_audios AS a
        WHERE a.published IS TRUE
          AND (a.audio_url = objects.name OR a.cover_url = objects.name)
      )
      OR EXISTS (
        SELECT 1 FROM public.library_images AS i
        WHERE i.published IS TRUE
          AND i.image_url = objects.name
      )
    )
  );

-- Harden every SECURITY DEFINER function against PUBLIC/anon invocation and
-- search_path shadowing. Then explicitly grant only the app's scoped RPCs.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      fn.schema_name, fn.function_name, fn.identity_args
    );
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.schema_name, fn.function_name, fn.identity_args
    );
  END LOOP;
END
$$;

-- has_role can only inspect the caller's own role, preventing role enumeration.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = _role
    );
$$;

-- Reassert explicit scopes for the only SECURITY DEFINER RPCs the browser uses.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_mfa_lock(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_mfa_attempt(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_queue_position() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_queue_entry(uuid) TO authenticated;

-- MFA RPCs accept only the two supported scopes and always use auth.uid().
CREATE OR REPLACE FUNCTION public.check_mfa_lock(_scope text)
RETURNS TABLE(locked boolean, remaining_seconds integer, failed_count integer)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  fails integer;
  last_fail timestamptz;
  window_start timestamptz := now() - interval '15 minutes';
  lock_until timestamptz;
BEGIN
  IF uid IS NULL OR NOT public.is_persistent_user() THEN
    RAISE EXCEPTION 'permanent authenticated account required' USING ERRCODE = '42501';
  END IF;
  IF _scope NOT IN ('pro', 'admin') THEN
    RAISE EXCEPTION 'invalid MFA scope' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*), MAX(created_at)
    INTO fails, last_fail
  FROM public.mfa_attempts
  WHERE user_id = uid
    AND scope = _scope
    AND success = false
    AND created_at > window_start
    AND created_at > COALESCE(
      (
        SELECT MAX(created_at)
        FROM public.mfa_attempts
        WHERE user_id = uid
          AND scope = _scope
          AND success = true
      ),
      'epoch'::timestamptz
    );

  IF fails >= 5 THEN
    lock_until := last_fail + interval '15 minutes';
    IF lock_until > now() THEN
      RETURN QUERY
        SELECT true, EXTRACT(EPOCH FROM (lock_until - now()))::integer, fails;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT false, 0, COALESCE(fails, 0);
END
$$;

CREATE OR REPLACE FUNCTION public.record_mfa_attempt(_scope text, _success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.is_persistent_user() THEN
    RAISE EXCEPTION 'permanent authenticated account required' USING ERRCODE = '42501';
  END IF;
  IF _scope NOT IN ('pro', 'admin') THEN
    RAISE EXCEPTION 'invalid MFA scope' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.mfa_attempts (user_id, scope, success)
  VALUES (uid, _scope, _success);
END
$$;

GRANT EXECUTE ON FUNCTION public.check_mfa_lock(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_mfa_attempt(text, boolean) TO authenticated;
