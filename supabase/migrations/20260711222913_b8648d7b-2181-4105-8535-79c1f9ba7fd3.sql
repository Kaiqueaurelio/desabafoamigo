CREATE OR REPLACE FUNCTION public._test_mfa_rate_limit()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid := gen_random_uuid();
  r record;
BEGIN
  -- ephemeral user
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'mfa-test-' || uid || '@example.test', '', now(), now());

  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- baseline
  SELECT * INTO r FROM public.check_mfa_lock('pro');
  IF r.locked OR r.failed_count <> 0 THEN RAISE EXCEPTION 'baseline failed: %', r; END IF;

  -- 4 fails => not locked
  PERFORM public.record_mfa_attempt('pro', false);
  PERFORM public.record_mfa_attempt('pro', false);
  PERFORM public.record_mfa_attempt('pro', false);
  PERFORM public.record_mfa_attempt('pro', false);
  SELECT * INTO r FROM public.check_mfa_lock('pro');
  IF r.locked OR r.failed_count <> 4 THEN RAISE EXCEPTION 'after 4 fails: %', r; END IF;

  -- 5th fail => locked with remaining in (0, 900]
  PERFORM public.record_mfa_attempt('pro', false);
  SELECT * INTO r FROM public.check_mfa_lock('pro');
  IF NOT r.locked OR r.remaining_seconds <= 0 OR r.remaining_seconds > 900 THEN
    RAISE EXCEPTION 'after 5 fails: %', r;
  END IF;

  -- success resets
  PERFORM public.record_mfa_attempt('pro', true);
  SELECT * INTO r FROM public.check_mfa_lock('pro');
  IF r.locked OR r.failed_count <> 0 THEN RAISE EXCEPTION 'after success: %', r; END IF;

  -- scope isolation
  SELECT * INTO r FROM public.check_mfa_lock('admin');
  IF r.locked OR r.failed_count <> 0 THEN RAISE EXCEPTION 'admin scope: %', r; END IF;

  -- old failures outside window don't lock
  INSERT INTO public.mfa_attempts (user_id, scope, success, created_at)
  SELECT uid, 'pro', false, now() - interval '20 minutes' FROM generate_series(1,5);
  SELECT * INTO r FROM public.check_mfa_lock('pro');
  IF r.locked THEN RAISE EXCEPTION 'old-window: %', r; END IF;

  -- cleanup (cascades mfa_attempts)
  DELETE FROM auth.users WHERE id = uid;
  RETURN 'OK';
EXCEPTION WHEN OTHERS THEN
  DELETE FROM auth.users WHERE id = uid;
  RAISE;
END $$;

REVOKE ALL ON FUNCTION public._test_mfa_rate_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._test_mfa_rate_limit() TO service_role;