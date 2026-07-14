
-- Backfill: voluntários já aprovados ganham marca de treinamento concluído
UPDATE public.volunteers
   SET training_completed_at = COALESCE(training_completed_at, reviewed_at, now())
 WHERE approval_status = 'approved' AND training_completed_at IS NULL;

-- Enforce leniente: só bloqueia se existir pelo menos um módulo ativo
CREATE OR REPLACE FUNCTION public.enforce_training_before_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INT;
BEGIN
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM 'approved')
     AND NEW.training_completed_at IS NULL THEN
    SELECT COUNT(*) INTO active_count
      FROM public.volunteer_training_modules WHERE active = true;
    IF active_count > 0 THEN
      RAISE EXCEPTION 'Voluntário precisa concluir a trilha de treinamento antes da aprovação.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.enforce_training_before_approval() FROM PUBLIC, anon;
