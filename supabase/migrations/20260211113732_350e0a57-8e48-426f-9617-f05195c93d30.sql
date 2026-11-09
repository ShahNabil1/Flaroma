
ALTER TABLE public.products
  ADD COLUMN delivery_policy text,
  ADD COLUMN storage_instructions text,
  ADD COLUMN show_trust_badges boolean NOT NULL DEFAULT true;
