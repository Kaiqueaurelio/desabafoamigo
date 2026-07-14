
DROP POLICY IF EXISTS "Volunteers and admins read summaries" ON public.user_summaries;
DROP POLICY IF EXISTS "Volunteers and admins update summaries" ON public.user_summaries;
DROP POLICY IF EXISTS "Volunteers and admins write summaries" ON public.user_summaries;

CREATE POLICY "Admins manage summaries" ON public.user_summaries FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Volunteers read summaries of their conversations" ON public.user_summaries
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(),'volunteer') AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.user_id = user_summaries.user_id
        AND c.volunteer_id = auth.uid()
    )
  );

CREATE POLICY "Volunteers write summaries of their conversations" ON public.user_summaries
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'volunteer') AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.user_id = user_summaries.user_id
        AND c.volunteer_id = auth.uid()
    )
  );

CREATE POLICY "Volunteers update summaries of their conversations" ON public.user_summaries
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'volunteer') AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.user_id = user_summaries.user_id
        AND c.volunteer_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.guard_appointment_participant_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = OLD.patient_id THEN
    IF NEW.professional_notes IS DISTINCT FROM OLD.professional_notes
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.professional_id IS DISTINCT FROM OLD.professional_id
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id THEN
      RAISE EXCEPTION 'Paciente não pode alterar campos do voluntário/administrativos';
    END IF;
  ELSIF auth.uid() = OLD.professional_id THEN
    IF NEW.patient_rating IS DISTINCT FROM OLD.patient_rating
       OR NEW.professional_id IS DISTINCT FROM OLD.professional_id
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id THEN
      RAISE EXCEPTION 'Voluntário não pode alterar campos do paciente';
    END IF;
  ELSE
    RAISE EXCEPTION 'Usuário sem permissão para editar esta consulta';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_appointment_updates ON public.appointments;
CREATE TRIGGER trg_guard_appointment_updates
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.guard_appointment_participant_updates();

REVOKE EXECUTE ON FUNCTION public.guard_appointment_participant_updates() FROM PUBLIC, anon, authenticated;
