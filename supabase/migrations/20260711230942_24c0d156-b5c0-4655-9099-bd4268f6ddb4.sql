
ALTER TABLE public.queue
  ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS preferred_lang TEXT NOT NULL DEFAULT 'pt-BR';

ALTER TABLE public.queue DROP CONSTRAINT IF EXISTS queue_urgency_chk;
ALTER TABLE public.queue
  ADD CONSTRAINT queue_urgency_chk CHECK (urgency IN ('low','medium','high'));
