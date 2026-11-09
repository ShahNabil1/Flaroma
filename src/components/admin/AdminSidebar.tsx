import { useNavigate } from "react-router-dom";
import {
  Package, ShoppingBag, Users, Truck, Star, Globe, ChevronLeft, LogOut, Shield, Ticket, Mail, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";

interface AdminSidebarProps {
  activePage: string;
}

const NAV_ITEMS = [
  { key: "products", label: "Products", icon: Package, path: "/admin/dashboard" },
  { key: "orders", label: "Orders", icon: ShoppingBag, path: "/admin/orders" },
  { key: "coupons", label: "Coupons", icon: Ticket, path: "/admin/coupons" },
  { key: "email", label: "Email", icon: Mail, path: "/admin/email" },
  { key: "customers", label: "Customers", icon: Users, path: "/admin/customers" },
  { key: "steadfast", label: "Steadfast", icon: Truck, path: "/admin/steadfast" },
  { key: "reviews", label: "Reviews", icon: Star, path: "/admin/reviews" },
  { key: "website", label: "Website", icon: Globe, path: "/admin/website" },
  { key: "users", label: "Users", icon: Shield, path: "/admin/users" },
  { key: "analytics", label: "Analytics & Tracking", icon: BarChart3, path: "/admin/analytics" },
];

const AdminSidebar = ({ activePage }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const { data: perms } = useAdminPermissions();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  // Map nav keys to permission keys
  const getPermKey = (key: string) => {
    return key;
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground p-6 flex flex-col z-50">
      <h1 className="text-xl font-serif font-bold text-sidebar-primary mb-1">Flaroma</h1>
      <p className="text-xs text-sidebar-foreground/60 mb-8">Admin Dashboard</p>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const permKey = getPermKey(item.key);
          // If permissions loaded and user doesn't have access, hide the item
          if (perms && perms.role !== "owner" && !perms.permissions[permKey]) return null;

          const isActive = activePage === item.key;
          const Icon = item.icon;

          if (isActive) {
            return (
              <div
                key={item.key}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium"
              >
                <Icon size={18} />
                {item.label}
              </div>
            );
          }

          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm font-medium w-full text-left transition-colors"
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 pt-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={() => navigate("/")}
        >
          <ChevronLeft size={16} className="mr-2" /> Back to site
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={logout}
        >
          <LogOut size={16} className="mr-2" /> Logout
        </Button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
