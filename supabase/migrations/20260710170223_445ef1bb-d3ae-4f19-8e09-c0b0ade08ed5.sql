
-- 1. Remove ephemeral logic
DROP TRIGGER IF EXISTS purge_on_end ON public.conversations;
DROP FUNCTION IF EXISTS public.purge_messages_on_end() CASCADE;
DROP TABLE IF EXISTS public.queue CASCADE;

-- 2. Profiles table (patient info)
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  birth_year INTEGER,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile write" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Extend volunteers (professionals)
ALTER TABLE public.volunteers
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS available_slots JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Allow authenticated users to see approved professionals (bio, name, photo, specialty)
DROP POLICY IF EXISTS "public approved volunteers" ON public.volunteers;
CREATE POLICY "public approved volunteers" ON public.volunteers FOR SELECT TO authenticated
  USING (approval_status = 'approved');

-- 4. Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 30,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  professional_notes TEXT,
  conversation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.appointments (patient_id, scheduled_at DESC);
CREATE INDEX ON public.appointments (professional_id, scheduled_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appts participants read" ON public.appointments FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = professional_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "patient books" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "participants update" ON public.appointments FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = professional_id)
  WITH CHECK (auth.uid() = patient_id OR auth.uid() = professional_id);

-- 5. Extend conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ALTER COLUMN user_alias DROP NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN volunteer_alias DROP NOT NULL;

-- 6. Attachments
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('pdf','image','audio')),
  original_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.attachments (conversation_id);
GRANT SELECT, INSERT, DELETE ON public.attachments TO authenticated;
GRANT ALL ON public.attachments TO service_role;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attach participants read" ON public.attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = attachments.conversation_id AND (c.user_id = auth.uid() OR c.volunteer_id = auth.uid())));
CREATE POLICY "attach sender insert" ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR c.volunteer_id = auth.uid())));

-- 7. Messages: add attachment_id
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES public.attachments(id) ON DELETE SET NULL;
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

-- 8. Storage bucket policies (bucket itself created via tool)
CREATE POLICY "consultation files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'consultation-files' AND EXISTS (
    SELECT 1 FROM public.attachments a
    JOIN public.conversations c ON c.id = a.conversation_id
    WHERE a.storage_path = storage.objects.name
      AND (c.user_id = auth.uid() OR c.volunteer_id = auth.uid())
  ));
CREATE POLICY "consultation files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'consultation-files' AND owner = auth.uid());

-- 9. Realtime for appointments
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments;

-- 10. Updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_appts_updated ON public.appointments;
CREATE TRIGGER trg_appts_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
