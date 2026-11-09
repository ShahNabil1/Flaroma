
-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_bn TEXT,
  description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  tag TEXT,
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'out_of_stock')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_variants table
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL,
  variant_value TEXT NOT NULL,
  price_modifier NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Public read access for products
CREATE POLICY "Products are publicly readable"
ON public.products FOR SELECT USING (true);

CREATE POLICY "Variants are publicly readable"
ON public.product_variants FOR SELECT USING (true);

-- Admin write access using service role (edge functions)
-- For anon users, only read is allowed. Writes will go through edge functions with service_role key.

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for sorting
CREATE INDEX idx_products_sort_order ON public.products(sort_order);
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);

-- Seed the existing products
INSERT INTO public.products (title, title_bn, base_price, tag, sort_order) VALUES
('Classic Pistachio Kunafa', 'ক্লাসিক পেস্তা কুনাফা', 450, 'Best Seller', 1),
('Dark Chocolate Kunafa', 'ডার্ক চকোলেট কুনাফা', 480, 'Best Seller', 2),
('Milk Chocolate Delight', 'মিল্ক চকোলেট ডিলাইট', 420, 'Handmade', 3),
('Strawberry Kunafa Bar', 'স্ট্রবেরি কুনাফা বার', 500, 'New', 4),
('Caramel Crunch Kunafa', 'ক্যারামেল ক্রাঞ্চ কুনাফা', 460, 'Handmade', 5),
('White Chocolate Rose', 'হোয়াইট চকোলেট রোজ', 520, NULL, 6),
('Hazelnut Kunafa', 'হ্যাজেলনাট কুনাফা', 490, 'Best Seller', 7),
('Saffron Gold Bar', 'জাফরান গোল্ড বার', 650, 'Premium', 8),
('Coconut Dream Kunafa', 'কোকোনাট ড্রিম কুনাফা', 440, 'Handmade', 9),
('Lotus Biscoff Kunafa', 'লোটাস বিসকফ কুনাফা', 530, 'New', 10),
('Mango Tropical Bar', 'ম্যাঙ্গো ট্রপিক্যাল বার', 470, NULL, 11),
('Royal Assorted Box', 'রয়্যাল অ্যাসোর্টেড বক্স', 1200, 'Gift Box', 12);
