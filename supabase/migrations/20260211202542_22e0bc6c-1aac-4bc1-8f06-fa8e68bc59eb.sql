
-- User access requests table
CREATE TABLE public.user_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can insert their own request
CREATE POLICY "Users can insert own request" ON public.user_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only admins (via edge function with service role) manage these

-- User roles table (admin role tracking)
CREATE TYPE public.app_role AS ENUM ('owner', 'admin');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role app_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User permissions table
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, page_key)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admin PIN table (stores hashed PIN)
CREATE TABLE public.admin_pin (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_pin ENABLE ROW LEVEL SECURITY;

-- PIN verification function (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.verify_admin_pin(input_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT pin_hash INTO stored_hash FROM public.admin_pin LIMIT 1;
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  RETURN stored_hash = crypt(input_pin, stored_hash);
END;
$$;

-- Enable pgcrypto for PIN hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert a default PIN (1234) - owner should change this
INSERT INTO public.admin_pin (pin_hash)
VALUES (crypt('1234', gen_salt('bf')));

-- Security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE(page_key TEXT, allowed BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT page_key, allowed FROM public.user_permissions WHERE user_id = _user_id
$$;
