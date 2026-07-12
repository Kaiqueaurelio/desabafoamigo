
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reactions insert" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reactions delete" ON public.message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "read reactions of visible messages" ON public.message_reactions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id
      AND (c.user_id = auth.uid() OR c.volunteer_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  )
);

CREATE TABLE public.favorite_volunteers (
  user_id uuid NOT NULL,
  volunteer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, volunteer_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorite_volunteers TO authenticated;
GRANT ALL ON public.favorite_volunteers TO service_role;
ALTER TABLE public.favorite_volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorite_volunteers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.blocked_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL UNIQUE,
  severity text NOT NULL DEFAULT 'flag' CHECK (severity IN ('flag','block')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_words TO authenticated;
GRANT ALL ON public.blocked_words TO service_role;
ALTER TABLE public.blocked_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage blocked_words" ON public.blocked_words FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  score int NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT ON public.nps_responses TO authenticated;
GRANT ALL ON public.nps_responses TO service_role;
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own nps" ON public.nps_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "read own or admin nps" ON public.nps_responses FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  message text NOT NULL,
  stack text,
  url text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, SELECT ON public.error_events TO authenticated;
GRANT ALL ON public.error_events TO service_role;
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert error" ON public.error_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "admins read errors" ON public.error_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
