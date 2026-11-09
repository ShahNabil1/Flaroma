
-- Create customers CRM table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL UNIQUE,
  phone_validity_status TEXT NOT NULL DEFAULT 'pending',
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_success INTEGER NOT NULL DEFAULT 0,
  total_cancel INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0,
  risk_level TEXT DEFAULT 'unknown',
  last_validation_data JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Public insert policy (anon users can create customers during checkout)
CREATE POLICY "Anyone can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (true);

-- Public select for admin (will be restricted via app-level auth)
CREATE POLICY "Anyone can view customers"
ON public.customers
FOR SELECT
USING (true);

-- Public update for upsert during checkout
CREATE POLICY "Anyone can update customers"
ON public.customers
FOR UPDATE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index on phone for fast lookups
CREATE INDEX idx_customers_phone ON public.customers (customer_phone);
