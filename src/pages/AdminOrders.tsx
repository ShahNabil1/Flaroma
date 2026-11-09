import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, Search, ShoppingBag, Loader2, Truck,
  Clock, CheckCircle, XCircle, Send, Eye, Copy, CreditCard, CalendarIcon,
  Star, Globe, Users, FilePen, Phone, Plus, FileText, Filter, Check, ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import OrderDetailModal from "@/components/admin/OrderDetailModal";
import DraftOrderModal from "@/components/admin/DraftOrderModal";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import Taka from "@/components/Taka";
import ManualOrderModal from "@/components/admin/ManualOrderModal";
import AdminAnalyticsHeader from "@/components/admin/AdminAnalyticsHeader";
import { useIsMobile } from "@/hooks/use-mobile";

const SUPABASE_URL = "https://ptxenyhuztiaexwdcecl.supabase.co";
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1/admin-orders`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token || ""}`,
  };
}

interface Order {
  id: string;
  product_id: string | null;
  product_title: string;
  variant: string | null;
  quantity: number;
  unit_price: number;
  delivery_charge: number;
  total_amount: number;
  discount: number;
  advance_amount: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_area: string;
  customization_note: string | null;
  image_url: string | null;
  status: string;
  payment_status: string;
  invoice_url: string | null;
  steadfast_consignment_id: string | null;
  steadfast_tracking_code: string | null;
  created_at: string;
  updated_at?: string;
}

interface FraudData {
  status?: boolean;
  message?: string;
  data?: {
    Summaries?: Record<string, {
      logo?: string;
      data_type?: string;
      customer_rating?: string;
      risk_level?: string;
      message?: string;
      total?: number;
      success?: number;
      cancel?: number;
      show_count?: boolean;
    }>;
    totalSummary?: {
      total?: number;
      success?: number;
      cancel?: number;
      successRate?: number;
      cancelRate?: number;
    };
  };
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-800 border-amber-200" },
  confirmed: { label: "Confirmed", icon: CheckCircle, className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  processing: { label: "Processing", icon: Truck, className: "bg-blue-100 text-blue-800 border-blue-200" },
  shipped: { label: "Shipped", icon: Send, className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  completed: { label: "Completed", icon: CheckCircle, className: "bg-green-100 text-green-800 border-green-200" },
  returned: { label: "Returned", icon: XCircle, className: "bg-red-100 text-red-800 border-red-200" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "bg-gray-100 text-gray-800 border-gray-200" },
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "completed", label: "Completed" },
  { value: "returned", label: "Returned" },
  { value: "cancelled", label: "Cancelled" },
  { value: "draft", label: "Auto Save" },
];

type DatePreset = "today" | "yesterday" | "last7" | "custom";

const AdminOrders = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fraudCache, setFraudCache] = useState<Record<string, FraudData>>({});
  const [fraudLoading, setFraudLoading] = useState<Record<string, boolean>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<Order | null>(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [manualOrderOpen, setManualOrderOpen] = useState(false);

  // Load saved filter preferences from DB
  useEffect(() => {
    const loadPrefs = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin"); return; }
      const { data } = await (supabase as any)
        .from("user_settings")
        .select("value")
        .eq("user_id", session.user.id)
        .eq("key", "order_status_filter")
        .maybeSingle();
      if (data?.value && Array.isArray(data.value)) {
        setSelectedStatuses(data.value as string[]);
      }
      setFiltersLoaded(true);
    };
    loadPrefs();
  }, [navigate]);

  // Persist filter preferences to DB
  const saveFilterPrefs = useCallback(async (statuses: string[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await (supabase as any).from("user_settings").upsert(
      { user_id: session.user.id, key: "order_status_filter", value: statuses },
      { onConflict: "user_id,key" }
    );
  }, []);

  const toggleStatus = (value: string) => {
    setSelectedStatuses(prev => {
      const next = prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value];
      saveFilterPrefs(next);
      return next;
    });
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const hasDraftSelected = selectedStatuses.includes("draft");
  const activeNonDraftStatuses = selectedStatuses.filter(s => s !== "draft");
  const onlyDraftSelected = selectedStatuses.length === 1 && selectedStatuses[0] === "draft";

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders", activeNonDraftStatuses, debouncedSearch],
    enabled: filtersLoaded && !onlyDraftSelected,
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`${FUNCTIONS_URL}?${params}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const all: Order[] = await res.json();
      if (activeNonDraftStatuses.length === 0 && !hasDraftSelected) return all;
      if (activeNonDraftStatuses.length === 0) return [];
      return all.filter(o => activeNonDraftStatuses.includes(o.status));
    },
  });

  // Fetch drafts whenever "draft" is part of the selection
  const { data: draftOrders = [], isLoading: draftsLoading } = useQuery<Order[]>({
    queryKey: ["admin-drafts", debouncedSearch],
    enabled: filtersLoaded && hasDraftSelected,
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("status", "draft");
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`${FUNCTIONS_URL}?${params}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch drafts");
      return res.json();
    },
  });

  // Merge orders + drafts, then apply date filter
  const allOrders = useMemo(() => {
    return [...orders, ...draftOrders];
  }, [orders, draftOrders]);

  // Date-filtered orders
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return allOrders.filter((o) => {
      const created = new Date(o.created_at);
      if (datePreset === "today") {
        return isWithinInterval(created, { start: startOfDay(now), end: endOfDay(now) });
      }
      if (datePreset === "yesterday") {
        const y = subDays(now, 1);
        return isWithinInterval(created, { start: startOfDay(y), end: endOfDay(y) });
      }
      if (datePreset === "last7") {
        return isWithinInterval(created, { start: startOfDay(subDays(now, 6)), end: endOfDay(now) });
      }
      if (datePreset === "custom" && customStart && customEnd) {
        return isWithinInterval(created, { start: startOfDay(customStart), end: endOfDay(customEnd) });
      }
      if (datePreset === "custom" && !customStart && !customEnd) {
        return true;
      }
      return true;
    });
  }, [allOrders, datePreset, customStart, customEnd]);

  // Load cached fraud data from customers table, only call API for uncached phones
  const loadFraudDataFromCache = useCallback(async (phones: string[]) => {
    if (phones.length === 0) return;

    // 1. Fetch customer records that already have cached validation data
    const { data: customers } = await supabase
      .from("customers")
      .select("customer_phone, last_validation_data")
      .in("customer_phone", phones);

    const cached: Record<string, FraudData> = {};
    const uncachedPhones: string[] = [];

    for (const phone of phones) {
      if (fraudCache[phone]) continue; // already in memory
      const customer = customers?.find(c => c.customer_phone === phone);
      if (customer?.last_validation_data && typeof customer.last_validation_data === "object") {
        cached[phone] = customer.last_validation_data as unknown as FraudData;
      } else {
        uncachedPhones.push(phone);
      }
    }

    // Apply cached data immediately
    if (Object.keys(cached).length > 0) {
      setFraudCache(prev => ({ ...prev, ...cached }));
    }

    // 2. Only call API for phones without cached data
    for (const phone of uncachedPhones) {
      if (fraudLoading[phone]) continue;
      setFraudLoading(prev => ({ ...prev, [phone]: true }));
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${FUNCTIONS_URL}?action=fraud-check`, {
          method: "POST",
          headers,
          body: JSON.stringify({ phone }),
        });
        const data = await res.json() as FraudData;
        setFraudCache(prev => ({ ...prev, [phone]: data }));

        // Save to customers table for future caching
        await supabase
          .from("customers")
          .update({ last_validation_data: data as any })
          .eq("customer_phone", phone);
      } catch {
        setFraudCache(prev => ({ ...prev, [phone]: { status: false } as FraudData }));
      } finally {
        setFraudLoading(prev => ({ ...prev, [phone]: false }));
      }
    }
  }, [fraudCache, fraudLoading]);

  useEffect(() => {
    const phones = [...new Set(orders.map((o) => o.customer_phone))];
    const newPhones = phones.filter(p => !fraudCache[p] && !fraudLoading[p]);
    if (newPhones.length > 0) loadFraudDataFromCache(newPhones);
  }, [orders]); // eslint-disable-line react-hooks/exhaustive-deps

  const steadfastMutation = useMutation({
    mutationFn: async (order: Order) => {
      const headers = await getAuthHeaders();
      const codAmount = order.total_amount;
      const res = await fetch(`${FUNCTIONS_URL}?action=steadfast`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          orderId: order.id,
          recipientName: order.customer_name,
          recipientPhone: order.customer_phone,
          recipientAddress: order.customer_address,
          codAmount,
          note: order.customization_note || "",
        }),
      });
      const data = await res.json();
      if (data.status !== 200) throw new Error(data.message || "Steadfast API error");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Sent to Steadfast!", description: `Tracking: ${data.consignment?.tracking_code || "N/A"}` });
    },
    onError: (err: Error) => {
      toast({ title: "Steadfast Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      const headers = await getAuthHeaders();
      const res = await fetch(FUNCTIONS_URL, {
        method: "PUT",
        headers,
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Order updated" });
    },
  });

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const statusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
      <Badge className={`text-xs gap-1 border ${cfg.className}`}>
        <Icon size={10} /> {cfg.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <AdminSidebar activePage="orders" />
      </div>

      {/* Main Content */}
      <main className={cn("p-4 md:p-8 pb-20 md:pb-8", !isMobile && "ml-64")}>
        <AdminAnalyticsHeader />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Orders</h2>
            <p className="text-sm text-muted-foreground">{filteredOrders.length} orders</p>
          </div>
          <Button onClick={() => setManualOrderOpen(true)} className="gap-2">
            <Plus size={16} /> Manual Order
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Filter */}
            <Select value={datePreset} onValueChange={(v) => { setDatePreset(v as DatePreset); if (v !== "custom") { setCustomStart(undefined); setCustomEnd(undefined); } }}>
              <SelectTrigger className="h-9 w-[140px] text-xs bg-background">
                <CalendarIcon size={12} className="mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7">Last 7 Days</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>

            {datePreset === "custom" && (
              <div className="flex items-center gap-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-1.5 font-normal", !customStart && "text-muted-foreground")}>
                      <CalendarIcon size={12} />
                      {customStart ? format(customStart, "MMM d") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                    <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-1.5 font-normal", !customEnd && "text-muted-foreground")}>
                      <CalendarIcon size={12} />
                      {customEnd ? format(customEnd, "MMM d") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                    <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Status Multi-Select Dropdown */}
            <Popover open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 font-normal min-w-[160px] justify-between">
                  <div className="flex items-center gap-1.5">
                    <Filter size={12} className="text-muted-foreground" />
                    {selectedStatuses.length === 0
                      ? "All Statuses"
                      : selectedStatuses.length === 1
                        ? STATUS_OPTIONS.find(s => s.value === selectedStatuses[0])?.label || selectedStatuses[0]
                        : `${selectedStatuses.length} selected`}
                  </div>
                  <ChevronDown size={12} className="text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-2 bg-popover z-50" align="start">
                <div className="space-y-0.5">
                  {STATUS_OPTIONS.map(opt => {
                    const isSelected = selectedStatuses.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleStatus(opt.value)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-colors",
                          isSelected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary" : "border-border"
                        )}>
                          {isSelected && <Check size={10} className="text-primary-foreground" />}
                        </div>
                        {opt.label}
                      </button>
                    );
                  })}
                  {selectedStatuses.length > 0 && (
                    <button
                      onClick={() => { setSelectedStatuses([]); saveFilterPrefs([]); }}
                      className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground pt-2 border-t border-border mt-1"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
          </div>

          {/* Selected status badges */}
          {selectedStatuses.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedStatuses.map(s => {
                const opt = STATUS_OPTIONS.find(o => o.value === s);
                const cfg = STATUS_CONFIG[s];
                return (
                  <Badge
                    key={s}
                    className={cn("text-[10px] gap-1 cursor-pointer border", cfg?.className || "bg-muted text-foreground")}
                    onClick={() => toggleStatus(s)}
                  >
                    {opt?.label || s}
                    <XCircle size={10} />
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {(isLoading || draftsLoading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <CalendarIcon size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No orders found for this period</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting the date or status filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const isDraft = order.status === "draft";
              const cfg = STATUS_CONFIG[order.status] || (isDraft
                ? { label: "Auto Save", icon: FilePen, className: "bg-muted text-muted-foreground border-border" }
                : STATUS_CONFIG.pending);
              const StatusIcon = cfg.icon;

              const paymentBadgeClass =
                order.payment_status === "paid" ? "bg-green-100 text-green-800 border-green-200" :
                order.payment_status === "advance_paid" ? "bg-sky-100 text-sky-800 border-sky-200" :
                order.payment_status === "cod" ? "bg-amber-100 text-amber-800 border-amber-200" :
                order.payment_status === "processing" ? "bg-purple-100 text-purple-800 border-purple-200" :
                order.payment_status === "failed" ? "bg-red-100 text-red-800 border-red-200" :
                order.payment_status === "partially_paid" ? "bg-amber-100 text-amber-800 border-amber-200" :
                "bg-gray-100 text-gray-600 border-gray-200";

              const paymentLabel =
                order.payment_status === "paid" ? "Paid" :
                order.payment_status === "advance_paid" ? "30% Paid" :
                order.payment_status === "cod" ? "COD" :
                order.payment_status === "processing" ? "Processing" :
                order.payment_status === "failed" ? "Failed" :
                order.payment_status === "partially_paid" ? "Partial" : "Unpaid";

              const handleView = isDraft
                ? () => { setSelectedDraft(order); setDraftModalOpen(true); }
                : () => openOrder(order);

              return (
                <div key={order.id}>
                  {/* ===== DESKTOP ROW ===== */}
                  <div className="hidden md:flex bg-card rounded-xl border border-border px-5 py-4 hover:shadow-sm transition-shadow items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-serif font-semibold text-sm text-foreground truncate">{order.customer_name}</p>
                          {(() => {
                            const fd = fraudCache[order.customer_phone];
                            const loading = fraudLoading[order.customer_phone];
                            if (loading) return <Loader2 size={10} className="animate-spin text-muted-foreground" />;
                            const rate = fd?.data?.totalSummary?.successRate;
                            if (rate == null) return null;
                            const color = rate >= 70 ? "bg-green-100 text-green-700 border-green-200" : rate >= 40 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-red-100 text-red-700 border-red-200";
                            return <span className={`text-[10px] font-num font-semibold px-1.5 py-0.5 rounded border ${color}`}>{rate.toFixed(0)}%</span>;
                          })()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(order.created_at).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-xs gap-1 border ${cfg.className}`}>
                        <StatusIcon size={10} /> {cfg.label}
                      </Badge>
                      {!isDraft && (
                        <Badge className={`text-[10px] border ${paymentBadgeClass}`}>
                          <CreditCard size={9} className="mr-0.5" />
                          {paymentLabel}
                        </Badge>
                      )}

                      {order.steadfast_consignment_id && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://steadfast.com.bd/t/${order.steadfast_tracking_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            CN: {order.steadfast_consignment_id}
                          </a>
                          <button
                            className="text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(order.steadfast_consignment_id!);
                              toast({ title: "Consignment ID copied!" });
                            }}
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      )}

                      {!isDraft && !order.steadfast_tracking_code && ["confirmed", "processing"].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 gap-1"
                          disabled={steadfastMutation.isPending}
                          onClick={(e) => { e.stopPropagation(); steadfastMutation.mutate(order); }}
                        >
                          {steadfastMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Truck size={12} />}
                          Steadfast
                        </Button>
                      )}

                      {!isDraft && !["pending", "cancelled"].includes(order.status) ? (
                        <a href={`/i/${order.id.substring(0, 8)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="text-xs h-8 gap-1 text-emerald-700 hover:text-emerald-800">
                            <FileText size={14} /> Invoice
                          </Button>
                        </a>
                      ) : !isDraft ? (
                        <span className="text-[10px] text-muted-foreground px-2">N/A</span>
                      ) : null}

                      <Button size="sm" variant="ghost" className="text-xs h-8 gap-1" onClick={handleView}>
                        <Eye size={14} /> View
                      </Button>
                    </div>
                  </div>

                  {/* ===== MOBILE CARD ===== */}
                  <div
                    className="md:hidden bg-card rounded-xl border border-border p-4 shadow-sm active:shadow-none transition-shadow"
                    onClick={handleView}
                  >
                    {/* Header: ID + Date */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] font-mono text-muted-foreground">#{order.id.substring(0, 8)}</span>
                      <span className="text-[10px] font-num text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("en-BD", { dateStyle: "medium" })}
                      </span>
                    </div>

                    {/* Customer */}
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-serif font-semibold text-sm text-foreground truncate">{order.customer_name}</p>
                      {(() => {
                        const fd = fraudCache[order.customer_phone];
                        const loading = fraudLoading[order.customer_phone];
                        if (loading) return <Loader2 size={10} className="animate-spin text-muted-foreground" />;
                        const rate = fd?.data?.totalSummary?.successRate;
                        if (rate == null) return null;
                        const color = rate >= 70 ? "bg-green-100 text-green-700 border-green-200" : rate >= 40 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-red-100 text-red-700 border-red-200";
                        return <span className={`text-[10px] font-num font-semibold px-1.5 py-0.5 rounded border ${color}`}>{rate.toFixed(0)}%</span>;
                      })()}
                    </div>
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="text-xs text-muted-foreground flex items-center gap-1 mb-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone size={11} /> {order.customer_phone}
                    </a>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge className={`text-[10px] gap-1 border ${cfg.className}`}>
                        <StatusIcon size={9} /> {cfg.label}
                      </Badge>
                      {!isDraft && (
                        <Badge className={`text-[10px] border ${paymentBadgeClass}`}>
                          <CreditCard size={9} className="mr-0.5" /> {paymentLabel}
                        </Badge>
                      )}
                      {order.steadfast_consignment_id && (
                        <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                          <Truck size={9} /> CN: {order.steadfast_consignment_id}
                        </Badge>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="mb-3">
                      <Taka amount={order.total_amount} className="text-sm font-bold" />
                    </div>

                    {/* Actions - always includes View button */}
                    <div className="flex items-center gap-2 border-t border-border pt-3">
                      {!isDraft && !order.steadfast_tracking_code && ["confirmed", "processing"].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 gap-1 flex-1"
                          disabled={steadfastMutation.isPending}
                          onClick={(e) => { e.stopPropagation(); steadfastMutation.mutate(order); }}
                        >
                          {steadfastMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Truck size={12} />}
                          Steadfast
                        </Button>
                      )}

                      {!isDraft && !["pending", "cancelled"].includes(order.status) && (
                        <a
                          href={`/i/${order.id.substring(0, 8)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1"
                        >
                          <Button size="sm" variant="outline" className="text-xs h-8 gap-1 w-full text-emerald-700 border-emerald-200">
                            <FileText size={12} /> Invoice
                          </Button>
                        </a>
                      )}

                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs h-8 gap-1 flex-1"
                        onClick={(e) => { e.stopPropagation(); handleView(); }}
                      >
                        <Eye size={12} /> View
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        open={modalOpen}
        onOpenChange={setModalOpen}
        fraudData={selectedOrder ? fraudCache[selectedOrder.customer_phone] : undefined}
        fraudLoading={selectedOrder ? !!fraudLoading[selectedOrder.customer_phone] : false}
        onSendSteadfast={(o) => steadfastMutation.mutate(o)}
        steadfastPending={steadfastMutation.isPending}
        onUpdateOrder={(params) => updateMutation.mutate(params)}
        updatePending={updateMutation.isPending}
      />

      {/* Draft Detail Modal */}
      <DraftOrderModal
        order={selectedDraft}
        open={draftModalOpen}
        onOpenChange={setDraftModalOpen}
      />
      {/* Manual Order Modal */}
      <ManualOrderModal open={manualOrderOpen} onOpenChange={setManualOrderOpen} />
      {isMobile && <AdminBottomNav />}
    </div>
  );
};

export default AdminOrders;
