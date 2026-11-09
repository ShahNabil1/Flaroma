import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone_number } = await req.json();

    if (!phone_number || !/^01[3-9]\d{8}$/.test(phone_number)) {
      return new Response(
        JSON.stringify({ valid: false, message: "Invalid BD phone format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const BDCOURIER_API_KEY = Deno.env.get("BDCOURIER_API_KEY");
    if (!BDCOURIER_API_KEY) {
      console.error("BDCOURIER_API_KEY not configured");
      // Fail open — allow order if API key missing
      return new Response(
        JSON.stringify({ valid: true, message: "Validation skipped (config missing)", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call BD Courier / FraudBD API
    const apiRes = await fetch("https://bdcourier.com/api/check-courier-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_key": BDCOURIER_API_KEY,
      },
      body: JSON.stringify({ phone_number }),
    });

    if (!apiRes.ok) {
      console.error(`BD Courier API returned ${apiRes.status}`);
      // Fail open on API error
      return new Response(
        JSON.stringify({ valid: true, message: "Validation service unavailable", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiData = await apiRes.json();
    console.log("BD Courier response:", JSON.stringify(apiData));

    // Determine validity based on response
    const totalSummary = apiData?.data?.totalSummary;
    let valid = true;
    let risk_level = "unknown";
    let message = "Phone validated successfully";

    if (totalSummary) {
      const { total, success, cancel, successRate, cancelRate } = totalSummary;

      // Reject if cancel rate > 70% and has significant order history
      if (total >= 3 && cancelRate > 70) {
        valid = false;
        risk_level = "high";
        message = "আপনার ফোন নাম্বারটি সঠিক নয়। অনুগ্রহ করে একটি সচল নাম্বার দিন।";
      } else if (total >= 3 && cancelRate > 50) {
        risk_level = "medium";
      } else if (total > 0) {
        risk_level = "low";
      }

      // Check Pathao rating if available
      const pathao = apiData?.data?.Summaries?.Pathao;
      if (pathao?.data_type === "rating" && pathao.risk_level === "very_high") {
        valid = false;
        risk_level = "high";
        message = "আপনার ফোন নাম্বারটি সঠিক নয়। অনুগ্রহ করে একটি সচল নাম্বার দিন।";
      }
    }

    return new Response(
      JSON.stringify({
        valid,
        risk_level,
        message,
        courier_data: totalSummary || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("validate-phone error:", err);
    return new Response(
      JSON.stringify({ valid: true, message: "Validation error, proceeding", skipped: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
