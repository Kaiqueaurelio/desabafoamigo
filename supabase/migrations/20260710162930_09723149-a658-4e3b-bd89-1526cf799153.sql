
-- 1) Approval workflow for volunteers
DO $$ BEGIN
  CREATE TYPE public.volunteer_approval AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.volunteers
  ADD COLUMN IF NOT EXISTS approval_status public.volunteer_approval NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS motivation text,
  ADD COLUMN IF NOT EXISTS experience text,
  ADD COLUMN IF NOT EXISTS availability text,
  ADD COLUMN IF NOT EXISTS credentials text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

-- 2) Refresh ensure_volunteer_row trigger: when admin grants role, mark approved
CREATE OR REPLACE FUNCTION public.ensure_volunteer_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IN ('volunteer','psychologist') THEN
    INSERT INTO public.volunteers (user_id, is_psychologist, approval_status, reviewed_at, reviewed_by)
    VALUES (NEW.user_id, NEW.role = 'psychologist', 'approved', now(), auth.uid())
    ON CONFLICT (user_id) DO UPDATE
      SET is_psychologist = EXCLUDED.is_psychologist OR public.volunteers.is_psychologist,
          approval_status = 'approved',
          reviewed_at = now(),
          reviewed_by = auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ensure_volunteer_row_trg ON public.user_roles;
CREATE TRIGGER ensure_volunteer_row_trg
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.ensure_volunteer_row();

-- 3) RLS policies for volunteers
DROP POLICY IF EXISTS "Volunteers can view own row" ON public.volunteers;
DROP POLICY IF EXISTS "Volunteers can update own status" ON public.volunteers;
DROP POLICY IF EXISTS "Users can view own volunteer row" ON public.volunteers;
DROP POLICY IF EXISTS "Users can insert own volunteer application" ON public.volunteers;
DROP POLICY IF EXISTS "Users can update own volunteer status fields" ON public.volunteers;
DROP POLICY IF EXISTS "Admins can view all volunteers" ON public.volunteers;
DROP POLICY IF EXISTS "Admins can update all volunteers" ON public.volunteers;

CREATE POLICY "Users can view own volunteer row" ON public.volunteers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own volunteer application" ON public.volunteers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own volunteer status fields" ON public.volunteers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all volunteers" ON public.volunteers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all volunteers" ON public.volunteers
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Admin insert on user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) Admins can view metrics & conversations for oversight
DROP POLICY IF EXISTS "Admins can view metrics" ON public.metrics;
CREATE POLICY "Admins can view metrics" ON public.metrics
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
CREATE POLICY "Admins can view all conversations" ON public.conversations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6) Seed admin user
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@desabafo.br';
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'admin@desabafo.br', crypt(gen_random_uuid()::text || gen_random_uuid()::text, gen_salt('bf')),
      now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      false, false
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, admin_id::text, jsonb_build_object('sub', admin_id::text, 'email','admin@desabafo.br','email_verified',true), 'email', now(), now(), now());
  ELSE
    UPDATE auth.users SET encrypted_password = crypt(gen_random_uuid()::text || gen_random_uuid()::text, gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = admin_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin')
  ON CONFLICT DO NOTHING;
END $$;
