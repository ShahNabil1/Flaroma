
-- Add status column to customers table for lead tracking
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'lead';
