
CREATE POLICY "admins read all messages" ON public.messages FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins send messages" ON public.messages FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin') AND sender_id = auth.uid());
CREATE POLICY "admins update messages" ON public.messages FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update conversations" ON public.conversations FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update appointments" ON public.appointments FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins read attachments" ON public.attachments FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert attachments" ON public.attachments FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin') AND sender_id = auth.uid());
