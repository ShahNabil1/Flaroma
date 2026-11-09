
-- Fix update_admin_pin to include WHERE clause
CREATE OR REPLACE FUNCTION public.update_admin_pin(new_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  pin_row_id uuid;
BEGIN
  SELECT id INTO pin_row_id FROM public.admin_pin LIMIT 1;
  IF pin_row_id IS NULL THEN
    INSERT INTO public.admin_pin (pin_hash)
    VALUES (extensions.crypt(new_pin, extensions.gen_salt('bf')));
  ELSE
    UPDATE public.admin_pin
    SET pin_hash = extensions.crypt(new_pin, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = pin_row_id;
  END IF;
END;
$$;
