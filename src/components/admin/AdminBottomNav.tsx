import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, Ticket, Star, Users } from "lucide-react";
import { motion } from "framer-motion";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { key: "orders", label: "Orders", icon: ShoppingBag, path: "/admin/orders" },
  { key: "coupons", label: "Coupons", icon: Ticket, path: "/admin/coupons" },
  { key: "reviews", label: "Reviews", icon: Star, path: "/admin/reviews" },
  { key: "users", label: "Users", icon: Users, path: "/admin/users" },
];

const AdminBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey = TABS.find((t) => location.pathname === t.path)?.key || "dashboard";

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border"
    >
      <div className="grid grid-cols-5 py-2 px-1">
        {TABS.map((tab) => {
          const isActive = activeKey === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="admin-tab-indicator"
                  className="absolute -top-0.5 left-0 right-0 mx-auto w-8 h-0.5 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                size={18}
                className={isActive ? "text-accent" : "text-muted-foreground"}
              />
              <span
                className={`text-[9px] font-medium ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default AdminBottomNav;
