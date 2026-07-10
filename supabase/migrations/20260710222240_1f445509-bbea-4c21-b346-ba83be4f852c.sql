
-- 1) Waiting queue for instant chat
CREATE TABLE IF NOT EXISTS public.queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  matched_volunteer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT queue_status_chk CHECK (status IN ('waiting','matched','cancelled','expired'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue TO authenticated;
GRANT ALL ON public.queue TO service_role;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User manages own queue entries" ON public.queue
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'volunteer') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'volunteer') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER touch_queue_updated_at BEFORE UPDATE ON public.queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.queue;

-- 2) Per-user memory across conversations
CREATE TABLE IF NOT EXISTS public.user_summaries (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT,
  summary TEXT NOT NULL DEFAULT '',
  technical_details TEXT NOT NULL DEFAULT '',
  sessions_count INT NOT NULL DEFAULT 0,
  last_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_summaries TO authenticated;
GRANT ALL ON public.user_summaries TO service_role;
ALTER TABLE public.user_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own summary" ON public.user_summaries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Volunteers and admins read summaries" ON public.user_summaries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'volunteer') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Volunteers and admins write summaries" ON public.user_summaries
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'volunteer') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Volunteers and admins update summaries" ON public.user_summaries
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'volunteer') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER touch_user_summaries_updated_at BEFORE UPDATE ON public.user_summaries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Cached transcription/translation on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS transcription TEXT,
  ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb;
