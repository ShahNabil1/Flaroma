import { ShieldX, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PermissionDenied = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <ShieldX className="text-destructive" size={28} />
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground">
          আপনার এই পেজে অ্যাক্সেস নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।
        </p>
        <Button variant="outline" onClick={() => navigate("/admin/dashboard")} className="gap-2">
          <ChevronLeft size={16} /> Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default PermissionDenied;
