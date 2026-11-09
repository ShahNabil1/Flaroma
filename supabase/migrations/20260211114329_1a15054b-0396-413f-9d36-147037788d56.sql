
ALTER TABLE public.products ADD COLUMN slug text;

-- Generate slugs for existing products
UPDATE public.products SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));

-- Make slug unique and not null after populating
ALTER TABLE public.products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_products_slug ON public.products (slug);
