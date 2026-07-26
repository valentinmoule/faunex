CREATE POLICY "Admins can view all captures"
ON public.captures FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can moderate captures"
ON public.captures FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete captures"
ON public.captures FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));