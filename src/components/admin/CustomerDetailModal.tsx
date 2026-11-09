import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, Phone, MapPin, ExternalLink, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Taka from "@/components/Taka";
import { supabase } from "@/integrations/supabase/client";

interface Customer {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_orders: number;
  total_success: number;
  total_cancel: number;
  success_rate: number | null;
  created_at: string;
}

interface Order {
  id: string;
  product_title: string;
  variant: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  created_at: string;
  customer_address: string;
}

interface ParsedItem {
  title: string;
  variant: string | null;
  quantity: number;
  unitPrice: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-indigo-100 text-indigo-800 border-indigo-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  returned: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

function parseOrderItems(order: Order): ParsedItem[] {
  if (order.variant) {
    try {
      const parsed = JSON.parse(order.variant);
      if (parsed?.__items && Array.isArray(parsed.__items)) {
        return parsed.__items.map((item: Record<string, unknown>) => ({
          title: String(item.title || order.product_title),
          variant: item.variant ? String(item.variant) : null,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
        }));
      }
      // Single variant as JSON object — format as string
      const variantStr = Object.entries(parsed)
        .filter(([k]) => k !== "__items")
        .map(([, v]) => String(v))
        .join(", ");
      return [{
        title: order.product_title,
        variant: variantStr || null,
        quantity: order.quantity,
        unitPrice: order.unit_price,
      }];
    } catch {
      // variant is a plain string
      return [{
        title: order.product_title,
        variant: order.variant,
        quantity: order.quantity,
        unitPrice: order.unit_price,
      }];
    }
  }
  return [{
    title: order.product_title,
    variant: null,
    quantity: order.quantity,
    unitPrice: order.unit_price,
  }];
}

interface Props {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CustomerDetailModal = ({ customer, open, onOpenChange }: Props) => {
  const navigate = useNavigate();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["customer-orders", customer?.customer_phone],
    enabled: !!customer && open,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const url = new URL("https://ptxenyhuztiaexwdcecl.supabase.co/functions/v1/admin-orders");
      url.searchParams.set("search", customer!.customer_phone);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0eGVueWh1enRpYWV4d2RjZWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjIxNDcsImV4cCI6MjA4NjI5ODE0N30.1dIEhu8tt9nRd96uVQHVEptfl6bjpi0t13Wn4AeCXJE",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
  });

  const primaryAddress = orders.length > 0 ? orders[0].customer_address : null;

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-background">
        <DialogHeader className="pb-0">
          <DialogTitle className="text-xl font-serif flex items-center gap-2">
            <User size={18} className="text-primary" />
            {customer.customer_name}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1.5 pt-2">
              <p className="flex items-center gap-2 text-sm text-foreground">
                <Phone size={13} className="text-muted-foreground shrink-0" />
                <span className="font-mono font-medium">{customer.customer_phone}</span>
              </p>
              {primaryAddress && (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin size={13} className="shrink-0 mt-0.5" />
                  <span>{primaryAddress}</span>
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-2xl font-num font-semibold text-foreground">{customer.total_orders}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-2xl font-num font-semibold text-foreground">{customer.total_success}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-2xl font-num font-semibold text-foreground">{customer.total_cancel}</p>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </div>
        </div>

        {/* Order history */}
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Order History
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 bg-muted/20 rounded-lg">
              <Package size={32} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No order history found for this customer.</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Order ID</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Date & Time</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Purchased Items</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Total</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
                    const items = parseOrderItems(order);

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors align-top"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/admin/orders?highlight=${order.id}`);
                        }}
                      >
                        <td className="p-3">
                          <span className="font-mono text-xs text-primary inline-flex items-center gap-1 hover:underline">
                            FLA-{order.id.substring(0, 8).toUpperCase()}
                            <ExternalLink size={10} />
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground font-num text-xs whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString("en-BD", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          <br />
                          <span className="text-muted-foreground/70">
                            {new Date(order.created_at).toLocaleTimeString("en-BD", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1.5">
                            {items.map((item, idx) => (
                              <div key={idx} className={idx > 0 ? "pt-1.5 border-t border-border/50" : ""}>
                                <p className="text-sm font-medium text-foreground leading-tight">
                                  {item.title}
                                  <span className="text-muted-foreground font-num ml-1.5">× {item.quantity}</span>
                                </p>
                                {item.variant && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{item.variant}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Taka amount={order.total_amount} className="text-sm font-medium" />
                        </td>
                        <td className="p-3">
                          <Badge className={`text-xs border capitalize ${statusStyle}`}>
                            {order.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailModal;
