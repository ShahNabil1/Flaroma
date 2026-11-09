-- Add discount and advance_amount columns to orders table
ALTER TABLE public.orders
ADD COLUMN discount numeric NOT NULL DEFAULT 0,
ADD COLUMN advance_amount numeric NOT NULL DEFAULT 0;