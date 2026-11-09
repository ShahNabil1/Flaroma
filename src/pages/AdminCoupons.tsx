import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Ticket, Loader2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import AdminAnalyticsHeader from "@/components/admin/AdminAnalyticsHeader";
import Taka from "@/components/Taka";
import { useIsMobile } from "@/hooks/use-mobile";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  usage_limit: number;
  used_count: number;
  product_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface Product {
  id: string;
  title: string;
}

const AdminCoupons = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [minOrder, setMinOrder] = useState(0);
  const [usageLimit, setUsageLimit] = useState(0);
  const [productId, setProductId] = useState<string>("none");
  const [isActive, setIsActive] = useState(true);

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(
        "https://ptxenyhuztiaexwdcecl.supabase.co/functions/v1/admin-orders?action=coupons",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch coupons");
      return res.json();
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, title").order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (coupon: Partial<Coupon>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(
        "https://ptxenyhuztiaexwdcecl.supabase.co/functions/v1/admin-orders?action=save-coupon",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(coupon),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to save coupon");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: editing ? "Coupon updated" : "Coupon created" });
      closeModal();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(
        "https://ptxenyhuztiaexwdcecl.supabase.co/functions/v1/admin-orders?action=delete-coupon",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ id }),
        }
      );
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Coupon deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(
        "https://ptxenyhuztiaexwdcecl.supabase.co/functions/v1/admin-orders?action=save-coupon",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ id, is_active }),
        }
      );
      if (!res.ok) throw new Error("Failed to toggle");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setDiscountType("fixed");
    setDiscountValue(0);
    setMinOrder(0);
    setUsageLimit(0);
    setProductId("none");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setCode(c.code);
    setDiscountType(c.discount_type as "fixed" | "percentage");
    setDiscountValue(c.discount_value);
    setMinOrder(c.min_order_amount);
    setUsageLimit(c.usage_limit);
    setProductId(c.product_id || "none");
    setIsActive(c.is_active);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = () => {
    if (!code.trim()) {
      toast({ title: "Coupon code is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      ...(editing ? { id: editing.id } : {}),
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: discountValue,
      min_order_amount: minOrder,
      usage_limit: usageLimit,
      product_id: productId === "none" ? null : productId,
      is_active: isActive,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <AdminSidebar activePage="coupons" />}

      <main className={isMobile ? "px-4 pt-4 pb-24" : "ml-64 p-8"}>
        <AdminAnalyticsHeader />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground">Coupons</h2>
            <p className="text-xs md:text-sm text-muted-foreground">{coupons.length} coupons</p>
          </div>
          <Button onClick={openCreate} className="gap-2" size={isMobile ? "sm" : "default"}>
            <Plus size={16} /> Create
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-20">
            <Ticket size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No coupons yet</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground text-xs">Code</th>
                    <th className="text-left p-4 font-medium text-muted-foreground text-xs">Discount</th>
                    <th className="text-left p-4 font-medium text-muted-foreground text-xs">Min Order</th>
                    <th className="text-left p-4 font-medium text-muted-foreground text-xs">Usage</th>
                    <th className="text-left p-4 font-medium text-muted-foreground text-xs">Product</th>
                    <th className="text-left p-4 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="text-right p-4 font-medium text-muted-foreground text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => {
                    const product = products.find((p) => p.id === c.product_id);
                    return (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <span className="font-mono font-bold text-foreground tracking-wider">{c.code}</span>
                        </td>
                        <td className="p-4">
                          {c.discount_type === "percentage" ? (
                            <span className="font-num font-semibold text-foreground">{c.discount_value}%</span>
                          ) : (
                            <Taka amount={c.discount_value} className="font-semibold" />
                          )}
                        </td>
                        <td className="p-4">
                          {c.min_order_amount > 0 ? <Taka amount={c.min_order_amount} className="text-muted-foreground" /> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-4">
                          <span className="font-num text-foreground">{c.used_count}</span>
                          <span className="text-muted-foreground">/{c.usage_limit || "∞"}</span>
                        </td>
                        <td className="p-4">
                          {product ? (
                            <span className="text-xs text-foreground truncate block max-w-[150px]">{product.title}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">All products</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Switch
                            checked={c.is_active}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, is_active: checked })}
                          />
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(c)}>
                              <Pencil size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("Delete this coupon?")) deleteMutation.mutate(c.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {coupons.map((c) => {
                const product = products.find((p) => p.id === c.product_id);
                return (
                  <div key={c.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono font-bold text-foreground tracking-wider text-sm">{c.code}</span>
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, is_active: checked })}
                      />
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {c.discount_type === "percentage" ? `${c.discount_value}% off` : `৳${c.discount_value} off`}
                      </Badge>
                      {c.min_order_amount > 0 && (
                        <span className="text-[10px] text-muted-foreground">Min: ৳{c.min_order_amount}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        Used: {c.used_count}/{c.usage_limit || "∞"}
                      </span>
                    </div>
                    {product && (
                      <p className="text-[11px] text-muted-foreground mb-3 truncate">Product: {product.title}</p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openEdit(c)}>
                        <Pencil size={12} className="mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-destructive border-destructive/30"
                        onClick={() => {
                          if (confirm("Delete this coupon?")) deleteMutation.mutate(c.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {isMobile && <AdminBottomNav />}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update coupon details" : "Set up a new discount coupon"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Coupon Code *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. FLAROMA10"
                className="font-mono tracking-wider"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "fixed" | "percentage")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="fixed">Fixed (৳)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value</Label>
                <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} min={0} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min Order Amount</Label>
                <Input type="number" value={minOrder} onChange={(e) => setMinOrder(Number(e.target.value))} min={0} />
              </div>
              <div className="space-y-2">
                <Label>Usage Limit (0 = unlimited)</Label>
                <Input type="number" value={usageLimit} onChange={(e) => setUsageLimit(Number(e.target.value))} min={0} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Linked Product (optional)</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="All products" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">All Products</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full gap-2">
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />}
              {editing ? "Update Coupon" : "Create Coupon"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
