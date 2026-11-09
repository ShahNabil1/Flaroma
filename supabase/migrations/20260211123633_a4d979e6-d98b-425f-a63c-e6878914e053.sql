
-- Create site_settings table for CMS homepage management
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public read access for frontend
CREATE POLICY "Site settings are publicly readable"
ON public.site_settings
FOR SELECT
USING (true);

-- No public write access (managed via edge function with service role)

-- Seed default settings
INSERT INTO public.site_settings (key, value) VALUES
('hero', '{
  "title": "এক কামড়েই দুবাইয়ের",
  "title_highlight": "আভিজাত্য",
  "subtitle": "— এখন আপনার হাতে।",
  "description": "খাঁটি পেস্তা, ক্রিসপি কুনাফা আর প্রিমিয়াম চকোলেটের এক অনন্য ফিউশন।\nপ্রতিটি বার পরম যত্নে হাতে তৈরি।",
  "cta_text": "স্বাদ নিতে ক্লিক করুন",
  "secondary_cta_text": "আমাদের গল্প জানুন",
  "image_url": "",
  "badge_text": "Handcrafted in Dhaka",
  "stat_1_value": "500+",
  "stat_1_label": "Happy Customers",
  "stat_2_value": "100%",
  "stat_2_label": "Handmade",
  "stat_3_value": "4.9★",
  "stat_3_label": "Avg Rating",
  "starting_price": "৳ 350"
}'::jsonb),
('products_section', '{
  "badge_text": "Our Collection",
  "title": "প্রিমিয়াম কুনাফা চকোলেট",
  "subtitle": "প্রতিটি বার দুবাইয়ের ঐতিহ্যবাহী রেসিপিতে তৈরি — প্রিমিয়াম উপকরণ দিয়ে।"
}'::jsonb),
('process', '{
  "badge_text": "Our Process",
  "title": "কিভাবে তৈরি হয়?",
  "subtitle": "আমরা শুধু চকোলেট বানাই না, আমরা তৈরি করি একটি অভিজ্ঞতা।",
  "steps": [
    {"num": "01", "icon": "Wheat", "title": "Authentic Kataifi", "title_bn": "আসল কাতাইফি", "desc": "আমরা সবচেয়ে ভালো মানের কাতাইফি প্যাস্ট্রি ব্যবহার করি — প্রতিটি সুতো সূক্ষ্মভাবে তৈরি।"},
    {"num": "02", "icon": "Leaf", "title": "Premium Pistachio", "title_bn": "প্রিমিয়াম পেস্তা", "desc": "ইরানি ও তুর্কি পেস্তা থেকে বাছাই করা — সতেজ, সুগন্ধি, পুষ্টিকর।"},
    {"num": "03", "icon": "Coffee", "title": "Artisan Chocolate", "title_bn": "আর্টিজান চকোলেট", "desc": "বেলজিয়ান কোকো থেকে তৈরি প্রিমিয়াম চকোলেট — কোনো প্রিজারভেটিভ নেই।"},
    {"num": "04", "icon": "FlameKindling", "title": "Small Batch Production", "title_bn": "স্মল ব্যাচ প্রোডাকশন", "desc": "প্রতিটি ব্যাচ ৫০ পিসের বেশি নয় — সর্বোচ্চ মান নিশ্চিত করতে।"}
  ]
}'::jsonb),
('community', '{
  "badge_text": "Community",
  "title": "#FlaromaMoments",
  "subtitle": "আমাদের কমিউনিটির চকোলেট প্রেমীদের কিছু মুহূর্ত",
  "images": []
}'::jsonb);
