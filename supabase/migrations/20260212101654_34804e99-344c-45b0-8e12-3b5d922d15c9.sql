
-- Create delivery_settings table
CREATE TABLE public.delivery_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area_key text NOT NULL UNIQUE,
  area_name text NOT NULL,
  charge numeric NOT NULL DEFAULT 0,
  display_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Delivery settings are publicly readable"
  ON public.delivery_settings
  FOR SELECT
  USING (true);

-- Seed default data
INSERT INTO public.delivery_settings (area_key, area_name, charge, display_text, sort_order)
VALUES
  ('inside_dhaka', 'ঢাকার ভেতরে', 60, '(৳60)', 0),
  ('outside_dhaka', 'ঢাকার বাইরে', 120, '(৳120)', 1);
