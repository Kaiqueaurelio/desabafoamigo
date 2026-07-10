
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies: writes go through SECURITY DEFINER function only.

CREATE OR REPLACE FUNCTION public.log_audit(
  _action TEXT,
  _target_type TEXT DEFAULT NULL,
  _target_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, _metadata);
END $$;

GRANT EXECUTE ON FUNCTION public.log_audit(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Purge messages of ended conversations older than 7 days
CREATE OR REPLACE FUNCTION public.purge_ended_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.messages m
  USING public.conversations c
  WHERE m.conversation_id = c.id
    AND c.status = 'ended'
    AND c.ended_at < now() - INTERVAL '7 days';

  DELETE FROM public.attachments a
  USING public.conversations c
  WHERE a.conversation_id = c.id
    AND c.status = 'ended'
    AND c.ended_at < now() - INTERVAL '7 days';
END $$;

-- Purge screenshot incidents older than 90 days
CREATE OR REPLACE FUNCTION public.purge_old_incidents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.screenshot_incidents WHERE created_at < now() - INTERVAL '90 days';
  DELETE FROM public.audit_log WHERE created_at < now() - INTERVAL '365 days';
END $$;

SELECT cron.schedule(
  'purge-ended-conversations',
  '0 3 * * *',
  $$ SELECT public.purge_ended_conversations(); $$
);

SELECT cron.schedule(
  'purge-old-incidents',
  '30 3 * * *',
  $$ SELECT public.purge_old_incidents(); $$
);
