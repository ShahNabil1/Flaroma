import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

const ADMIN_EMAILS_RAW = Deno.env.get("ADMIN_EMAILS") || "";

function getAdminEmails(): string[] {
  return ADMIN_EMAILS_RAW.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

async function verifyAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.email) return false;

  const email = data.user.email.toLowerCase();
  if (getAdminEmails().includes(email)) return true;

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
  return !!roleData;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // GET orders or reviews
    if (req.method === "GET" && !action) {
      const status = url.searchParams.get("status");
      const search = url.searchParams.get("search");

      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (status === "draft") {
        query = query.eq("status", "draft");
      } else if (status && status !== "all") {
        query = query.eq("status", status);
      } else {
        // "all" — exclude drafts
        query = query.neq("status", "draft");
      }
      if (search) {
        query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET reviews for admin
    if (req.method === "GET" && action === "reviews") {
      const filter = url.searchParams.get("filter") || "pending";
      let query = supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Courier check via BD Courier
    if (req.method === "POST" && action === "fraud-check") {
      const { phone } = await req.json();
      const apiKey = Deno.env.get("BDCOURIER_API_KEY");
      if (!apiKey) throw new Error("BDCOURIER_API_KEY not configured");

      const res = await fetch("https://api.bdcourier.com/courier-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ phone }),
      });

      const rawData = await res.json();
      console.log("BD Courier raw response:", JSON.stringify(rawData));

      // Normalize BD Courier response to frontend format
      // BD Courier returns: { status, data: { pathao: {...}, steadfast: {...}, summary: {...} }, reports }
      const d = rawData.data || {};
      const summaries: Record<string, unknown> = {};
      const knownCouriers = ["pathao", "steadfast", "parceldex", "redx", "paperfly", "carrybee", "sundarban", "janani", "dex", "sprint"];

      for (const [key, val] of Object.entries(d)) {
        if (key === "summary" || key === "reports") continue;
        const ci = val as Record<string, unknown>;
        if (ci && typeof ci === "object" && ci.name) {
          const t = Number(ci.total_parcel || 0);
          const s = Number(ci.success_parcel || 0);
          const c = Number(ci.cancelled_parcel || 0);
          summaries[String(ci.name)] = { total: t, success: s, cancel: c, data_type: "count", show_count: true, logo: ci.logo };
        }
      }

      const summary = d.summary as Record<string, unknown> || {};
      const topTotal = Number(summary.total_parcel || 0);
      const topSuccess = Number(summary.success_parcel || 0);
      const topCancel = Number(summary.cancelled_parcel || 0);
      const rate = Number(summary.success_ratio || (topTotal > 0 ? (topSuccess / topTotal) * 100 : 0));

      const normalized = {
        status: rawData.status,
        message: rawData.message,
        data: {
          Summaries: Object.keys(summaries).length > 0 ? summaries : undefined,
          totalSummary: {
            total: topTotal,
            success: topSuccess,
            cancel: topCancel,
            successRate: rate,
            cancelRate: topTotal > 0 ? (topCancel / topTotal) * 100 : 0,
          },
        },
      };

      console.log("BD Courier normalized response:", JSON.stringify(normalized));

      return new Response(JSON.stringify(normalized), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send to Steadfast
    if (req.method === "POST" && action === "steadfast") {
      const { orderId, recipientName, recipientPhone, recipientAddress, codAmount, note } = await req.json();

      const sfApiKey = Deno.env.get("STEADFAST_API_KEY");
      const sfSecretKey = Deno.env.get("STEADFAST_SECRET_KEY");
      if (!sfApiKey || !sfSecretKey) throw new Error("Steadfast API keys not configured");

      const invoice = `FLA-${orderId.substring(0, 8).toUpperCase()}`;

      const res = await fetch("https://portal.packzy.com/api/v1/create_order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": sfApiKey,
          "Secret-Key": sfSecretKey,
        },
        body: JSON.stringify({
          invoice,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          recipient_address: recipientAddress,
          cod_amount: codAmount,
          note: note || "",
        }),
      });

      const data = await res.json();

      if (data.status === 200 && data.consignment) {
        await supabase.from("orders").update({
          status: "processing",
          steadfast_consignment_id: String(data.consignment.consignment_id),
          steadfast_tracking_code: data.consignment.tracking_code,
          steadfast_status: "in_review",
        }).eq("id", orderId);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Steadfast balance
    if (req.method === "GET" && action === "sf-balance") {
      const sfApiKey = Deno.env.get("STEADFAST_API_KEY");
      const sfSecretKey = Deno.env.get("STEADFAST_SECRET_KEY");
      if (!sfApiKey || !sfSecretKey) throw new Error("Steadfast API keys not configured");

      const res = await fetch("https://portal.packzy.com/api/v1/get_balance", {
        headers: { "Api-Key": sfApiKey, "Secret-Key": sfSecretKey, "Content-Type": "application/json" },
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check delivery status by consignment ID
    if (req.method === "GET" && action === "sf-status") {
      const cid = url.searchParams.get("cid");
      if (!cid) throw new Error("Missing consignment ID");

      const sfApiKey = Deno.env.get("STEADFAST_API_KEY");
      const sfSecretKey = Deno.env.get("STEADFAST_SECRET_KEY");
      if (!sfApiKey || !sfSecretKey) throw new Error("Steadfast API keys not configured");

      const res = await fetch(`https://portal.packzy.com/api/v1/status_by_cid/${cid}`, {
        headers: { "Api-Key": sfApiKey, "Secret-Key": sfSecretKey, "Content-Type": "application/json" },
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create return request
    if (req.method === "POST" && action === "sf-return") {
      const { consignment_id, reason } = await req.json();

      const sfApiKey = Deno.env.get("STEADFAST_API_KEY");
      const sfSecretKey = Deno.env.get("STEADFAST_SECRET_KEY");
      if (!sfApiKey || !sfSecretKey) throw new Error("Steadfast API keys not configured");

      const res = await fetch("https://portal.packzy.com/api/v1/create_return_request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": sfApiKey,
          "Secret-Key": sfSecretKey,
        },
        body: JSON.stringify({ consignment_id, reason: reason || "" }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Steadfast payments
    if (req.method === "GET" && action === "sf-payments") {
      const sfApiKey = Deno.env.get("STEADFAST_API_KEY");
      const sfSecretKey = Deno.env.get("STEADFAST_SECRET_KEY");
      if (!sfApiKey || !sfSecretKey) throw new Error("Steadfast API keys not configured");

      const res = await fetch("https://portal.packzy.com/api/v1/payments", {
        headers: { "Api-Key": sfApiKey, "Secret-Key": sfSecretKey, "Content-Type": "application/json" },
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Steadfast API connection test - checks keys, balance, and webhook health
    if (req.method === "GET" && action === "sf-connection-test") {
      const sfApiKey = Deno.env.get("STEADFAST_API_KEY");
      const sfSecretKey = Deno.env.get("STEADFAST_SECRET_KEY");
      const results: Record<string, unknown> = {
        api_keys_configured: !!(sfApiKey && sfSecretKey),
        timestamp: new Date().toISOString(),
      };

      if (!sfApiKey || !sfSecretKey) {
        results.api_status = "error";
        results.api_message = "API keys not configured";
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Test API connection by fetching balance
      try {
        const balanceRes = await fetch("https://portal.packzy.com/api/v1/get_balance", {
          headers: { "Api-Key": sfApiKey, "Secret-Key": sfSecretKey, "Content-Type": "application/json" },
        });
        const balanceData = await balanceRes.json();
        results.api_status = balanceRes.ok ? "connected" : "error";
        results.api_http_status = balanceRes.status;
        results.balance = balanceData;
        results.api_message = balanceRes.ok ? "API connection successful" : `API returned ${balanceRes.status}`;
      } catch (e) {
        results.api_status = "error";
        results.api_message = `Connection failed: ${e.message}`;
      }

      // Test webhook endpoint health
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/steadfast-webhook`;
      try {
        const whRes = await fetch(webhookUrl, { method: "GET" });
        const whData = await whRes.json();
        results.webhook_status = whRes.ok ? "active" : "error";
        results.webhook_url = webhookUrl;
        results.webhook_message = whData.message || `HTTP ${whRes.status}`;
      } catch (e) {
        results.webhook_status = "error";
        results.webhook_message = `Webhook unreachable: ${e.message}`;
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order - supports all editable fields
    if (req.method === "PUT") {
      const body = await req.json();

      // Handle review status update
      if (body.action === "update-review") {
        const { error } = await supabase.from("reviews").update({ status: body.status }).eq("id", body.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { id, status, payment_status, customer_name, customer_phone, customer_address, discount, advance_amount, total_amount, delivery_charge } = body;
      const updates: Record<string, unknown> = {};
      if (status !== undefined) updates.status = status;
      if (payment_status !== undefined) updates.payment_status = payment_status;
      if (customer_name !== undefined) updates.customer_name = customer_name;
      if (customer_phone !== undefined) updates.customer_phone = customer_phone;
      if (customer_address !== undefined) updates.customer_address = customer_address;
      if (discount !== undefined) updates.discount = discount;
      if (advance_amount !== undefined) updates.advance_amount = advance_amount;
      if (total_amount !== undefined) updates.total_amount = total_amount;
      if (delivery_charge !== undefined) updates.delivery_charge = delivery_charge;

      // Fetch existing order to detect status transitions
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      const { error } = await supabase.from("orders").update(updates).eq("id", id);
      if (error) throw error;

      // If status transitions to "confirmed" for the first time, trigger SMS notification
      const wasNotConfirmed = existingOrder && existingOrder.status !== "confirmed";
      const isNowConfirmed = status === "confirmed";
      if (wasNotConfirmed && isNowConfirmed) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const codAmount = existingOrder.total_amount || 0;
          fetch(`${supabaseUrl}/functions/v1/post-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: id,
              customer_name: existingOrder.customer_name,
              customer_phone: existingOrder.customer_phone,
              amount: codAmount,
              payment_type: "cod",
              product_title: existingOrder.product_title,
              variant: existingOrder.variant,
            }),
          }).catch((e) => console.error("Post-payment trigger failed:", e));
        } catch (e) {
          console.error("SMS trigger setup error:", e);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete review
    if (req.method === "POST" && action === "delete-review") {
      const { id } = await req.json();
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET site settings
    if (req.method === "GET" && action === "site-settings") {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      const settings: Record<string, unknown> = {};
      for (const row of data || []) {
        settings[row.key] = row.value;
      }
      return new Response(JSON.stringify(settings), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE site settings
    if (req.method === "POST" && action === "save-site-settings") {
      const body = await req.json();
      const entries = Object.entries(body);
      for (const [key, value] of entries) {
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== BUILD FLOW CRUD =====

    // GET build flow steps with options
    if (req.method === "GET" && action === "build-flow") {
      const { data: steps, error: stepsErr } = await supabase
        .from("build_flow_steps")
        .select("*")
        .order("sort_order");
      if (stepsErr) throw stepsErr;

      const { data: options, error: optsErr } = await supabase
        .from("build_flow_options")
        .select("*")
        .order("sort_order");
      if (optsErr) throw optsErr;

      const result = (steps || []).map((s: any) => ({
        ...s,
        options: (options || []).filter((o: any) => o.step_id === s.id),
      }));

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE/UPDATE build flow step
    if (req.method === "POST" && action === "build-flow-step") {
      const body = await req.json();
      if (body.id) {
        const { id, ...rest } = body;
        const { error } = await supabase.from("build_flow_steps").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("build_flow_steps").insert(body);
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE build flow step
    if (req.method === "POST" && action === "delete-build-flow-step") {
      const { id } = await req.json();
      const { error } = await supabase.from("build_flow_steps").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE/UPDATE build flow option
    if (req.method === "POST" && action === "build-flow-option") {
      const body = await req.json();
      if (body.id) {
        const { id, ...rest } = body;
        const { error } = await supabase.from("build_flow_options").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("build_flow_options").insert(body);
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE build flow option
    if (req.method === "POST" && action === "delete-build-flow-option") {
      const { id } = await req.json();
      const { error } = await supabase.from("build_flow_options").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE manual order
    if (req.method === "POST" && action === "create-order") {
      const body = await req.json();
      const {
        customer_name, customer_phone, customer_address, delivery_area,
        product_id, product_title, variant, unit_price, quantity,
        delivery_charge, discount, total_amount, payment_status, status,
        customization_note, image_url, source,
      } = body;

      const { data, error } = await supabase.from("orders").insert({
        customer_name,
        customer_phone,
        customer_address,
        delivery_area: delivery_area || "inside_dhaka",
        product_id: product_id || null,
        product_title: product_title || "Manual Order",
        variant: variant || null,
        unit_price: unit_price || 0,
        quantity: quantity || 1,
        delivery_charge: delivery_charge || 0,
        discount: discount || 0,
        total_amount: total_amount || 0,
        payment_status: payment_status || "unpaid",
        status: status || "pending",
        customization_note: customization_note || null,
        image_url: image_url || null,
        source: source || "manual",
      }).select().single();

      if (error) throw error;

      // Also upsert customer in CRM
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id, total_orders")
        .eq("customer_phone", customer_phone)
        .single();

      if (existingCustomer) {
        await supabase.from("customers").update({
          customer_name,
          total_orders: (existingCustomer.total_orders || 0) + 1,
          status: "active",
          updated_at: new Date().toISOString(),
        }).eq("id", existingCustomer.id);
      } else {
        await supabase.from("customers").insert({
          customer_name,
          customer_phone,
          status: "active",
          total_orders: 1,
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== COUPON CRUD =====

    // GET all coupons (admin sees all, not just active)
    if (req.method === "GET" && action === "coupons") {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save (create/update) coupon
    if (req.method === "POST" && action === "save-coupon") {
      const body = await req.json();
      if (body.id) {
        const { id, ...rest } = body;
        const { error } = await supabase.from("coupons").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(body);
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete coupon
    if (req.method === "POST" && action === "delete-coupon") {
      const { id } = await req.json();
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CRM lookup by phone
    if (req.method === "GET" && action === "crm-lookup") {
      const phone = url.searchParams.get("phone");
      if (!phone) throw new Error("Phone required");

      const { data } = await supabase
        .from("customers")
        .select("customer_name, customer_phone")
        .eq("customer_phone", phone)
        .single();

      // Also get latest address from orders
      let address = "";
      if (data) {
        const { data: lastOrder } = await supabase
          .from("orders")
          .select("customer_address, delivery_area")
          .eq("customer_phone", phone)
          .neq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (lastOrder) address = lastOrder.customer_address || "";
      }

      return new Response(JSON.stringify(data ? { ...data, address } : null), {
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
