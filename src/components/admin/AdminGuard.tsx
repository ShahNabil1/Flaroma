import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldX, ChevronLeft, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { supabase } from "@/integrations/supabase/client";

interface AdminGuardProps {
  /** The permission key required for this page (e.g. "products", "orders") */
  permissionKey: string;
  children: React.ReactNode;
}

const AdminGuard = ({ permissionKey, children }: AdminGuardProps) => {
  const navigate = useNavigate();
  const { data: perms, isLoading } = useAdminPermissions();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/admin");
    };
    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  // Not an admin at all
  if (!perms) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <NoAccessView onBack={() => navigate("/admin")} />
      </div>
    );
  }

  // Owner has full access
  if (perms.role === "owner") {
    return <>{children}</>;
  }

  // Check if user has ANY permissions at all
  const hasAnyPermission = Object.values(perms.permissions).some(Boolean);

  if (!hasAnyPermission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <NoPermissionsView />
      </div>
    );
  }

  // Check specific page permission
  if (!perms.permissions[permissionKey]) {
    // Find first allowed page and redirect option
    const firstAllowed = Object.entries(perms.permissions).find(([, v]) => v)?.[0];
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <PermissionDeniedView
          onGoBack={() => {
            if (firstAllowed) {
              const pathMap: Record<string, string> = {
                products: "/admin/dashboard",
                orders: "/admin/orders",
                customers: "/admin/customers",
                reviews: "/admin/reviews",
                website: "/admin/website",
                users: "/admin/users",
              };
              navigate(pathMap[firstAllowed] || "/admin/dashboard");
            } else {
              navigate("/admin");
            }
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
};

const NoPermissionsView = () => {
  const navigate = useNavigate();
  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  return (
    <div className="w-full max-w-md text-center space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center mx-auto shadow-lg">
        <ShieldX className="text-amber-600" size={32} />
      </div>
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
          আপনার কোনো পারমিশন নেই
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You don't have any permissions assigned yet. Please contact the admin owner to get access to specific pages.
        </p>
      </div>
      <div className="flex justify-center gap-3 pt-2">
        <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
          <ChevronLeft size={16} /> Back to Site
        </Button>
        <Button variant="ghost" onClick={logout} className="gap-2 text-muted-foreground">
          <LogOut size={16} /> Logout
        </Button>
      </div>
    </div>
  );
};

const NoAccessView = ({ onBack }: { onBack: () => void }) => (
  <div className="w-full max-w-sm text-center space-y-6">
    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
      <ShieldX className="text-destructive" size={28} />
    </div>
    <h1 className="text-2xl font-serif font-bold text-foreground">Access Denied</h1>
    <p className="text-sm text-muted-foreground">
      আপনার এই পেজে অ্যাক্সেস নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।
    </p>
    <Button variant="outline" onClick={onBack} className="gap-2">
      <ChevronLeft size={16} /> Go Back
    </Button>
  </div>
);

const PermissionDeniedView = ({ onGoBack }: { onGoBack: () => void }) => (
  <div className="w-full max-w-sm text-center space-y-6">
    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
      <ShieldX className="text-destructive" size={28} />
    </div>
    <h1 className="text-xl font-serif font-bold text-foreground">Permission Denied</h1>
    <p className="text-sm text-muted-foreground">
      আপনার এই পেজে অ্যাক্সেস নেই।
    </p>
    <Button variant="outline" onClick={onGoBack} className="gap-2">
      <ChevronLeft size={16} /> Go to Allowed Page
    </Button>
  </div>
);

export default AdminGuard;
