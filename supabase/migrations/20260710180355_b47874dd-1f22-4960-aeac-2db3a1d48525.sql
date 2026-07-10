
-- Random alias generator + auto-assign on signup
CREATE OR REPLACE FUNCTION public.generate_random_alias()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  adjs text[] := ARRAY['Sereno','Suave','Calmo','Gentil','Tranquilo','Leve','Doce','Claro','Aberto','Livre','Quieto','Puro','Vivo','Sabio','Radiante','Amavel','Manso','Sincero','Corajoso','Solar'];
  nouns text[] := ARRAY['Rio','Vento','Ceu','Mar','Sol','Lua','Nuvem','Flor','Bosque','Estrela','Aurora','Brisa','Chuva','Orvalho','Cristal','Jardim','Farol','Trilho','Cume','Prado'];
BEGIN
  RETURN adjs[1 + floor(random()*array_length(adjs,1))::int]
      || ' ' || nouns[1 + floor(random()*array_length(nouns,1))::int]
      || ' ' || (100 + floor(random()*900))::int;
END $$;

-- Always assign a random alias on new user (ignore any client-provided display_name for privacy)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, public.generate_random_alias())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

-- Backfill existing profiles that look like an email prefix or are null
UPDATE public.profiles
SET display_name = public.generate_random_alias()
WHERE display_name IS NULL
   OR display_name = ''
   OR display_name !~ ' ';
