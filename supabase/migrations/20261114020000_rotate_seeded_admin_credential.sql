-- The original bootstrap migration used a fixed password for this account.
-- Invalidate that known credential without deleting the account or its admin role.
-- After applying this migration, set a new unique password for this account in
-- Supabase Dashboard > Authentication > Users before relying on that login.
-- This migration is intentionally not applied automatically from this change.
update auth.users
   set encrypted_password = crypt(gen_random_uuid()::text || gen_random_uuid()::text, gen_salt('bf')),
       updated_at = now()
 where lower(email) = 'admin@desabafo.br'
   and encrypted_password is not null;
