-- Integration test for MFA rate limiting backend.
-- Verifies: 5 failed attempts in 15 min => locked; success resets counter.
-- Runs inside a transaction that is rolled back at the end (no side effects).

BEGIN;

-- Create an ephemeral auth.users row so FK + auth.uid() work.
DO $$
DECLARE
  uid uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'mfa-test-' || uid || '@example.test', '', now(), now());

  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', uid::text, 'role', 'authenticated')::text,
                     true);
  PERFORM set_config('role', 'authenticated', true);

  -- Baseline: not locked, 0 fails.
  IF (SELECT locked FROM public.check_mfa_lock('pro')) THEN
    RAISE EXCEPTION 'baseline should not be locked';
  END IF;
  IF (SELECT failed_count FROM public.check_mfa_lock('pro')) <> 0 THEN
    RAISE EXCEPTION 'baseline failed_count should be 0';
  END IF;

  -- 4 fails: still unlocked, count = 4.
  PERFORM public.record_mfa_attempt('pro', false);
  PERFORM public.record_mfa_attempt('pro', false);
  PERFORM public.record_mfa_attempt('pro', false);
  PERFORM public.record_mfa_attempt('pro', false);

  IF (SELECT locked FROM public.check_mfa_lock('pro')) THEN
    RAISE EXCEPTION 'should not be locked after 4 fails';
  END IF;
  IF (SELECT failed_count FROM public.check_mfa_lock('pro')) <> 4 THEN
    RAISE EXCEPTION 'expected failed_count=4';
  END IF;

  -- 5th fail: locked, remaining ~15 min.
  PERFORM public.record_mfa_attempt('pro', false);
  IF NOT (SELECT locked FROM public.check_mfa_lock('pro')) THEN
    RAISE EXCEPTION 'should be locked after 5 fails';
  END IF;
  IF (SELECT remaining_seconds FROM public.check_mfa_lock('pro')) <= 0 THEN
    RAISE EXCEPTION 'remaining_seconds should be > 0';
  END IF;
  IF (SELECT remaining_seconds FROM public.check_mfa_lock('pro')) > 15*60 THEN
    RAISE EXCEPTION 'remaining_seconds should be <= 900';
  END IF;

  -- Success resets the effective failure window.
  PERFORM public.record_mfa_attempt('pro', true);
  IF (SELECT locked FROM public.check_mfa_lock('pro')) THEN
    RAISE EXCEPTION 'success should clear lock';
  END IF;
  IF (SELECT failed_count FROM public.check_mfa_lock('pro')) <> 0 THEN
    RAISE EXCEPTION 'success should reset failed_count to 0';
  END IF;

  -- Scope isolation: admin scope should be untouched.
  IF (SELECT failed_count FROM public.check_mfa_lock('admin')) <> 0 THEN
    RAISE EXCEPTION 'admin scope should be independent';
  END IF;

  -- Older-than-window failures do not count. Backdate 5 fails to 20 min ago.
  INSERT INTO public.mfa_attempts (user_id, scope, success, created_at)
  SELECT uid, 'pro', false, now() - interval '20 minutes'
  FROM generate_series(1,5);
  IF (SELECT locked FROM public.check_mfa_lock('pro')) THEN
    RAISE EXCEPTION 'old failures outside 15 min window must not lock';
  END IF;

  RAISE NOTICE 'mfaRateLimit: OK';
END $$;

ROLLBACK;
