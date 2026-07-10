
CREATE TABLE public.screenshot_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high')),
  user_agent text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX screenshot_incidents_appt_idx ON public.screenshot_incidents (appointment_id, created_at DESC);
CREATE INDEX screenshot_incidents_user_idx ON public.screenshot_incidents (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.screenshot_incidents TO authenticated;
GRANT UPDATE (admin_notes) ON public.screenshot_incidents TO authenticated;
GRANT ALL ON public.screenshot_incidents TO service_role;

ALTER TABLE public.screenshot_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own incidents"
  ON public.screenshot_incidents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own incidents"
  ON public.screenshot_incidents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins read all incidents"
  ON public.screenshot_incidents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update incident notes"
  ON public.screenshot_incidents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER screenshot_incidents_touch
  BEFORE UPDATE ON public.screenshot_incidents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
