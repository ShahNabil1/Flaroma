
-- Allow authenticated users to manage delivery settings
CREATE POLICY "Authenticated users can insert delivery settings"
  ON public.delivery_settings
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update delivery settings"
  ON public.delivery_settings
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete delivery settings"
  ON public.delivery_settings
  FOR DELETE TO authenticated
  USING (true);
