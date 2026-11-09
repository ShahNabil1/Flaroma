
-- Drop the broken restrictive policies
DROP POLICY IF EXISTS "Anyone can place orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can read draft orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update draft orders" ON public.orders;
DROP POLICY IF EXISTS "No direct read access" ON public.orders;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can place orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can read draft orders"
ON public.orders
FOR SELECT
TO public
USING (status = 'draft');

CREATE POLICY "Anyone can update draft orders"
ON public.orders
FOR UPDATE
TO public
USING (status = 'draft')
WITH CHECK (true);
