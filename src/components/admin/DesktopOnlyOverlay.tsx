import { Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface DesktopOnlyOverlayProps {
  children: React.ReactNode;
}

const DesktopOnlyOverlay = ({ children }: DesktopOnlyOverlayProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  if (!isMobile) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-chocolate flex items-center justify-center mb-6 shadow-luxury">
          <Monitor size={32} className="text-accent" />
        </div>
        <h2 className="text-xl font-serif font-bold text-foreground mb-2">
          Desktop Only
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          This feature is only accessible via Desktop for security and better management.
        </p>
        <Button onClick={() => navigate("/admin/dashboard")} className="gap-2">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default DesktopOnlyOverlay;
