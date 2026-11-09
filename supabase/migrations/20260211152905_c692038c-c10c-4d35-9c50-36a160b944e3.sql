-- Add enable_color_selection flag to build_flow_options
ALTER TABLE public.build_flow_options
ADD COLUMN enable_color_selection boolean NOT NULL DEFAULT false;