import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://www.flaroma.bd";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch all products with variants
  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at, base_price, image_url, title, product_variants(variant_type, variant_value, price_modifier)")
    .order("sort_order");

  const now = new Date().toISOString();

  // Static pages (exclude admin, checkout, payment pages)
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/custom-box", priority: "0.8", changefreq: "weekly" },
    { loc: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
    { loc: "/refund-policy", priority: "0.3", changefreq: "yearly" },
    { loc: "/terms-of-service", priority: "0.3", changefreq: "yearly" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  // Static pages
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${now.split("T")[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  // Product pages
  if (products) {
    for (const product of products) {
      const lastmod = product.updated_at
        ? new Date(product.updated_at).toISOString().split("T")[0]
        : now.split("T")[0];

      xml += `  <url>
    <loc>${SITE_URL}/product/${product.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
`;

      // Product image
      if (product.image_url) {
        xml += `    <image:image>
      <image:loc>${escapeXml(product.image_url)}</image:loc>
      <image:title>${escapeXml(product.title)}</image:title>
    </image:image>
`;
      }

      xml += `  </url>
`;
    }
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
