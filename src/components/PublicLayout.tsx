import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StickyNav from "@/components/StickyNav";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { useAnalyticsInjection } from "@/hooks/use-analytics";

const PublicLayout = () => {
  useAnalyticsInjection();

  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
      <StickyNav />
      <WhatsAppFloat />
    </>
  );
};

export default PublicLayout;
