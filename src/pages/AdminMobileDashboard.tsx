import { useState, useMemo, useEffect } from "react";
import flaromaLogo from "@/assets/flaroma-logo-full.png";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from "date-fns";
import { CalendarIcon, Download, TrendingUp, Package, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import Taka from "@/components/Taka";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import jsPDF from "jspdf";

type DatePreset = "today" | "yesterday" | "last7" | "month" | "custom";

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  month: "This Month",
  custom: "Custom Range",
};

interface Order {
  id: string;
  product_title: string;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
}

const STORAGE_KEY = "flaroma_dashboard_period";

const AdminMobileDashboard = () => {
  const [preset, setPreset] = useState<DatePreset>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as DatePreset) || "today";
  });
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

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
      case "custom":
        return {
          start: customStart ? startOfDay(customStart) : startOfDay(now),
          end: customEnd ? endOfDay(customEnd) : endOfDay(now),
        };
    }
  }, [preset, customStart, customEnd]);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["mobile-dashboard-orders", dateRange.start.toISOString(), dateRange.end.toISOString()],
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
    refetchInterval: 30000, // Real-time: refetch every 30s
  });

  const totalSales = useMemo(
    () => orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [orders]
  );

  const totalOrders = orders.length;

  const confirmedOrders = useMemo(
    () => orders.filter(o => o.status === "confirmed" || o.status === "completed" || o.status === "shipped" || o.status === "processing").length,
    [orders]
  );

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      map.set(o.product_title, (map.get(o.product_title) || 0) + o.quantity);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [orders]);

  const downloadPdf = () => {
    const doc = new jsPDF();
    const rangeText = `${format(dateRange.start, "MMM d, yyyy")} – ${format(dateRange.end, "MMM d, yyyy")}`;

    doc.setFontSize(18);
    doc.text("Flaroma Sales Report", 20, 25);
    doc.setFontSize(10);
    doc.text(rangeText, 20, 33);

    doc.setFontSize(12);
    doc.text(`Total Sales: BDT ${totalSales.toLocaleString()}`, 20, 48);
    doc.text(`Total Orders: ${totalOrders}`, 20, 56);
    doc.text(`Confirmed Orders: ${confirmedOrders}`, 20, 64);

    doc.setFontSize(14);
    doc.text("Top Products", 20, 80);
    doc.setFontSize(10);
    topProducts.forEach(([name, qty], i) => {
      doc.text(`${i + 1}. ${name} — ${qty} sold`, 25, 90 + i * 8);
    });

    doc.save(`flaroma-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-chocolate px-5 pt-6 pb-8 flex items-center justify-center">
        <img src={flaromaLogo} alt="Flaroma" className="h-9" loading="eager" />
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Period Dropdown */}
        <div className="flex gap-2">
          <Select value={preset} onValueChange={(v) => { setPreset(v as DatePreset); if (v !== "custom") { setCustomStart(undefined); setCustomEnd(undefined); } }}>
            <SelectTrigger className="h-10 bg-card border-border text-sm font-medium flex-1">
              <CalendarIcon size={14} className="mr-2 text-accent" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {(Object.entries(PRESET_LABELS) as [DatePreset, string][]).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Pickers */}
        {preset === "custom" && (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("flex-1 text-xs gap-1.5", !customStart && "text-muted-foreground")}>
                  <CalendarIcon size={12} />
                  {customStart ? format(customStart, "MMM d") : "Start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover z-50">
                <Calendar mode="single" selected={customStart} onSelect={setCustomStart} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("flex-1 text-xs gap-1.5", !customEnd && "text-muted-foreground")}>
                  <CalendarIcon size={12} />
                  {customEnd ? format(customEnd, "MMM d") : "End"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover z-50">
                <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-accent/20">
            <CardContent className="p-4">
              {isLoading ? (
                <Loader2 className="animate-spin text-muted-foreground mx-auto" size={18} />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Sales</p>
                    <TrendingUp size={14} className="text-accent" />
                  </div>
                  <p className="text-xl font-bold font-num text-foreground">
                    <Taka amount={totalSales.toLocaleString()} />
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              {isLoading ? (
                <Loader2 className="animate-spin text-muted-foreground mx-auto" size={18} />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Orders</p>
                    <ShoppingBag size={14} className="text-accent" />
                  </div>
                  <p className="text-xl font-bold font-num text-foreground">{totalOrders}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{confirmedOrders} confirmed</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package size={16} className="text-accent" />
              Top Sold Products
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Loader2 className="animate-spin text-muted-foreground mx-auto" size={18} />
            ) : topProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No orders in this period</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map(([name, qty], i) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground font-medium truncate max-w-[200px]">{name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-num">{qty} sold</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download Report */}
        <Button
          onClick={downloadPdf}
          className="w-full gap-2 bg-gradient-chocolate text-primary-foreground hover:opacity-90"
          disabled={isLoading || orders.length === 0}
        >
          <Download size={16} />
          Download PDF Report
        </Button>
      </div>

      <AdminBottomNav />
    </div>
  );
};

export default AdminMobileDashboard;
