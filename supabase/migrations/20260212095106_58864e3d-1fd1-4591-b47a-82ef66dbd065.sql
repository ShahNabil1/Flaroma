
-- Drop ALL existing policies on orders table
DROP POLICY IF EXISTS "Anyone can place orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can read draft orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update draft orders" ON public.orders;
DROP POLICY IF EXISTS "No direct read access" ON public.orders;

-- Recreate as explicitly PERMISSIVE (default) policies
CREATE POLICY "orders_insert_policy"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "orders_select_draft_policy"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (status = 'draft');

CREATE POLICY "orders_update_draft_policy"
ON public.orders
FOR UPDATE
TO anon, authenticated
USING (status = 'draft')
WITH CHECK (true);
