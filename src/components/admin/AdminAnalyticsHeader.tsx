import { useMemo, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from "date-fns";
import { TrendingUp, ShoppingBag, Package, Loader2, CalendarIcon } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import Taka from "@/components/Taka";

type DatePreset = "today" | "yesterday" | "last7" | "month";

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  month: "This Month",
};

const STORAGE_KEY = "flaroma_analytics_period";

interface Order {
  id: string;
  product_title: string;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
}

const AdminAnalyticsHeader = () => {
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState<DatePreset>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as DatePreset) || "today";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, preset);
  }, [preset]);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday":
        return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case "last7":
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [preset]);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["analytics-header-orders", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, product_title, quantity, total_amount, status, created_at")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .neq("status", "draft")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("analytics-header-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["analytics-header-orders"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const totalSales = useMemo(
    () => orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [orders],
  );

  const confirmedOrders = useMemo(
    () => orders.filter(o => ["confirmed", "completed", "shipped", "processing"].includes(o.status)).length,
    [orders],
  );

  const topProduct = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      map.set(o.product_title, (map.get(o.product_title) || 0) + o.quantity);
    });
    let top = "";
    let max = 0;
    map.forEach((qty, name) => {
      if (qty > max) { max = qty; top = name; }
    });
    return top || "—";
  }, [orders]);

  return (
    <div className="mb-6">
      {/* Desktop: horizontal row */}
      <div className="hidden md:flex items-center gap-3">
        {/* Date Filter */}
        <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
          <SelectTrigger className="h-9 w-[150px] text-xs bg-card border-border font-medium">
            <CalendarIcon size={12} className="mr-1.5 text-accent" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {(Object.entries(PRESET_LABELS) as [DatePreset, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sales Card */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-card border border-accent/20">
          {isLoading ? (
            <Loader2 className="animate-spin text-muted-foreground" size={14} />
          ) : (
            <>
              <TrendingUp size={14} className="text-accent shrink-0" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Sales</span>
                <span className="text-sm font-bold font-num text-foreground">
                  <Taka amount={totalSales.toLocaleString()} />
                </span>
              </div>
            </>
          )}
        </div>

        {/* Orders Card */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-card border border-border">
          {isLoading ? (
            <Loader2 className="animate-spin text-muted-foreground" size={14} />
          ) : (
            <>
              <ShoppingBag size={14} className="text-accent shrink-0" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Orders</span>
                <span className="text-sm font-bold font-num text-foreground">{confirmedOrders}</span>
                <span className="text-[10px] text-muted-foreground">/ {orders.length}</span>
              </div>
            </>
          )}
        </div>

        {/* Top Product */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-card border border-border max-w-[260px]">
          {isLoading ? (
            <Loader2 className="animate-spin text-muted-foreground" size={14} />
          ) : (
            <>
              <Package size={14} className="text-accent shrink-0" />
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium shrink-0">Top</span>
                <span className="text-xs font-medium text-foreground truncate">{topProduct}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile: compact row */}
      <div className="md:hidden space-y-3">
        <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
          <SelectTrigger className="h-9 bg-card border-border text-xs font-medium">
            <CalendarIcon size={12} className="mr-1.5 text-accent" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {(Object.entries(PRESET_LABELS) as [DatePreset, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-accent/20 shrink-0">
            {isLoading ? <Loader2 className="animate-spin text-muted-foreground" size={12} /> : (
              <>
                <TrendingUp size={12} className="text-accent" />
                <span className="text-xs font-bold font-num"><Taka amount={totalSales.toLocaleString()} /></span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border shrink-0">
            {isLoading ? <Loader2 className="animate-spin text-muted-foreground" size={12} /> : (
              <>
                <ShoppingBag size={12} className="text-accent" />
                <span className="text-xs font-bold font-num">{confirmedOrders}<span className="text-muted-foreground font-normal">/{orders.length}</span></span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border shrink-0 max-w-[180px]">
            {isLoading ? <Loader2 className="animate-spin text-muted-foreground" size={12} /> : (
              <>
                <Package size={12} className="text-accent" />
                <span className="text-xs font-medium truncate">{topProduct}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsHeader;
