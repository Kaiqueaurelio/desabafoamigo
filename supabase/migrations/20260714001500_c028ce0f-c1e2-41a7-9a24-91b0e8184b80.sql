
-- 1. Safety plan (dados sensíveis; só o dono lê/escreve)
CREATE TABLE public.safety_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  reasons_to_live TEXT,
  warning_signs TEXT,
  coping_strategies TEXT,
  share_location_with_contact BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_plans TO authenticated;
GRANT ALL ON public.safety_plans TO service_role;
ALTER TABLE public.safety_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own safety plan"
  ON public.safety_plans FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER touch_safety_plans_updated_at
  BEFORE UPDATE ON public.safety_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Crisis escalation (voluntário sinaliza risco alto para plantão admin)
CREATE TABLE public.crisis_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('high','critical')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','ack','resolved')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.crisis_escalations TO authenticated;
GRANT ALL ON public.crisis_escalations TO service_role;
ALTER TABLE public.crisis_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "volunteers raise their own"
  ON public.crisis_escalations FOR INSERT
  TO authenticated
  WITH CHECK (raised_by = auth.uid());

CREATE POLICY "raiser or admin can read"
  ON public.crisis_escalations FOR SELECT
  TO authenticated
  USING (raised_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update"
  ON public.crisis_escalations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_crisis_escalations_updated_at
  BEFORE UPDATE ON public.crisis_escalations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX crisis_escalations_status_idx ON public.crisis_escalations(status, created_at DESC);
CREATE INDEX crisis_escalations_conv_idx ON public.crisis_escalations(conversation_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_escalations;

-- 3. Emergency actions (log do que o próprio usuário disparou)
CREATE TABLE public.emergency_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('called_cvv','called_samu','shared_location_contact','opened_safety_plan')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.emergency_actions TO authenticated;
GRANT ALL ON public.emergency_actions TO service_role;
ALTER TABLE public.emergency_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self insert emergency action"
  ON public.emergency_actions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "self or admin read"
  ON public.emergency_actions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX emergency_actions_user_idx ON public.emergency_actions(user_id, created_at DESC);
