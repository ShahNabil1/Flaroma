
-- Add steadfast_status column to track delivery status from Steadfast webhook
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS steadfast_status TEXT DEFAULT NULL;

-- Add index for faster filtering by steadfast_status
CREATE INDEX IF NOT EXISTS idx_orders_steadfast_status ON public.orders(steadfast_status);
