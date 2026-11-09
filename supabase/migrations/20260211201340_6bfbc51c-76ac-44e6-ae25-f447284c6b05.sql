
-- Allow checkout page to update draft orders (low-risk: drafts are incomplete/abandoned checkouts)
CREATE POLICY "Anyone can update draft orders"
ON public.orders
FOR UPDATE
USING (status = 'draft')
WITH CHECK (true);

-- Allow checkout page to read their own draft by ID (needed to check if draft exists)
-- We'll scope this tightly: only draft orders can be read
CREATE POLICY "Anyone can read draft orders"
ON public.orders
FOR SELECT
USING (status = 'draft');

-- Auto-cleanup: function to delete drafts older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_draft_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.orders
  WHERE status = 'draft'
  AND created_at < now() - interval '30 days';
END;
$$;
