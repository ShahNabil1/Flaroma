import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Search, Loader2, Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import CustomerDetailModal from "@/components/admin/CustomerDetailModal";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAnalyticsHeader from "@/components/admin/AdminAnalyticsHeader";

interface Customer {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  total_orders: number;
  total_success: number;
  total_cancel: number;
  success_rate: number | null;
  created_at: string;
}

const AdminCustomers = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/admin");
    };
    check();
  }, [navigate]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["admin-customers", debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("id, customer_name, customer_phone, status, total_orders, total_success, total_cancel, success_rate, created_at")
        .order("created_at", { ascending: false });

      if (debouncedSearch) {
        query = query.or(`customer_name.ilike.%${debouncedSearch}%,customer_phone.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar activePage="customers" />

      {/* Main Content */}
      <main className="ml-64 p-8">
        <AdminAnalyticsHeader />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Customers</h2>
            <p className="text-sm text-muted-foreground">{customers.length} customers</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20">
            <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No customers found</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Orders</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Success Rate</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-foreground">{c.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("en-BD", { dateStyle: "medium" })}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-foreground">{c.customer_phone}</span>
                    </td>
                    <td className="p-4">
                      <Badge className={`text-xs border ${
                        c.status === "active"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}>
                        {c.status === "active" ? "Active" : "Lead"}
                      </Badge>
                    </td>
                    <td className="p-4 font-num">
                      <span className="text-foreground">{c.total_orders}</span>
                      <span className="text-muted-foreground text-xs ml-1">
                        ({c.total_success}✓ / {c.total_cancel}✗)
                      </span>
                    </td>
                    <td className="p-4 font-num">
                      {c.success_rate !== null ? `${Math.round(c.success_rate)}%` : "—"}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <Eye size={12} />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <CustomerDetailModal
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onOpenChange={(open) => { if (!open) setSelectedCustomer(null); }}
      />
    </div>
  );
};

export default AdminCustomers;
