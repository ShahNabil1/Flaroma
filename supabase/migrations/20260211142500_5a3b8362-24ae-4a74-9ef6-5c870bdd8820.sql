
-- Build flow steps (e.g. "Base", "Fillings", "Toppings")
CREATE TABLE public.build_flow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_bn TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  max_selections INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.build_flow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Build flow steps are publicly readable"
ON public.build_flow_steps FOR SELECT USING (true);

-- Build flow options (items within each step)
CREATE TABLE public.build_flow_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.build_flow_steps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_bn TEXT,
  emoji TEXT DEFAULT '🍫',
  image_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.build_flow_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Build flow options are publicly readable"
ON public.build_flow_options FOR SELECT USING (true);

-- Build flow settings (section title, price, etc.)
INSERT INTO public.site_settings (key, value) VALUES (
  'build_flow',
  '{"title": "Build Your Own Chocolate", "title_bn": "আপনার পছন্দমতো বেস, ফিলিং আর টপিং বেছে নিন।", "badge_text": "Customize", "base_price": 750}'
) ON CONFLICT DO NOTHING;
