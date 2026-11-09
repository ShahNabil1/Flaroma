-- Fix existing customers with orders but still marked as 'lead'
UPDATE public.customers SET status = 'active' WHERE total_orders > 0 AND status = 'lead';
