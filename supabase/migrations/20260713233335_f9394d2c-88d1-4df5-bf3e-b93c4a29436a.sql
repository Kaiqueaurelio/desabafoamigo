
CREATE TABLE public.volunteer_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 60),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 600),
  category TEXT NOT NULL DEFAULT 'Personalizado',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX volunteer_templates_by_owner ON public.volunteer_templates (volunteer_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_templates TO authenticated;
GRANT ALL ON public.volunteer_templates TO service_role;
ALTER TABLE public.volunteer_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own templates"
  ON public.volunteer_templates FOR ALL
  USING (auth.uid() = volunteer_id)
  WITH CHECK (auth.uid() = volunteer_id);

CREATE OR REPLACE FUNCTION public.touch_volunteer_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_volunteer_templates_updated_at
  BEFORE UPDATE ON public.volunteer_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_volunteer_templates_updated_at();
