
-- Remove psychologist concept and harden RBAC on volunteers approval.

-- 1) Drop policies that reference the psychologist role
DROP POLICY IF EXISTS "volunteers can see other volunteers status" ON public.volunteers;
DROP POLICY IF EXISTS "patient or professional create conversation" ON public.conversations;
DROP POLICY IF EXISTS "volunteers create conversation" ON public.conversations;

-- Recreate without psychologist references
CREATE POLICY "volunteers can see other volunteers status"
  ON public.volunteers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'volunteer'));

CREATE POLICY "patient or volunteer create conversation"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR (auth.uid() = volunteer_id AND public.has_role(auth.uid(), 'volunteer'))
  );

-- 2) Drop is_psychologist column (must drop dependent trigger fn logic first)
CREATE OR REPLACE FUNCTION public.ensure_volunteer_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.role = 'volunteer' THEN
    INSERT INTO public.volunteers (user_id, approval_status, reviewed_at, reviewed_by)
    VALUES (NEW.user_id, 'approved', now(), auth.uid())
    ON CONFLICT (user_id) DO UPDATE
      SET approval_status = 'approved',
          reviewed_at = now(),
          reviewed_by = auth.uid();
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.volunteers DROP COLUMN IF EXISTS is_psychologist;

-- 3) Harden approval: prevent self-approval / self-editing of admin-controlled fields
DROP POLICY IF EXISTS "volunteers manage own row" ON public.volunteers;
DROP POLICY IF EXISTS "Users can update own volunteer status fields" ON public.volunteers;

-- Users can only update their own application content fields; admin fields are protected by trigger
CREATE POLICY "Users update own volunteer application"
  ON public.volunteers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.protect_volunteer_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by THEN
      RAISE EXCEPTION 'Only administrators can change approval fields';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS volunteers_protect_admin_fields ON public.volunteers;
CREATE TRIGGER volunteers_protect_admin_fields
  BEFORE UPDATE ON public.volunteers
  FOR EACH ROW EXECUTE FUNCTION public.protect_volunteer_admin_fields();

-- 4) Prevent non-admins from granting privileged roles via user_roles.
-- (existing "Admins can manage roles" ALL policy already restricts; make it explicit no self-insert)
DROP POLICY IF EXISTS "Users can insert own volunteer application into roles" ON public.user_roles;
