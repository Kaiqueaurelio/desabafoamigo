
-- =========================================================
-- 1) Trilha de treinamento do voluntário
-- =========================================================
CREATE TABLE public.volunteer_training_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  quiz JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_score INT NOT NULL DEFAULT 80,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.volunteer_training_modules TO authenticated;
GRANT ALL ON public.volunteer_training_modules TO service_role;

ALTER TABLE public.volunteer_training_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read active modules"
  ON public.volunteer_training_modules FOR SELECT
  TO authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can manage modules"
  ON public.volunteer_training_modules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_training_modules_updated
  BEFORE UPDATE ON public.volunteer_training_modules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 2) Progresso do voluntário na trilha
-- =========================================================
CREATE TABLE public.volunteer_training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.volunteer_training_modules(id) ON DELETE CASCADE,
  quiz_score INT NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  attempts INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_training_progress TO authenticated;
GRANT ALL ON public.volunteer_training_progress TO service_role;

ALTER TABLE public.volunteer_training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own progress"
  ON public.volunteer_training_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user writes own progress"
  ON public.volunteer_training_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user updates own progress"
  ON public.volunteer_training_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins delete progress"
  ON public.volunteer_training_progress FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_training_progress_updated
  BEFORE UPDATE ON public.volunteer_training_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 3) Coluna training_completed_at em volunteers + gate
-- =========================================================
ALTER TABLE public.volunteers
  ADD COLUMN IF NOT EXISTS training_completed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.enforce_training_before_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM 'approved')
     AND NEW.training_completed_at IS NULL THEN
    RAISE EXCEPTION 'Voluntário precisa concluir a trilha de treinamento antes da aprovação.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_training ON public.volunteers;
CREATE TRIGGER trg_enforce_training
  BEFORE UPDATE ON public.volunteers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_training_before_approval();

-- Marca automaticamente training_completed_at quando todos os módulos ativos
-- foram aprovados pelo voluntário.
CREATE OR REPLACE FUNCTION public.check_training_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_active INT;
  total_passed INT;
BEGIN
  SELECT COUNT(*) INTO total_active
    FROM public.volunteer_training_modules WHERE active = true;

  SELECT COUNT(*) INTO total_passed
    FROM public.volunteer_training_progress p
    JOIN public.volunteer_training_modules m ON m.id = p.module_id
   WHERE p.user_id = NEW.user_id
     AND p.passed = true
     AND m.active = true;

  IF total_active > 0 AND total_passed >= total_active THEN
    UPDATE public.volunteers
       SET training_completed_at = COALESCE(training_completed_at, now()),
           updated_at = now()
     WHERE user_id = NEW.user_id
       AND training_completed_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_check_training_completion ON public.volunteer_training_progress;
CREATE TRIGGER trg_check_training_completion
  AFTER INSERT OR UPDATE ON public.volunteer_training_progress
  FOR EACH ROW EXECUTE FUNCTION public.check_training_completion();

-- =========================================================
-- 4) Follow-up 24h pós-conversa
-- =========================================================
CREATE TABLE public.conversation_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  reply_status TEXT NOT NULL DEFAULT 'pending' CHECK (reply_status IN ('pending','sent','replied','skipped')),
  reply_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id)
);

GRANT SELECT, UPDATE ON public.conversation_follow_ups TO authenticated;
GRANT ALL ON public.conversation_follow_ups TO service_role;

ALTER TABLE public.conversation_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own follow-ups"
  ON public.conversation_follow_ups FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user updates own follow-up reply"
  ON public.conversation_follow_ups FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_follow_ups_updated
  BEFORE UPDATE ON public.conversation_follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.schedule_follow_up_on_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ended' AND (OLD.status IS DISTINCT FROM 'ended')
     AND NEW.patient_id IS NOT NULL THEN
    INSERT INTO public.conversation_follow_ups
      (conversation_id, user_id, scheduled_for)
    VALUES (NEW.id, NEW.patient_id, COALESCE(NEW.ended_at, now()) + INTERVAL '24 hours')
    ON CONFLICT (conversation_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_schedule_follow_up ON public.conversations;
CREATE TRIGGER trg_schedule_follow_up
  AFTER UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.schedule_follow_up_on_end();

CREATE OR REPLACE FUNCTION public.send_pending_follow_ups()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_rows INT;
BEGIN
  WITH due AS (
    UPDATE public.conversation_follow_ups
       SET sent_at = now(),
           reply_status = 'sent',
           updated_at = now()
     WHERE reply_status = 'pending'
       AND scheduled_for <= now()
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_rows FROM due;
  RETURN updated_rows;
END $$;

-- =========================================================
-- 5) Log de acesso a conversas (reusa audit_log)
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_conversation_access(_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_seen TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    role_seen := 'admin';
  ELSIF public.has_role(auth.uid(), 'volunteer') THEN
    role_seen := 'volunteer';
  ELSE
    -- ignore: dono da conversa não precisa ser auditado
    RETURN;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'conversation.opened', 'conversation', _conversation_id::text,
          jsonb_build_object('role', role_seen));
END $$;

GRANT EXECUTE ON FUNCTION public.log_conversation_access(UUID) TO authenticated;

-- =========================================================
-- 6) Manutenção diária agregada
-- =========================================================
CREATE OR REPLACE FUNCTION public.run_daily_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follow_ups_sent INT;
BEGIN
  PERFORM public.purge_ended_conversations();
  PERFORM public.purge_old_incidents();
  follow_ups_sent := public.send_pending_follow_ups();
  RETURN jsonb_build_object(
    'follow_ups_sent', follow_ups_sent,
    'ran_at', now()
  );
END $$;
