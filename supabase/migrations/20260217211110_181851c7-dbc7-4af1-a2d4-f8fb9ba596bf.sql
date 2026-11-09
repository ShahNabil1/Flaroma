
-- Allow authenticated users to update analytics_settings (admin guard is in UI)
CREATE POLICY "Authenticated users can update analytics settings"
  ON public.analytics_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
