
-- Create analytics_settings table
CREATE TABLE public.analytics_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fb_pixel_id text,
  fb_capi_token text,
  gtm_id text,
  ga4_id text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_settings ENABLE ROW LEVEL SECURITY;

-- Public read access (needed for script injection on frontend)
CREATE POLICY "Analytics settings are publicly readable"
  ON public.analytics_settings
  FOR SELECT
  USING (true);

-- Insert a default empty row so we always have one to update
INSERT INTO public.analytics_settings (fb_pixel_id, fb_capi_token, gtm_id, ga4_id)
VALUES (null, null, null, null);
