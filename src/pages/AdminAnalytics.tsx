import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Save, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import AdminAnalyticsHeader from "@/components/admin/AdminAnalyticsHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface AnalyticsSettings {
  id: string;
  fb_pixel_id: string | null;
  fb_capi_token: string | null;
  gtm_id: string | null;
  ga4_id: string | null;
}

const AdminAnalytics = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fbPixelId, setFbPixelId] = useState("");
  const [fbCapiToken, setFbCapiToken] = useState("");
  const [gtmId, setGtmId] = useState("");
  const [ga4Id, setGa4Id] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/admin");
    };
    check();
  }, [navigate]);

  const { data: settings, isLoading } = useQuery<AnalyticsSettings | null>({
    queryKey: ["analytics-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setFbPixelId(settings.fb_pixel_id || "");
      setFbCapiToken(settings.fb_capi_token || "");
      setGtmId(settings.gtm_id || "");
      setGa4Id(settings.ga4_id || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error("No settings row found");
      const { error } = await supabase
        .from("analytics_settings")
        .update({
          fb_pixel_id: fbPixelId.trim() || null,
          fb_capi_token: fbCapiToken.trim() || null,
          gtm_id: gtmId.trim() || null,
          ga4_id: ga4Id.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Settings saved successfully!" });
      queryClient.invalidateQueries({ queryKey: ["analytics-settings"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const clearField = (field: string) => {
    switch (field) {
      case "fb_pixel_id": setFbPixelId(""); break;
      case "fb_capi_token": setFbCapiToken(""); break;
      case "gtm_id": setGtmId(""); break;
      case "ga4_id": setGa4Id(""); break;
    }
  };

  const fields = [
    { key: "fb_pixel_id", label: "Facebook Pixel ID", value: fbPixelId, setter: setFbPixelId, placeholder: "e.g. 123456789012345" },
    { key: "fb_capi_token", label: "Facebook Conversions API Token", value: fbCapiToken, setter: setFbCapiToken, placeholder: "e.g. EAAxxxxxx..." },
    { key: "gtm_id", label: "Google Tag Manager ID", value: gtmId, setter: setGtmId, placeholder: "e.g. GTM-XXXXXXX" },
    { key: "ga4_id", label: "Google Analytics 4 ID", value: ga4Id, setter: setGa4Id, placeholder: "e.g. G-XXXXXXXXXX" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <AdminSidebar activePage="analytics" />
      </div>

      <main className={cn("p-4 md:p-8 pb-20 md:pb-8", !isMobile && "ml-64")}>
        <AdminAnalyticsHeader />
        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={24} className="text-accent" /> Analytics & Tracking
          </h2>
          <p className="text-sm text-muted-foreground">Configure tracking pixels and analytics IDs</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-6 max-w-2xl space-y-6">
            {fields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label className="text-sm font-medium">{f.label}</Label>
                <div className="flex gap-2">
                  <Input
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    className="flex-1"
                  />
                  {f.value && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => clearField(f.key)}
                      title="Clear"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Settings
            </Button>
          </div>
        )}
      </main>

      {isMobile && <AdminBottomNav />}
    </div>
  );
};

export default AdminAnalytics;
