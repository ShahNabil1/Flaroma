import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const CLOUD_NAME = "dvfb58wu4";
  const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
  const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

  if (!API_KEY || !API_SECRET) {
    return new Response(
      JSON.stringify({ error: "Cloudinary credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = `Basic ${btoa(`${API_KEY}:${API_SECRET}`)}`;
  const baseUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

  try {
    const { action, public_id, next_cursor, search_expression } = await req.json();

    if (action === "list") {
      const body: Record<string, any> = {
        max_results: 50,
        sort_by: [{ created_at: "desc" }],
      };
      if (next_cursor) body.next_cursor = next_cursor;
      if (search_expression) body.expression = search_expression;

      const res = await fetch(`${baseUrl}/resources/search`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Cloudinary search failed [${res.status}]: ${text}`);
      }

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!public_id) {
        return new Response(
          JSON.stringify({ error: "public_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(`${baseUrl}/resources/image/upload`, {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ public_ids: [public_id] }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Cloudinary delete failed [${res.status}]: ${text}`);
      }

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("cloudinary-media error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
