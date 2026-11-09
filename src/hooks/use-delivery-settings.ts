import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryArea {
  id: string;
  area_key: string;
  area_name: string;
  charge: number;
  display_text: string;
  sort_order: number;
  is_active: boolean;
}

export function useDeliverySettings() {
  return useQuery<DeliveryArea[]>({
    queryKey: ["delivery-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_settings")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        area_key: row.area_key,
        area_name: row.area_name,
        charge: Number(row.charge),
        display_text: row.display_text,
        sort_order: row.sort_order,
        is_active: row.is_active,
      }));
    },
    staleTime: 1000 * 60,
  });
}
