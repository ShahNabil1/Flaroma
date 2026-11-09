-- Enable pgcrypto extension for crypt() and gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Re-insert the default PIN (1234) now that pgcrypto is available
DELETE FROM public.admin_pin;
INSERT INTO public.admin_pin (pin_hash)
VALUES (crypt('1234', gen_salt('bf')));