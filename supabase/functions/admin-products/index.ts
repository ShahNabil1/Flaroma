import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD")!;
const ADMIN_EMAILS_RAW = Deno.env.get("ADMIN_EMAILS") || "";

function getAdminEmails(): string[] {
  return ADMIN_EMAILS_RAW.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

async function verifyAuth(req: Request): Promise<{ authorized: boolean; email?: string }> {
  // Check password-based auth first
  const password = req.headers.get("x-admin-password");
  if (password && password === ADMIN_PASSWORD) {
    return { authorized: true };
  }

  // Check JWT-based auth
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user?.email) {
      const email = data.user.email.toLowerCase();
      const allowed = getAdminEmails();
      if (allowed.includes(email)) {
        return { authorized: true, email };
      }
      // Also check user_roles table
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: roleData } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();
      if (roleData) {
        return { authorized: true, email };
      }
    }
  }

  return { authorized: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const resource = url.searchParams.get("resource");

  // Auth check endpoint
  if (resource === "auth-check") {
    const { authorized, email } = await verifyAuth(req);
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ authorized: true, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // All other endpoints require auth
  const { authorized } = await verifyAuth(req);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Media resource handling
  if (resource === "media") {
    try {
      if (req.method === "GET") {
        const apiKey = Deno.env.get("CLOUDINARY_API_KEY")!;
        const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET")!;
        const cloudName = "dvfb58wu4";
        const auth = btoa(`${apiKey}:${apiSecret}`);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ max_results: 100, sort_by: [{ created_at: "desc" }] }),
          }
        );
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "DELETE") {
        const { public_id } = await req.json();
        const apiKey = Deno.env.get("CLOUDINARY_API_KEY")!;
        const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET")!;
        const cloudName = "dvfb58wu4";
        const auth = btoa(`${apiKey}:${apiSecret}`);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ public_ids: [public_id] }),
          }
        );
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Product CRUD
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*)")
        .order("sort_order");
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { variants, ...productData } = body;

      const { data: product, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();
      if (error) throw error;

      if (variants?.length) {
        const variantRows = variants.map((v: any) => ({ ...v, product_id: product.id }));
        const { error: vErr } = await supabase.from("product_variants").insert(variantRows);
        if (vErr) throw vErr;
      }

      return new Response(JSON.stringify(product), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const { id, variants, ...productData } = body;

      const { error } = await supabase.from("products").update(productData).eq("id", id);
      if (error) throw error;

      await supabase.from("product_variants").delete().eq("product_id", id);
      if (variants?.length) {
        const variantRows = variants.map((v: any) => ({ ...v, product_id: id }));
        const { error: vErr } = await supabase.from("product_variants").insert(variantRows);
        if (vErr) throw vErr;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const { id } = await req.json();
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
