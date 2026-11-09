
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key text NOT NULL UNIQUE,
  subject text NOT NULL DEFAULT '',
  html_body text NOT NULL DEFAULT '',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email templates are publicly readable"
  ON public.email_templates FOR SELECT
  USING (true);

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.email_templates (template_key, subject, description, html_body) VALUES
('new_order', 'New Order Received!', 'Sent to admins when a new order is placed after payment',
E'<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;font-family:Segoe UI,Arial,sans-serif;background:#f8f5f0}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}.header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px;text-align:center}.header h1{color:#d4a574;margin:0;font-size:24px;letter-spacing:1px}.header p{color:#a0a0b0;margin:8px 0 0;font-size:13px}.body{padding:32px}.label{color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}.value{color:#1a1a2e;font-size:16px;font-weight:600;margin-bottom:16px}.divider{border:none;border-top:1px solid #eee;margin:20px 0}.btn{display:inline-block;background:#d4a574;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px}.footer{background:#f8f5f0;padding:20px;text-align:center;color:#999;font-size:11px}</style></head><body><div class="container"><div class="header"><h1>FLAROMA</h1><p>New Order Notification</p></div><div class="body"><p class="label">Customer</p><p class="value">{{customer_name}}</p><p class="label">Phone</p><p class="value">{{customer_phone}}</p><p class="label">Product</p><p class="value">{{product_title}}{{variant}}</p><p class="label">Amount</p><p class="value">{{total_amount}}</p><hr class="divider"><p style="text-align:center"><a href="{{invoice_link}}" class="btn">View Invoice</a></p></div><div class="footer">Flaroma Alerts - Automated Notification</div></div></body></html>'),
('cart_abandonment', 'Cart Auto-saved Alert', 'Sent to admins when a cart is auto-saved',
E'<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;font-family:Segoe UI,Arial,sans-serif;background:#f8f5f0}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}.header{background:linear-gradient(135deg,#2d1810,#4a2c1a);padding:32px;text-align:center}.header h1{color:#d4a574;margin:0;font-size:24px;letter-spacing:1px}.header p{color:#a0a0b0;margin:8px 0 0;font-size:13px}.body{padding:32px}.label{color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}.value{color:#1a1a2e;font-size:16px;font-weight:600;margin-bottom:16px}.footer{background:#f8f5f0;padding:20px;text-align:center;color:#999;font-size:11px}</style></head><body><div class="container"><div class="header"><h1>FLAROMA</h1><p>Cart Auto-save Alert</p></div><div class="body"><p class="label">Customer</p><p class="value">{{customer_name}}</p><p class="label">Phone</p><p class="value">{{customer_phone}}</p><p class="label">Cart Items</p><p class="value">{{items_list}}</p><p class="label">Total Value</p><p class="value">{{total_value}}</p></div><div class="footer">Flaroma Alerts - Automated Notification</div></div></body></html>');
