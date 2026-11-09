import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://ptxenyhuztiaexwdcecl.supabase.co";
const USERS_URL = `${SUPABASE_URL}/functions/v1/admin-users`;

export interface AdminPermissions {
  role: "owner" | "admin";
  permissions: Record<string, boolean>;
}

export function useAdminPermissions() {
  return useQuery<AdminPermissions | null>({
    queryKey: ["admin-permissions"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      const res = await fetch(`${USERS_URL}?action=my-permissions`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });
}

export const PAGE_KEYS: Record<string, string> = {
  products: "Products",
  orders: "Orders",
  coupons: "Coupons",
  email: "Email",
  steadfast: "Steadfast",
  customers: "Customers",
  reviews: "Reviews",
  website: "Website",
  users: "Users",
  analytics: "Analytics",
};
