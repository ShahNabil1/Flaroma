import { useEffect } from "react";
import { Routes, Route, useLocation, Outlet } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import PublicLayout from "@/components/PublicLayout";
import AdminGuard from "@/components/admin/AdminGuard";
import DesktopOnlyOverlay from "@/components/admin/DesktopOnlyOverlay";

import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminOrders from "@/pages/AdminOrders";
import AdminSteadfast from "@/pages/AdminSteadfast";
import AdminReviewsPage from "@/pages/AdminReviews";
import AdminWebsite from "@/pages/AdminWebsite";
import AdminCustomers from "@/pages/AdminCustomers";
import AdminCoupons from "@/pages/AdminCoupons";
import AdminEmail from "@/pages/AdminEmail";
import AdminUsers from "@/pages/AdminUsers";
import AdminAnalytics from "@/pages/AdminAnalytics";
import PermissionDenied from "@/pages/PermissionDenied";
import ProductDetails from "@/pages/ProductDetails";
import Checkout from "@/pages/Checkout";
import OrderConfirmed from "@/pages/OrderConfirmed";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import RefundPolicy from "@/pages/RefundPolicy";
import CustomBox from "@/pages/CustomBox";
import Invoice from "@/pages/Invoice";

const AnimatedRoutes = () => {
  const location = useLocation();
  const routeKey = location.pathname;

  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 500);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={routeKey}>
        {/* Public pages with persistent Navbar + Footer */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/custom" element={<PageTransition><CustomBox /></PageTransition>} />
          <Route path="/product/:slug" element={<PageTransition><ProductDetails /></PageTransition>} />
          <Route path="/checkout" element={<PageTransition><Checkout /></PageTransition>} />
          <Route path="/order-confirmed" element={<PageTransition><OrderConfirmed /></PageTransition>} />
          <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="/terms-of-service" element={<PageTransition><TermsOfService /></PageTransition>} />
          <Route path="/refund-policy" element={<PageTransition><RefundPolicy /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Route>

        {/* Admin pages (no Navbar/Footer) */}
        <Route path="/admin" element={<PageTransition><AdminLogin /></PageTransition>} />
        <Route path="/admin/dashboard" element={<PageTransition><AdminGuard permissionKey="products"><AdminDashboard /></AdminGuard></PageTransition>} />
        <Route path="/admin/orders" element={<PageTransition><AdminGuard permissionKey="orders"><AdminOrders /></AdminGuard></PageTransition>} />
        <Route path="/admin/steadfast" element={<PageTransition><AdminGuard permissionKey="steadfast"><DesktopOnlyOverlay><AdminSteadfast /></DesktopOnlyOverlay></AdminGuard></PageTransition>} />
        <Route path="/admin/reviews" element={<PageTransition><AdminGuard permissionKey="reviews"><AdminReviewsPage /></AdminGuard></PageTransition>} />
        <Route path="/admin/website" element={<PageTransition><AdminGuard permissionKey="website"><DesktopOnlyOverlay><AdminWebsite /></DesktopOnlyOverlay></AdminGuard></PageTransition>} />
        <Route path="/admin/customers" element={<PageTransition><AdminGuard permissionKey="customers"><DesktopOnlyOverlay><AdminCustomers /></DesktopOnlyOverlay></AdminGuard></PageTransition>} />
        <Route path="/admin/coupons" element={<PageTransition><AdminGuard permissionKey="coupons"><AdminCoupons /></AdminGuard></PageTransition>} />
        <Route path="/admin/email" element={<PageTransition><AdminGuard permissionKey="email"><DesktopOnlyOverlay><AdminEmail /></DesktopOnlyOverlay></AdminGuard></PageTransition>} />
        <Route path="/admin/users" element={<PageTransition><AdminGuard permissionKey="users"><AdminUsers /></AdminGuard></PageTransition>} />
        <Route path="/admin/analytics" element={<PageTransition><AdminGuard permissionKey="analytics"><AdminAnalytics /></AdminGuard></PageTransition>} />
        <Route path="/admin/permission-denied" element={<PageTransition><PermissionDenied /></PageTransition>} />

        {/* Invoice (no layout) */}
        <Route path="/i/:orderId" element={<Invoice />} />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
