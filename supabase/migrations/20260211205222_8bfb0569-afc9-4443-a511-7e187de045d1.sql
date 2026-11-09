
-- Add source column to orders for distinguishing manual vs website orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';

-- Add steadfast permission to all existing admins who have orders permission
INSERT INTO public.user_permissions (user_id, page_key, allowed)
SELECT user_id, 'steadfast', allowed
FROM public.user_permissions
WHERE page_key = 'orders'
ON CONFLICT DO NOTHING;
