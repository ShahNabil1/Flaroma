import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck, Loader2,
  RefreshCw, RotateCcw, ExternalLink, Clock,
  CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff, Activity,
  Shield, Zap, Copy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAnalyticsHeader from "@/components/admin/AdminAnalyticsHeader";

const SUPABASE_URL = "https://ptxenyhuztiaexwdcecl.supabase.co";
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1/admin-orders`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token || ""}`,
  };
}

const SF_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  in_review: { label: "In Review", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  delivered_approval_pending: { label: "Delivered (Pending)", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: Clock },
  partial_delivered: { label: "Partial Delivered", color: "bg-teal-100 text-teal-800 border-teal-200", icon: CheckCircle },
  partial_delivered_approval_pending: { label: "Partial (Pending)", color: "bg-teal-100 text-teal-800 border-teal-200", icon: Clock },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  cancelled_approval_pending: { label: "Cancel (Pending)", color: "bg-red-100 text-red-800 border-red-200", icon: Clock },
  hold: { label: "On Hold", color: "bg-orange-100 text-orange-800 border-orange-200", icon: AlertTriangle },
  unknown: { label: "Unknown", color: "bg-gray-100 text-gray-800 border-gray-200", icon: AlertTriangle },
};

interface SteadfastOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  product_title: string;
  total_amount: number;
  steadfast_consignment_id: string | null;
  steadfast_tracking_code: string | null;
  steadfast_status: string | null;
  status: string;
  created_at: string;
}

interface ConnectionTestResult {
  api_keys_configured: boolean;
  api_status: string;
  api_message: string;
  api_http_status?: number;
  balance?: { current_balance?: number; };
  webhook_status: string;
  webhook_url: string;
  webhook_message: string;
  timestamp: string;
}

/* ─── Connection Status Panel ─── */
const ConnectionStatusPanel = () => {
  const { data, isLoading, refetch, isFetching } = useQuery<ConnectionTestResult>({
    queryKey: ["sf-connection-test"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTIONS_URL}?action=sf-connection-test`, { headers });
      if (!res.ok) throw new Error("Failed to test connection");
      return res.json();
    },
    refetchInterval: 60000, // auto-refresh every 60s
  });

  const apiOk = data?.api_status === "connected";
  const webhookOk = data?.webhook_status === "active";
  const allOk = apiOk && webhookOk;

  return (
    <div className="bg-card rounded-xl border border-border p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">API Connection Status</h3>
          {!isLoading && data && (
            <Badge className={`text-[10px] border ${allOk ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}`}>
              {allOk ? "All Systems Active" : "Issues Detected"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[10px] text-muted-foreground">
              Last checked: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-3 bg-muted rounded w-32" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* API Keys */}
          <div className={`rounded-lg border p-4 ${data.api_keys_configured ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className={data.api_keys_configured ? "text-green-600" : "text-red-600"} />
              <span className="text-xs font-semibold text-foreground">API Keys</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {data.api_keys_configured ? "Configured & active" : "Not configured — add STEADFAST_API_KEY & STEADFAST_SECRET_KEY"}
            </p>
          </div>

          {/* API Connection */}
          <div className={`rounded-lg border p-4 ${apiOk ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
            <div className="flex items-center gap-2 mb-1">
              {apiOk ? <Wifi size={14} className="text-green-600" /> : <WifiOff size={14} className="text-red-600" />}
              <span className="text-xs font-semibold text-foreground">Steadfast API</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{data.api_message}</p>
            {apiOk && data.balance?.current_balance !== undefined && (
              <p className="text-xs font-semibold text-foreground mt-1">Balance: ৳{data.balance.current_balance}</p>
            )}
          </div>

          {/* Webhook */}
          <div className={`rounded-lg border p-4 ${webhookOk ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className={webhookOk ? "text-green-600" : "text-red-600"} />
              <span className="text-xs font-semibold text-foreground">Webhook</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{data.webhook_message}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

/* ─── Main Page ─── */
const AdminSteadfast = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<SteadfastOrder | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/admin");
    };
    check();
  }, [navigate]);

  // Fetch Steadfast balance
  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ["sf-balance"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTIONS_URL}?action=sf-balance`, { headers });
      if (!res.ok) throw new Error("Failed to fetch balance");
      return res.json();
    },
  });

  // Fetch orders with Steadfast consignments
  const { data: orders = [], isLoading: ordersLoading } = useQuery<SteadfastOrder[]>({
    queryKey: ["sf-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, customer_address, product_title, total_amount, steadfast_consignment_id, steadfast_tracking_code, steadfast_status, status, created_at")
        .not("steadfast_consignment_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SteadfastOrder[];
    },
  });

  // Refresh status for a single consignment
  const refreshStatusMutation = useMutation({
    mutationFn: async (order: SteadfastOrder) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTIONS_URL}?action=sf-status&cid=${order.steadfast_consignment_id}`, { headers });
      if (!res.ok) throw new Error("Failed to check status");
      const data = await res.json();

      if (data.delivery_status) {
        await supabase
          .from("orders")
          .update({ steadfast_status: data.delivery_status })
          .eq("id", order.id);
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sf-orders"] });
      toast({ title: "Status refreshed", description: `Delivery: ${data.delivery_status || "N/A"}` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Return request
  const returnMutation = useMutation({
    mutationFn: async ({ consignment_id, reason }: { consignment_id: string; reason: string }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTIONS_URL}?action=sf-return`, {
        method: "POST",
        headers,
        body: JSON.stringify({ consignment_id, reason }),
      });
      if (!res.ok) throw new Error("Failed to create return request");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Return request created" });
      setReturnDialogOpen(false);
      setReturnReason("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "all") return true;
    return o.steadfast_status === statusFilter;
  });

  const statusCounts = orders.reduce((acc, o) => {
    const s = o.steadfast_status || "unknown";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const webhookUrl = `${SUPABASE_URL}/functions/v1/steadfast-webhook`;

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar activePage="steadfast" />

      {/* Main Content */}
      <main className="ml-64 p-8">
        <AdminAnalyticsHeader />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Steadfast Courier</h2>
            <p className="text-sm text-muted-foreground">{orders.length} consignments tracked</p>
          </div>
        </div>

        {/* Connection Status Panel */}
        <ConnectionStatusPanel />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Balance</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetchBalance()} disabled={balanceLoading}>
                <RefreshCw size={14} className={balanceLoading ? "animate-spin" : ""} />
              </Button>
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">
              {balanceLoading ? "..." : `৳${balanceData?.current_balance ?? "N/A"}`}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Delivered</span>
            <p className="text-2xl font-serif font-bold text-green-700 mt-2">
              {(statusCounts["delivered"] || 0) + (statusCounts["partial_delivered"] || 0)}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">In Transit</span>
            <p className="text-2xl font-serif font-bold text-blue-700 mt-2">
              {(statusCounts["pending"] || 0) + (statusCounts["in_review"] || 0) + (statusCounts["hold"] || 0)}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cancelled</span>
            <p className="text-2xl font-serif font-bold text-red-700 mt-2">
              {statusCounts["cancelled"] || 0}
            </p>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Webhook URL</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Set this URL in your Steadfast dashboard → API → Update Webhook Info to receive automatic delivery status updates.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-xs text-foreground font-mono break-all select-all">
              {webhookUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="text-xs shrink-0 gap-1"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                toast({ title: "Copied!" });
              }}
            >
              <Copy size={12} /> Copy
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 mb-6 overflow-x-auto">
          {[
            { value: "all", label: "All" },
            { value: "in_review", label: "In Review" },
            { value: "pending", label: "Pending" },
            { value: "delivered", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
            { value: "hold", label: "On Hold" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.value !== "all" && statusCounts[tab.value] ? ` (${statusCounts[tab.value]})` : ""}
            </button>
          ))}
        </div>

        {/* Consignment List */}
        {ordersLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <Truck size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No consignments found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => {
              const sfCfg = SF_STATUS_CONFIG[order.steadfast_status || "unknown"] || SF_STATUS_CONFIG.unknown;
              const SfIcon = sfCfg.icon;
              return (
                <div key={order.id} className="bg-card rounded-xl border border-border px-5 py-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-serif font-semibold text-sm text-foreground truncate">{order.customer_name}</p>
                        <Badge className={`text-[10px] gap-1 border ${sfCfg.color}`}>
                          <SfIcon size={10} /> {sfCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{order.product_title}</span>
                        <span>৳{order.total_amount}</span>
                        {order.steadfast_tracking_code && (
                          <span className="font-mono">Track: {order.steadfast_tracking_code}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" disabled={refreshStatusMutation.isPending} onClick={() => refreshStatusMutation.mutate(order)}>
                        <RefreshCw size={12} className={refreshStatusMutation.isPending ? "animate-spin" : ""} /> Refresh
                      </Button>
                      {order.steadfast_tracking_code && (
                        <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" asChild>
                          <a href={`https://steadfast.com.bd/t/${order.steadfast_tracking_code}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={12} /> Track
                          </a>
                        </Button>
                      )}
                      {order.steadfast_consignment_id && !["delivered", "cancelled"].includes(order.steadfast_status || "") && (
                        <Button variant="outline" size="sm" className="text-xs h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setReturnTarget(order); setReturnDialogOpen(true); }}>
                          <RotateCcw size={12} /> Return
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Return Request Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Request Return</DialogTitle>
            <DialogDescription>
              Create a return request for {returnTarget?.customer_name}'s order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Consignment ID</p>
              <p className="text-sm font-mono text-foreground">{returnTarget?.steadfast_consignment_id}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reason (optional)</label>
              <Input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="e.g. Customer requested cancellation" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
              <Button className="gap-1" disabled={returnMutation.isPending} onClick={() => { if (returnTarget?.steadfast_consignment_id) { returnMutation.mutate({ consignment_id: returnTarget.steadfast_consignment_id, reason: returnReason }); } }}>
                {returnMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Submit Return
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSteadfast;
