-- Allow patients to open their own consultation conversation
DROP POLICY IF EXISTS "patient or professional create conversation" ON public.conversations;
CREATE POLICY "patient or professional create conversation"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR (
    auth.uid() = volunteer_id
    AND (public.has_role(auth.uid(),'volunteer') OR public.has_role(auth.uid(),'psychologist'))
  )
);

-- Enable realtime for messaging / booking updates
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.attachments REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;