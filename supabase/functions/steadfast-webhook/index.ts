import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow GET for health checks
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", message: "Steadfast webhook is active" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let payload: Record<string, unknown>;

    // Handle both JSON and form-encoded payloads from Steadfast
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      payload = {};
      for (const [key, value] of formData.entries()) {
        payload[key] = value;
      }
    } else {
      payload = await req.json();
    }

    console.log("Steadfast webhook received:", JSON.stringify(payload));

    // Steadfast sends: consignment_id, tracking_code, status, invoice, etc.
    const consignment_id = payload.consignment_id ? String(payload.consignment_id) : null;
    const tracking_code = payload.tracking_code ? String(payload.tracking_code) : null;
    const status = payload.status ? String(payload.status) : null;
    const invoice = payload.invoice ? String(payload.invoice) : null;

    if (!consignment_id && !tracking_code && !invoice) {
      console.error("Webhook missing identifier:", JSON.stringify(payload));
      return new Response(JSON.stringify({ error: "Missing identifier", received: payload }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!status) {
      console.error("Webhook missing status:", JSON.stringify(payload));
      return new Response(JSON.stringify({ error: "Missing status field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Map Steadfast delivery statuses to our order statuses
    const statusMap: Record<string, string> = {
      in_review: "processing",
      pending: "processing",
      delivered: "completed",
      delivered_approval_pending: "shipped",
      partial_delivered: "completed",
      partial_delivered_approval_pending: "shipped",
      cancelled: "cancelled",
      cancelled_approval_pending: "cancelled",
      hold: "processing",
      unknown: "processing",
      unknown_approval_pending: "processing",
    };

    const mappedStatus = statusMap[status] || "processing";
    const updates: Record<string, string> = {
      steadfast_status: status,
      status: mappedStatus,
    };

    // If delivered, mark payment as paid (COD collected)
    if (status === "delivered" || status === "partial_delivered") {
      updates.payment_status = "paid";
    }

    // Try matching by consignment_id first, then tracking_code, then invoice
    let matched = false;

    if (consignment_id) {
      const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("steadfast_consignment_id", consignment_id)
        .select("id");
      if (!error && data && data.length > 0) {
        matched = true;
        console.log(`Matched by consignment_id=${consignment_id}, updated ${data.length} orders`);
      }
    }

    if (!matched && tracking_code) {
      const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("steadfast_tracking_code", tracking_code)
        .select("id");
      if (!error && data && data.length > 0) {
        matched = true;
        console.log(`Matched by tracking_code=${tracking_code}, updated ${data.length} orders`);
      }
    }

    if (!matched) {
      console.warn(`No matching order found for consignment_id=${consignment_id}, tracking_code=${tracking_code}, invoice=${invoice}`);
    }

    console.log(`Webhook processed: status=${status}, mapped=${mappedStatus}, matched=${matched}`);

    return new Response(JSON.stringify({ success: true, status: mappedStatus, matched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
