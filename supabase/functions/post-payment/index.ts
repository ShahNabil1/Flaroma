import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET: Fetch order details for invoice page (public, UUID is unguessable)
    if (req.method === "GET" && action === "order") {
      const orderId = url.searchParams.get("id");
      if (!orderId) {
        return new Response(JSON.stringify({ error: "Missing order id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let order = null;
      let error = null;

      // Support both full UUID and short ID (first 8 chars)
      if (orderId.length < 36) {
        const { data: rows, error: qErr } = await supabase
          .rpc("get_order_by_short_id", { short_id: orderId });
        order = rows?.[0] || null;
        error = qErr;
      } else {
        const result = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();
        order = result.data;
        error = result.error;
      }

      if (error || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(order), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Send SMS + update invoice_url after successful payment
    if (req.method === "POST") {
      const body = await req.json();
      const { order_id, customer_name, customer_phone, amount, payment_type, invoice_url } = body;

      if (!order_id || !customer_phone) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update invoice_url in orders table if provided
      if (invoice_url) {
        const { error: updateError } = await supabase
          .from("orders")
          .update({ invoice_url })
          .eq("id", order_id);
        if (updateError) {
          console.error("Failed to update invoice_url:", updateError);
        }
      }

      const smsApiKey = Deno.env.get("BULKSMSBD_API_KEY");
      const smsSenderId = Deno.env.get("BULKSMSBD_SENDER_ID");

      if (!smsApiKey || !smsSenderId) {
        console.warn("BulkSMSBD credentials not configured, skipping SMS");
        return new Response(JSON.stringify({ success: true, sms_sent: false, reason: "SMS credentials not configured" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use short URL pointing to web invoice (first 8 chars of UUID)
      const shortId = order_id.substring(0, 8);
      const invoiceLink = `https://flaroma.bd/i/${shortId}`;

      // Cash-on-delivery SMS template
      const shortName = (customer_name || "Customer").split(" ")[0];
      const formattedAmount = Number(amount).toLocaleString("en-BD");

      const smsMessage = `[Flaroma] প্রিয় ${shortName}, আপনার অর্ডারটি কনফার্ম করা হয়েছে। ক্যাশ অন ডেলিভারি এমাউন্ট: ${formattedAmount} টাকা। ইনভয়েস: ${invoiceLink}`;

      // Ensure phone is in correct format (with 88 prefix)
      let phoneNumber = customer_phone.trim();
      if (phoneNumber.startsWith("01")) {
        phoneNumber = "88" + phoneNumber;
      }

      try {
        // BulkSMSBD API uses query parameters (GET/POST), not JSON body
        const smsParams = new URLSearchParams({
          api_key: smsApiKey,
          senderid: smsSenderId,
          type: "text",
          number: phoneNumber,
          message: smsMessage,
        });

        const smsUrl = `http://bulksmsbd.net/api/smsapi?${smsParams.toString()}`;
        console.log("Sending SMS to:", phoneNumber);

        const smsRes = await fetch(smsUrl, { method: "GET" });
        const smsData = await smsRes.json();
        console.log("BulkSMSBD response:", JSON.stringify(smsData));

        // Trigger admin email notification (fire-and-forget)
        try {
          const shortId = order_id.substring(0, 8);
          const emailInvoiceLink = `https://flaroma.bd/i/${shortId}`;
          const variantText = body.variant ? ` (${body.variant})` : "";
          const emailUrl = `${supabaseUrl}/functions/v1/send-email?action=send`;
          await fetch(emailUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              template_key: "new_order",
              variables: {
                customer_name: customer_name || "Customer",
                customer_phone: customer_phone,
                product_title: body.product_title || "Order",
                variant: variantText,
                total_amount: `৳${Number(amount).toLocaleString("en-BD")}`,
                invoice_link: emailInvoiceLink,
              },
            }),
          });
          console.log("Admin email notification triggered");
        } catch (emailErr) {
          console.error("Email trigger failed (non-blocking):", emailErr);
        }

        return new Response(JSON.stringify({ success: true, sms_sent: true, sms_response: smsData }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (smsErr) {
        console.error("SMS send error:", smsErr);
        return new Response(JSON.stringify({ success: true, sms_sent: false, reason: String(smsErr) }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("post-payment error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
