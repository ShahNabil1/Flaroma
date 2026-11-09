import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Save, Loader2, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CLOUD_NAME = "dvfb58wu4";
const UPLOAD_PRESET = "flaroma_upload";
const ORDERS_URL = "https://ptxenyhuztiaexwdcecl.supabase.co/functions/v1/admin-orders";

async function adminFetch(action: string, body?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  const res = await fetch(`${ORDERS_URL}?action=${action}`, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

interface BuildOption {
  id?: string;
  step_id: string;
  name: string;
  name_bn: string;
  emoji: string;
  image_url: string;
  price: number;
  is_premium: boolean;
  sort_order: number;
  enable_color_selection: boolean;
}

interface BuildStep {
  id?: string;
  title: string;
  title_bn: string;
  sort_order: number;
  max_selections: number;
  options: BuildOption[];
}

interface BuildFlowSettings {
  title: string;
  title_bn: string;
  badge_text: string;
  base_price: number;
  base_prices?: { dark: number; milk: number; white: number };
}

const HARDCODED_BASES = [
  { key: "dark" as const, name: "Dark Chocolate", name_bn: "ডার্ক চকলেট" },
  { key: "milk" as const, name: "Milk Chocolate", name_bn: "মিল্ক চকলেট" },
  { key: "white" as const, name: "White Chocolate", name_bn: "হোয়াইট চকলেট" },
];

const defaultSettings: BuildFlowSettings = {
  title: "Build Your Own Chocolate",
  title_bn: "আপনার পছন্দমতো বেস, ফিলিং আর টপিং বেছে নিন।",
  badge_text: "Customize",
  base_price: 750,
  base_prices: { dark: 0, milk: 0, white: 0 },
};

export default function BuildFlowManager() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ type: "option"; id: string } | null>(null);
  const [settings, setSettings] = useState<BuildFlowSettings>(defaultSettings);
  const [localSteps, setLocalSteps] = useState<BuildStep[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [catalogUploading, setCatalogUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const catalogFileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: steps = [], isLoading } = useQuery({
    queryKey: ["admin-build-flow"],
    queryFn: () => adminFetch("build-flow"),
  });

  useEffect(() => {
    if (steps.length > 0 || !isLoading) {
      setLocalSteps(steps);
      setDirty(false);
    }
  }, [steps, isLoading]);

  useQuery({
    queryKey: ["admin-build-flow-settings"],
    queryFn: async () => {
      const all = await adminFetch("site-settings");
      if (all.build_flow) setSettings({ ...defaultSettings, ...all.build_flow });
      return all.build_flow || defaultSettings;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (data: { action: string; body: any }) => adminFetch(data.action, data.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-build-flow"] });
      queryClient.invalidateQueries({ queryKey: ["build-flow-public"] });
      toast({ title: "Deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateLocalOption = (optId: string, patch: Partial<BuildOption>) => {
    setLocalSteps((prev) =>
      prev.map((s) => ({
        ...s,
        options: s.options.map((o) => (o.id === optId ? { ...o, ...patch } : o)),
      }))
    );
    setDirty(true);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const step of localSteps) {
        const { options, ...stepData } = step;
        await adminFetch("build-flow-step", stepData);
        for (const opt of options) {
          await adminFetch("build-flow-option", opt);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-build-flow"] });
      await queryClient.invalidateQueries({ queryKey: ["build-flow-public"] });
      setDirty(false);
      toast({ title: "All changes saved!" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    try {
      await adminFetch("save-site-settings", { build_flow: settings });
      queryClient.invalidateQueries({ queryKey: ["build-flow-settings"] });
      toast({ title: "Settings saved!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ action: "delete-build-flow-option", body: { id: deleteTarget.id } });
    setDeleteTarget(null);
  };

  const uploadOptionImage = async (file: File, optId: string) => {
    setUploading(optId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.secure_url) {
        updateLocalOption(optId, { image_url: data.secure_url });
        toast({ title: "Image uploaded!" });
      } else throw new Error(data.error?.message || "Upload failed");
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  // Upload new catalog design (adds an option to the design step)
  const addCatalogDesign = async (file: File) => {
    // Find the design step - look for one with sort_order=1 or title containing "Design"
    const designStepData = localSteps.find(s => s.sort_order === 1) || localSteps.find(s => s.title?.toLowerCase().includes("design"));
    if (!designStepData?.id) {
      toast({ title: "Error", description: "Design step not found in database. Please create a step with sort_order=1.", variant: "destructive" });
      return;
    }
    setCatalogUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");

      // Create new option via API
      await adminFetch("build-flow-option", {
        step_id: designStepData.id,
        name: `Design ${(designStepData.options?.length || 0) + 1}`,
        name_bn: "",
        emoji: "🎨",
        image_url: data.secure_url,
        price: 0,
        is_premium: false,
        sort_order: designStepData.options?.length || 0,
        enable_color_selection: false,
      });

      queryClient.invalidateQueries({ queryKey: ["admin-build-flow"] });
      toast({ title: "Design added to catalog!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setCatalogUploading(false);
    }
  };

  // Identify design step reliably
  const designStep = localSteps.find(s => s.sort_order === 1) || localSteps.find(s => s.title?.toLowerCase().includes("design")) || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} /> Loading build flow...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Settings */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-serif text-lg font-bold text-foreground">Section Settings</h3>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input value={settings.title} onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Badge Text</Label>
            <Input value={settings.badge_text} onChange={(e) => setSettings((s) => ({ ...s, badge_text: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Subtitle (Bangla)</Label>
            <Input value={settings.title_bn} onChange={(e) => setSettings((s) => ({ ...s, title_bn: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Base Price (৳)</Label>
            <Input type="number" value={settings.base_price} onChange={(e) => setSettings((s) => ({ ...s, base_price: Number(e.target.value) }))} />
          </div>
        </div>
        <Button onClick={saveSettings} size="sm" className="gap-2">
          <Save size={14} /> Save Settings
        </Button>
      </div>

      {/* Step 1: Base Prices (Hardcoded) */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-serif text-lg font-bold text-foreground">Step 1 — Base Selection Prices</h3>
        <Separator />
        <p className="text-xs text-muted-foreground">Set the additional price for each chocolate base type. These are added on top of the base price above.</p>
        <div className="space-y-3">
          {HARDCODED_BASES.map((base) => (
            <div key={base.key} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">🍫</div>
              <div className="flex-1">
                <span className="font-semibold text-sm text-foreground">{base.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{base.name_bn}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Price (৳)</Label>
                <Input
                  type="number"
                  className="h-8 w-24 text-xs"
                  value={settings.base_prices?.[base.key] ?? 0}
                  onChange={(e) => setSettings((s) => ({
                    ...s,
                    base_prices: { ...(s.base_prices || { dark: 0, milk: 0, white: 0 }), [base.key]: Number(e.target.value) },
                  }))}
                />
              </div>
            </div>
          ))}
        </div>
        <Button onClick={saveSettings} size="sm" className="gap-2">
          <Save size={14} /> Save Base Prices
        </Button>
      </div>

      {/* Step 2: Design Catalog Management */}
      {designStep && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-foreground">Step 2 — Design Catalog</h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={catalogUploading}
                onClick={() => catalogFileInputRef.current?.click()}
              >
                {catalogUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Upload Design
              </Button>
              <input
                ref={catalogFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  // allow re-uploading the same file name
                  e.currentTarget.value = "";
                  if (file) addCatalogDesign(file);
                }}
              />
            </div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">Upload design images for customers to choose from. Set individual prices for each design.</p>

          {designStep.options.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No designs yet. Click "Upload Design" to add catalog images.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {designStep.options.map((opt) => (
                <div key={opt.id} className="relative group rounded-xl border border-border overflow-hidden bg-muted/10">
                  {opt.image_url ? (
                    <img src={opt.image_url} alt={opt.name} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-muted text-muted-foreground text-2xl">🎨</div>
                  )}
                  <div className="p-2 space-y-1.5">
                    <Input
                      className="h-7 text-xs"
                      value={opt.name}
                      onChange={(e) => updateLocalOption(opt.id!, { name: e.target.value })}
                      placeholder="Design name"
                    />
                    <div className="flex items-center gap-1">
                      <Label className="text-[10px] text-muted-foreground">৳</Label>
                      <Input
                        type="number"
                        className="h-7 text-xs flex-1"
                        value={opt.price}
                        onChange={(e) => updateLocalOption(opt.id!, { price: Number(e.target.value) })}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive h-7 w-7 p-0"
                        onClick={() => setDeleteTarget({ type: "option", id: opt.id! })}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {dirty && (
            <Button onClick={saveAll} size="sm" className="gap-2" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Catalog Changes
            </Button>
          )}
        </div>
      )}

      {/* Floating Save Bar */}
      {dirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
          <span className="text-sm font-medium">You have unsaved changes</span>
          <Button size="sm" variant="secondary" onClick={saveAll} disabled={saving} className="gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save All
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this design?"
        description="This design will be permanently removed from the catalog. This action cannot be undone."
        confirmLabel="Delete Design"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
