-- Fix: Convert restrictive policies to permissive so client-side updates actually work
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;

CREATE POLICY "Anyone can insert customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update customers" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Anyone can view customers" ON public.customers FOR SELECT USING (true);
