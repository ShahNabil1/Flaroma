import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const ADMIN_EMAILS_RAW = Deno.env.get("ADMIN_EMAILS") || "";

function getAdminEmails(): string[] {
  return ADMIN_EMAILS_RAW.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  
  // Return a user-like object from claims
  return {
    id: data.claims.sub as string,
    email: data.claims.email as string | undefined,
    user_metadata: data.claims.user_metadata as Record<string, any> || {},
  };
}

async function isAdmin(userId: string, supabase: any): Promise<boolean> {
  // Check user_roles table
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();
  if (data) return true;

  return false;
}

async function isOwner(userId: string, supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .single();
  return !!data;
}

async function isDeveloper(userId: string, supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "developer")
    .single();
  return !!data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // === Request Access (no admin auth needed, just authenticated user) ===
  if (req.method === "POST" && action === "request-access") {
    const user = await getAuthUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already an admin
    const adminEmails = getAdminEmails();
    const email = user.email?.toLowerCase() || "";

    // Check if already in user_roles
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingRole || adminEmails.includes(email)) {
      return new Response(JSON.stringify({ error: "Already an admin" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert request
    const { error } = await supabase
      .from("user_requests")
      .upsert({
        user_id: user.id,
        email,
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || email,
        avatar_url: user.user_metadata?.avatar_url || null,
        status: "pending",
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // === Check permissions for current user ===
  if (req.method === "GET" && action === "my-permissions") {
    const user = await getAuthUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = user.email?.toLowerCase() || "";
    const adminEmails = getAdminEmails();

    // Owner-level emails from ADMIN_EMAILS get all permissions
    if (adminEmails.includes(email)) {
      // Ensure they exist in user_roles as owner
      await supabase.from("user_roles").upsert({
        user_id: user.id,
        email,
        display_name: user.user_metadata?.full_name || email,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: "owner",
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        role: "owner",
        permissions: { products: true, orders: true, customers: true, reviews: true, website: true, users: true, email: true, analytics: true },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check user_roles
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not an admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (roleData.role === "owner" || roleData.role === "developer") {
      return new Response(JSON.stringify({
        role: roleData.role === "developer" ? "owner" : "owner",
        permissions: { products: true, orders: true, customers: true, reviews: true, website: true, users: true, email: true, analytics: true },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get specific permissions
    const { data: perms } = await supabase
      .from("user_permissions")
      .select("page_key, allowed")
      .eq("user_id", user.id);

    const permissions: Record<string, boolean> = {
      products: false, orders: false, customers: false, reviews: false, website: false, users: false, email: false, analytics: false,
    };
    for (const p of perms || []) {
      permissions[p.page_key] = p.allowed;
    }

    return new Response(JSON.stringify({ role: roleData.role, permissions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // === All remaining actions require admin auth ===
  const user = await getAuthUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminEmails = getAdminEmails();
  const userEmail = user.email?.toLowerCase() || "";
  const userIsAdmin = adminEmails.includes(userEmail) || await isAdmin(user.id, supabase);

  if (!userIsAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // GET pending requests
    if (req.method === "GET" && action === "pending-requests") {
      const { data, error } = await supabase
        .from("user_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET approved admins
    if (req.method === "GET" && action === "approved-admins") {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Filter out developer role users — they are invisible
      const visibleAdmins = (data || []).filter((a: any) => a.role !== "developer");

      // Get permissions for each
      const result = [];
      for (const admin of visibleAdmins) {
        const { data: perms } = await supabase
          .from("user_permissions")
          .select("page_key, allowed")
          .eq("user_id", admin.user_id);
        result.push({ ...admin, permissions: perms || [] });
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Approve request
    if (req.method === "POST" && action === "approve-request") {
      const { request_id, pin } = await req.json();

      // Verify PIN
      const { data: pinValid } = await supabase.rpc("verify_admin_pin", { input_pin: pin });
      if (!pinValid) {
        return new Response(JSON.stringify({ error: "Invalid PIN" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get request
      const { data: request } = await supabase
        .from("user_requests")
        .select("*")
        .eq("id", request_id)
        .single();
      if (!request) throw new Error("Request not found");

      // Add to user_roles
      const { error: roleErr } = await supabase.from("user_roles").upsert({
        user_id: request.user_id,
        email: request.email,
        display_name: request.display_name,
        avatar_url: request.avatar_url,
        role: "admin",
      }, { onConflict: "user_id" });
      if (roleErr) throw roleErr;

      // Set default permissions (all false)
      const pages = ["products", "orders", "steadfast", "customers", "reviews", "website", "users", "email", "analytics"];
      for (const page of pages) {
        await supabase.from("user_permissions").upsert({
          user_id: request.user_id,
          page_key: page,
          allowed: false,
        }, { onConflict: "user_id,page_key" });
      }

      // Update request status
      await supabase.from("user_requests").update({ status: "approved" }).eq("id", request_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reject request
    if (req.method === "POST" && action === "reject-request") {
      const { request_id } = await req.json();
      await supabase.from("user_requests").update({ status: "rejected" }).eq("id", request_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update permissions
    if (req.method === "POST" && action === "update-permissions") {
      const { target_user_id, permissions, pin } = await req.json();

      // Verify PIN
      const { data: pinValid } = await supabase.rpc("verify_admin_pin", { input_pin: pin });
      if (!pinValid) {
        return new Response(JSON.stringify({ error: "Invalid PIN" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Can't change owner or developer permissions
      if (await isOwner(target_user_id, supabase) || await isDeveloper(target_user_id, supabase)) {
        return new Response(JSON.stringify({ error: "Cannot modify owner permissions" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const [page, allowed] of Object.entries(permissions)) {
        await supabase.from("user_permissions").upsert({
          user_id: target_user_id,
          page_key: page,
          allowed: allowed as boolean,
        }, { onConflict: "user_id,page_key" });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove admin
    if (req.method === "POST" && action === "remove-admin") {
      const { target_user_id, pin } = await req.json();

      // Verify PIN
      const { data: pinValid } = await supabase.rpc("verify_admin_pin", { input_pin: pin });
      if (!pinValid) {
        return new Response(JSON.stringify({ error: "Invalid PIN" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Can't remove owner or developer
      if (await isOwner(target_user_id, supabase) || await isDeveloper(target_user_id, supabase)) {
        return new Response(JSON.stringify({ error: "Cannot remove owner" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("user_permissions").delete().eq("user_id", target_user_id);
      await supabase.from("user_roles").delete().eq("user_id", target_user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Change PIN
    if (req.method === "POST" && action === "change-pin") {
      const { current_pin, new_pin } = await req.json();

      // Verify current PIN
      const { data: pinValid } = await supabase.rpc("verify_admin_pin", { input_pin: current_pin });
      if (!pinValid) {
        return new Response(JSON.stringify({ error: "Invalid current PIN" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Must be owner to change PIN
      if (!adminEmails.includes(userEmail) && !await isOwner(user.id, supabase)) {
        return new Response(JSON.stringify({ error: "Only owner can change PIN" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update PIN via database function
      const { error: rpcErr } = await supabase.rpc("update_admin_pin", { new_pin });
      if (rpcErr) throw rpcErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
