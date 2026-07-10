
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'volunteer', 'psychologist');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Volunteer profiles (status only; no personal data)
CREATE TYPE public.volunteer_status AS ENUM ('available', 'busy', 'offline');

CREATE TABLE public.volunteers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_alias TEXT NOT NULL DEFAULT 'Voluntário',
  status public.volunteer_status NOT NULL DEFAULT 'offline',
  is_psychologist BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.volunteers TO authenticated;
GRANT ALL ON public.volunteers TO service_role;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "volunteers manage own row" ON public.volunteers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "volunteers can see other volunteers status" ON public.volunteers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'volunteer') OR public.has_role(auth.uid(), 'psychologist'));

-- Queue (anonymous users waiting)
CREATE TABLE public.queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  prefer_psychologist BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, DELETE ON public.queue TO authenticated;
GRANT ALL ON public.queue TO service_role;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own queue row" ON public.queue FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "volunteers see queue" ON public.queue FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'volunteer') OR public.has_role(auth.uid(), 'psychologist'));
CREATE POLICY "volunteers can remove from queue" ON public.queue FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'volunteer') OR public.has_role(auth.uid(), 'psychologist'));

-- Conversations
CREATE TYPE public.conversation_status AS ENUM ('active', 'ended');

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_alias TEXT NOT NULL,
  volunteer_alias TEXT NOT NULL DEFAULT 'Voluntário',
  status public.conversation_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversation participants read" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = volunteer_id);
CREATE POLICY "conversation participants update" ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = volunteer_id);
CREATE POLICY "volunteers create conversation" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = volunteer_id AND (public.has_role(auth.uid(), 'volunteer') OR public.has_role(auth.uid(), 'psychologist')));

-- Messages (ephemeral)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read messages" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR c.volunteer_id = auth.uid()))
);
CREATE POLICY "participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.status = 'active'
      AND (c.user_id = auth.uid() OR c.volunteer_id = auth.uid())
  )
);
CREATE POLICY "participants mark read" ON public.messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR c.volunteer_id = auth.uid()))
);

-- Purge messages on end
CREATE OR REPLACE FUNCTION public.purge_messages_on_end()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'ended' AND OLD.status = 'active' THEN
    DELETE FROM public.messages WHERE conversation_id = NEW.id;
    NEW.ended_at = now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER conversations_purge_on_end
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.purge_messages_on_end();

-- Anonymous metrics only
CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.metrics TO authenticated;
GRANT ALL ON public.metrics TO service_role;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can insert metric" ON public.metrics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admins read metrics" ON public.metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create volunteer profile when a user is granted volunteer/psychologist role
CREATE OR REPLACE FUNCTION public.ensure_volunteer_row()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IN ('volunteer', 'psychologist') THEN
    INSERT INTO public.volunteers (user_id, is_psychologist)
    VALUES (NEW.user_id, NEW.role = 'psychologist')
    ON CONFLICT (user_id) DO UPDATE SET is_psychologist = EXCLUDED.is_psychologist OR public.volunteers.is_psychologist;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER user_roles_ensure_volunteer
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_volunteer_row();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.queue REPLICA IDENTITY FULL;
