import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // === GET templates ===
    if (req.method === "GET" && action === "templates") {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PUT update template ===
    if (req.method === "PUT" && action === "update-template") {
      // Verify admin auth
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const authSupa = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: authErr } = await authSupa.auth.getUser();
      if (authErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Check admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .single();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Not an admin" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { id, subject, html_body } = body;
      const { error } = await supabase
        .from("email_templates")
        .update({ subject, html_body })
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === POST send email ===
    if (req.method === "POST" && action === "send") {
      const body = await req.json();
      const { template_key, variables } = body;

      // 1. Fetch template
      const { data: template, error: tplErr } = await supabase
        .from("email_templates")
        .select("*")
        .eq("template_key", template_key)
        .single();
      if (tplErr || !template) {
        console.error("Template not found:", template_key);
        return new Response(JSON.stringify({ error: "Template not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Get all approved admin emails from user_roles
      const { data: admins, error: adminErr } = await supabase
        .from("user_roles")
        .select("email");
      if (adminErr) throw adminErr;

      const recipientEmails = (admins || [])
        .map((a: { email: string }) => a.email)
        .filter(Boolean);

      if (recipientEmails.length === 0) {
        console.warn("No admin emails found, skipping email send");
        return new Response(JSON.stringify({ success: true, sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Replace template variables
      let html = template.html_body;
      let subject = template.subject;
      for (const [key, val] of Object.entries(variables || {})) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        html = html.replace(regex, String(val));
        subject = subject.replace(regex, String(val));
      }

      // 4. Send via Resend
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Flaroma Alerts <alerts@flaroma.bd>",
          to: recipientEmails,
          subject,
          html,
        }),
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        console.error("Resend error:", JSON.stringify(resendData));
        return new Response(JSON.stringify({ error: "Email send failed", details: resendData }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Email sent successfully:", JSON.stringify(resendData));
      return new Response(JSON.stringify({ success: true, sent: recipientEmails.length, resend: resendData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === POST test email ===
    if (req.method === "POST" && action === "test") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const authSupa = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await authSupa.auth.getUser();
      if (!userData?.user?.email) {
        return new Response(JSON.stringify({ error: "No email" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { subject, html } = body;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Flaroma Alerts <alerts@flaroma.bd>",
          to: [userData.user.email],
          subject: `[TEST] ${subject}`,
          html,
        }),
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        return new Response(JSON.stringify({ error: "Send failed", details: resendData }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, sent_to: userData.user.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
