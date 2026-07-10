
-- 1) Tabela para marcar usuários reincidentes (screenshot abuse)
CREATE TABLE IF NOT EXISTS public.flagged_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  incident_count INT NOT NULL DEFAULT 0,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  cleared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.flagged_users TO authenticated;
GRANT ALL ON public.flagged_users TO service_role;

ALTER TABLE public.flagged_users ENABLE ROW LEVEL SECURITY;

-- usuário vê apenas o próprio flag (para exibir aviso "aguardando revisão")
CREATE POLICY "user sees own flag" ON public.flagged_users
  FOR SELECT USING (auth.uid() = user_id);

-- admin lê e gerencia todos
CREATE POLICY "admin manages flags" ON public.flagged_users
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_flagged_users_updated_at
  BEFORE UPDATE ON public.flagged_users
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Função + trigger: auto-flag ao acumular 3+ high em 30 dias
CREATE OR REPLACE FUNCTION public.auto_flag_repeat_offender()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  high_count INT;
BEGIN
  IF NEW.severity <> 'high' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO high_count
  FROM public.screenshot_incidents
  WHERE user_id = NEW.user_id
    AND severity = 'high'
    AND created_at > now() - INTERVAL '30 days';

  IF high_count >= 3 THEN
    INSERT INTO public.flagged_users (user_id, reason, incident_count)
    VALUES (NEW.user_id,
            'Auto: ' || high_count || ' incidentes high em 30 dias',
            high_count)
    ON CONFLICT (user_id) DO UPDATE
      SET incident_count = EXCLUDED.incident_count,
          reason = EXCLUDED.reason,
          cleared = false,
          flagged_at = CASE WHEN public.flagged_users.cleared THEN now() ELSE public.flagged_users.flagged_at END,
          updated_at = now();
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_flag_repeat ON public.screenshot_incidents;
CREATE TRIGGER trg_auto_flag_repeat
  AFTER INSERT ON public.screenshot_incidents
  FOR EACH ROW EXECUTE FUNCTION public.auto_flag_repeat_offender();

-- 3) Bloquear novas conversas de usuários flaggeados (não-cleared)
CREATE OR REPLACE FUNCTION public.block_appointments_for_flagged()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.flagged_users
    WHERE user_id = NEW.patient_id AND cleared = false
  ) THEN
    RAISE EXCEPTION 'Conta em revisão de segurança. Novas conversas ficam bloqueadas até revisão do moderador.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_block_flagged_appointments ON public.appointments;
CREATE TRIGGER trg_block_flagged_appointments
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.block_appointments_for_flagged();
