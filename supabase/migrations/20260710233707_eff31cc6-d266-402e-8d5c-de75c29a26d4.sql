
CREATE TABLE public.mfa_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('pro','admin')),
  success BOOLEAN NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mfa_attempts_user_created ON public.mfa_attempts (user_id, scope, created_at DESC);

GRANT SELECT, INSERT ON public.mfa_attempts TO authenticated;
GRANT ALL ON public.mfa_attempts TO service_role;

ALTER TABLE public.mfa_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own mfa attempts readable"
  ON public.mfa_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own mfa attempts insertable"
  ON public.mfa_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Retorna informações de bloqueio para o usuário atual num dado escopo
CREATE OR REPLACE FUNCTION public.check_mfa_lock(_scope TEXT)
RETURNS TABLE(locked BOOLEAN, remaining_seconds INT, failed_count INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  fails INT;
  last_fail TIMESTAMPTZ;
  window_start TIMESTAMPTZ := now() - INTERVAL '15 minutes';
  lock_until TIMESTAMPTZ;
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;

  SELECT COUNT(*), MAX(created_at)
    INTO fails, last_fail
  FROM public.mfa_attempts
  WHERE user_id = uid
    AND scope = _scope
    AND success = false
    AND created_at > window_start
    AND created_at > COALESCE(
      (SELECT MAX(created_at) FROM public.mfa_attempts
        WHERE user_id = uid AND scope = _scope AND success = true),
      'epoch'::timestamptz
    );

  IF fails >= 5 THEN
    lock_until := last_fail + INTERVAL '15 minutes';
    IF lock_until > now() THEN
      RETURN QUERY SELECT true, EXTRACT(EPOCH FROM (lock_until - now()))::INT, fails;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT false, 0, COALESCE(fails,0);
END $$;

GRANT EXECUTE ON FUNCTION public.check_mfa_lock(TEXT) TO authenticated;

-- Registra tentativa (chamada do cliente com o resultado do supabase.auth.mfa.verify)
CREATE OR REPLACE FUNCTION public.record_mfa_attempt(_scope TEXT, _success BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.mfa_attempts (user_id, scope, success)
  VALUES (uid, _scope, _success);
END $$;

GRANT EXECUTE ON FUNCTION public.record_mfa_attempt(TEXT, BOOLEAN) TO authenticated;
