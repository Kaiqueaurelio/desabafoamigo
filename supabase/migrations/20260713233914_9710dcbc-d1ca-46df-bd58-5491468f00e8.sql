
CREATE TABLE public.lgpd_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('export','delete')),
  format TEXT CHECK (format IN ('json','csv')),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  file_path TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE ON public.lgpd_requests TO authenticated;
GRANT ALL ON public.lgpd_requests TO service_role;

ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own lgpd requests"
  ON public.lgpd_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own lgpd requests"
  ON public.lgpd_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all lgpd requests"
  ON public.lgpd_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_lgpd_requests
  BEFORE UPDATE ON public.lgpd_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX lgpd_requests_user_created_idx
  ON public.lgpd_requests(user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.lgpd_requests;
