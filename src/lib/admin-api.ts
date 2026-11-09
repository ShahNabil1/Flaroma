import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://ptxenyhuztiaexwdcecl.supabase.co";
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1/admin-products`;
const ORDERS_URL = `${SUPABASE_URL}/functions/v1/admin-orders`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    };
  }
  // Fallback to password auth
  const pw = sessionStorage.getItem("flaroma_admin_pw") || "";
  return {
    "Content-Type": "application/json",
    "x-admin-password": pw,
  };
}

export function setAdminPassword(pw: string) {
  sessionStorage.setItem("flaroma_admin_pw", pw);
}

export function clearAdminPassword() {
  sessionStorage.removeItem("flaroma_admin_pw");
}

async function adminFetch(method: string, body?: any, queryParams?: string) {
  const headers = await getAuthHeaders();
  const url = queryParams ? `${FUNCTIONS_URL}?${queryParams}` : FUNCTIONS_URL;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

async function ordersFetch(method: string, body?: any, queryParams?: string) {
  const headers = await getAuthHeaders();
  const url = queryParams ? `${ORDERS_URL}?${queryParams}` : ORDERS_URL;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const adminApi = {
  getProducts: () => adminFetch("GET"),
  createProduct: (data: any) => adminFetch("POST", data),
  updateProduct: (data: any) => adminFetch("PUT", data),
  deleteProduct: (id: string) => adminFetch("DELETE", { id }),

  // Reviews
  getReviews: (filter: string) => ordersFetch("GET", undefined, `action=reviews&filter=${filter}`),
  updateReview: (id: string, status: string) => ordersFetch("PUT", { id, action: "update-review", status }),
  deleteReview: (id: string) => ordersFetch("POST", { id, action: "delete-review" }),

  // Site Settings
  getSiteSettings: () => ordersFetch("GET", undefined, `action=site-settings`),
  saveSiteSettings: (data: Record<string, any>) => ordersFetch("POST", data, `action=save-site-settings`),
};
