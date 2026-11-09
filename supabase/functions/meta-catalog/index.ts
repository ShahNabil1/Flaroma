import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://www.flaroma.bd";
const BRAND = "Flaroma";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

// Generate cartesian product of variant groups
function cartesian(arrays: any[][]): any[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce(
    (acc, curr) => acc.flatMap((a: any[]) => curr.map((c: any) => [...a, c])),
    [[]]
  );
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: products } = await supabase
    .from("products")
    .select("*, product_variants(*)")
    .order("sort_order");

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Flaroma Product Catalog</title>
<link>${SITE_URL}</link>
<description>Flaroma - Premium Handcrafted Chocolates</description>
`;

  if (products) {
    for (const product of products) {
      const variants = product.product_variants || [];
      const description = product.description
        ? escapeXml(stripHtml(product.description)).substring(0, 5000)
        : escapeXml(product.title);
      const link = `${SITE_URL}/product/${product.slug}`;
      const availability = product.status === "out_of_stock" ? "out of stock" : "in stock";
      const imageLink = product.image_url ? escapeXml(product.image_url) : "";

      if (variants.length === 0) {
        // No variants — single item
        xml += `<item>
  <g:id>${product.id}</g:id>
  <g:title>${escapeXml(product.title)}</g:title>
  <g:description>${description}</g:description>
  <g:link>${link}</g:link>
  <g:image_link>${imageLink}</g:image_link>
  <g:price>${product.base_price.toFixed(2)} BDT</g:price>
  <g:availability>${availability}</g:availability>
  <g:condition>new</g:condition>
  <g:brand>${BRAND}</g:brand>
${product.tag ? `  <g:product_type>${escapeXml(product.tag)}</g:product_type>\n` : ""}</item>
`;
      } else {
        // Group variants by type
        const groups: Record<string, any[]> = {};
        for (const v of variants) {
          if (!groups[v.variant_type]) groups[v.variant_type] = [];
          groups[v.variant_type].push(v);
        }

        const typeKeys = Object.keys(groups);
        const typeArrays = typeKeys.map((k) => groups[k]);
        const combos = cartesian(typeArrays);

        for (const combo of combos) {
          const comboIds = combo.map((v: any) => v.id).sort().join("_");
          const totalModifier = combo.reduce((sum: number, v: any) => sum + Number(v.price_modifier), 0);
          const salePrice = product.base_price + totalModifier;

          // Build variant label
          const variantLabels = combo.map((v: any) => v.variant_value).join(", ");
          const title = `${product.title} - ${variantLabels}`;

          // Extract size and other attributes
          const sizeVariant = combo.find((v: any) => v.variant_type.toLowerCase() === "size");
          const fillingVariant = combo.find((v: any) => v.variant_type.toLowerCase() !== "size");

          xml += `<item>
  <g:id>${product.id}_${comboIds}</g:id>
  <g:item_group_id>${product.id}</g:item_group_id>
  <g:title>${escapeXml(title)}</g:title>
  <g:description>${description}</g:description>
  <g:link>${link}</g:link>
  <g:image_link>${imageLink}</g:image_link>
  <g:price>${salePrice.toFixed(2)} BDT</g:price>
  <g:availability>${availability}</g:availability>
  <g:condition>new</g:condition>
  <g:brand>${BRAND}</g:brand>
${sizeVariant ? `  <g:size>${escapeXml(sizeVariant.variant_value)}</g:size>\n` : ""}${fillingVariant ? `  <g:custom_label_0>${escapeXml(fillingVariant.variant_value)}</g:custom_label_0>\n` : ""}${product.tag ? `  <g:product_type>${escapeXml(product.tag)}</g:product_type>\n` : ""}</item>
`;
        }
      }
    }
  }

  xml += `</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
