-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Recreate verify function using extensions.crypt
CREATE OR REPLACE FUNCTION public.verify_admin_pin(input_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT pin_hash INTO stored_hash FROM public.admin_pin LIMIT 1;
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  RETURN stored_hash = extensions.crypt(input_pin, stored_hash);
END;
$$;

-- Recreate update function using extensions.crypt/gen_salt
CREATE OR REPLACE FUNCTION public.update_admin_pin(new_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.admin_pin
  SET pin_hash = extensions.crypt(new_pin, extensions.gen_salt('bf')),
      updated_at = now();
END;
$$;

-- Re-seed the default PIN (1234) using the correct schema reference
DELETE FROM public.admin_pin;
INSERT INTO public.admin_pin (pin_hash)
VALUES (extensions.crypt('1234', extensions.gen_salt('bf')));