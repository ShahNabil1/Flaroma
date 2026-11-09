
DROP POLICY "Anyone can place orders" ON public.orders;

CREATE POLICY "Anyone can place orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
