
-- AUDIOS
CREATE TABLE public.library_audios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'asmr',
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  duration_seconds INT,
  published BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_audios TO authenticated;
GRANT ALL ON public.library_audios TO service_role;
ALTER TABLE public.library_audios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published audios" ON public.library_audios
  FOR SELECT TO authenticated USING (published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage audios" ON public.library_audios
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_library_audios BEFORE UPDATE ON public.library_audios
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- PHRASES
CREATE TABLE public.library_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  author TEXT,
  category TEXT NOT NULL DEFAULT 'acolhimento',
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_phrases TO authenticated;
GRANT ALL ON public.library_phrases TO service_role;
ALTER TABLE public.library_phrases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published phrases" ON public.library_phrases
  FOR SELECT TO authenticated USING (published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage phrases" ON public.library_phrases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_library_phrases BEFORE UPDATE ON public.library_phrases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- IMAGES
CREATE TABLE public.library_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  caption TEXT,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'acolhimento',
  published BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_images TO authenticated;
GRANT ALL ON public.library_images TO service_role;
ALTER TABLE public.library_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published images" ON public.library_images
  FOR SELECT TO authenticated USING (published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage images" ON public.library_images
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_library_images BEFORE UPDATE ON public.library_images
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- SEED PHRASES
INSERT INTO public.library_phrases (text, author, category) VALUES
  ('Você não precisa ter tudo resolvido para merecer descanso.', NULL, 'acolhimento'),
  ('Pedir ajuda é um ato de coragem, não de fraqueza.', NULL, 'coragem'),
  ('Respire. Este momento também vai passar.', NULL, 'respiracao'),
  ('Sentir demais é humano. Você não está sozinho.', NULL, 'acolhimento'),
  ('Um passo pequeno hoje já é um passo.', NULL, 'motivacao'),
  ('Se cuidar não é egoísmo, é sobrevivência.', NULL, 'autocuidado'),
  ('Você é mais do que o seu pior dia.', NULL, 'acolhimento'),
  ('Chorar limpa o que as palavras não conseguem dizer.', NULL, 'emocoes'),
  ('Descansar também é produtivo.', NULL, 'autocuidado'),
  ('A dor que você sente é real. Ela merece escuta.', NULL, 'acolhimento'),
  ('Você não precisa carregar tudo sozinho.', NULL, 'acolhimento'),
  ('Ser gentil consigo mesmo é o começo de tudo.', NULL, 'autocuidado'),
  ('Nem todo dia precisa ser um dia produtivo.', NULL, 'motivacao'),
  ('O que você sente hoje não define quem você é.', NULL, 'emocoes'),
  ('Ir devagar também é ir.', NULL, 'motivacao'),
  ('Você importa. Do jeitinho que você é.', NULL, 'acolhimento'),
  ('Respira fundo. Você chegou até aqui, e isso é muito.', NULL, 'respiracao'),
  ('Está tudo bem não estar bem.', NULL, 'acolhimento'),
  ('Ninguém sente por você, mas alguém pode sentir com você.', NULL, 'acolhimento'),
  ('Cada respiração é uma nova chance de recomeçar.', NULL, 'respiracao');
