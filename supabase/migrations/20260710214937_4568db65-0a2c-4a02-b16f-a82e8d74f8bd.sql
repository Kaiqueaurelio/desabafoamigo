
-- Mood entries (diário emocional / journal)
CREATE TABLE public.mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood smallint NOT NULL CHECK (mood BETWEEN 1 AND 5),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_entries TO authenticated;
GRANT ALL ON public.mood_entries TO service_role;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mood select" ON public.mood_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own mood insert" ON public.mood_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own mood update" ON public.mood_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own mood delete" ON public.mood_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX mood_entries_user_created_idx ON public.mood_entries (user_id, created_at DESC);

-- Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "create own reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "see own reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "admin sees all reports" ON public.reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Rating on appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS patient_rating smallint CHECK (patient_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS patient_feedback text;
