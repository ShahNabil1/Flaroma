CREATE OR REPLACE FUNCTION public.get_order_by_short_id(short_id text)
RETURNS SETOF orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM orders WHERE id::text LIKE short_id || '%' LIMIT 1;
$$;