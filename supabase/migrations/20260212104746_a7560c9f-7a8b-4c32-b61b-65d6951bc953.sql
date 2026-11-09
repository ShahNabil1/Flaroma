-- Fix orders that have successful payment but are still stuck in 'pending' status
UPDATE public.orders 
SET status = 'confirmed', updated_at = now()
WHERE payment_status IN ('paid', 'advance_paid') 
AND status IN ('pending', 'draft');