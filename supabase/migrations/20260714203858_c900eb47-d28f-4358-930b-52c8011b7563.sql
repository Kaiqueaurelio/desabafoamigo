
CREATE TABLE public.push_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription_id UUID,
  endpoint_host TEXT,
  endpoint_tail TEXT,
  status_code INT,
  success BOOLEAN NOT NULL DEFAULT false,
  stale BOOLEAN NOT NULL DEFAULT false,
  error_body TEXT,
  title TEXT,
  tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX push_delivery_log_user_id_idx ON public.push_delivery_log (user_id, created_at DESC);
CREATE INDEX push_delivery_log_created_at_idx ON public.push_delivery_log (created_at DESC);

GRANT SELECT ON public.push_delivery_log TO authenticated;
GRANT ALL ON public.push_delivery_log TO service_role;

ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view push delivery logs"
  ON public.push_delivery_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Extend daily maintenance to purge old push logs (>30 days)
CREATE OR REPLACE FUNCTION public.purge_old_push_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.push_delivery_log WHERE created_at < now() - INTERVAL '30 days';
END $$;
