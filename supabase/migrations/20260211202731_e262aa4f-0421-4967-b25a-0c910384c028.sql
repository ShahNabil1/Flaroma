
-- Function to update admin PIN (needed by edge function)
CREATE OR REPLACE FUNCTION public.update_admin_pin(new_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_pin
  SET pin_hash = crypt(new_pin, gen_salt('bf')),
      updated_at = now();
END;
$$;
