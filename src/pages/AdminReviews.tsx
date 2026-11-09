import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import AdminAnalyticsHeader from "@/components/admin/AdminAnalyticsHeader";
import { useIsMobile } from "@/hooks/use-mobile";

const AdminReviewsPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/admin");
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <AdminSidebar activePage="reviews" />}
      <main className={isMobile ? "px-4 pt-4 pb-24" : "ml-64 p-8"}>
        <AdminAnalyticsHeader />
        <AdminReviews />
      </main>
      {isMobile && <AdminBottomNav />}
    </div>
  );
};

export default AdminReviewsPage;
