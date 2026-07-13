
CREATE TABLE public.webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  device_name TEXT NOT NULL DEFAULT 'Chave de acesso',
  scope TEXT NOT NULL DEFAULT 'admin',
  backed_up BOOLEAN NOT NULL DEFAULT false,
  device_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX ON public.webauthn_credentials(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webauthn_credentials TO authenticated;
GRANT ALL ON public.webauthn_credentials TO service_role;

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own passkeys select" ON public.webauthn_credentials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own passkeys delete" ON public.webauthn_credentials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  challenge TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('register','authenticate')),
  scope TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes')
);
CREATE INDEX ON public.webauthn_challenges(expires_at);

GRANT ALL ON public.webauthn_challenges TO service_role;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- no policies: only service_role via server functions
