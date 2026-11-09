import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DeliveryArea {
  id?: string;
  area_key: string;
  area_name: string;
  charge: number;
  display_text: string;
  sort_order: number;
  is_active: boolean;
  _isNew?: boolean;
}

export interface DeliverySettingsTabRef {
  save: () => Promise<void>;
}

const DeliverySettingsTab = forwardRef<DeliverySettingsTabRef>((_, ref) => {
  const queryClient = useQueryClient();
  const [areas, setAreas] = useState<DeliveryArea[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-delivery-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_settings")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    if (data) {
      setAreas(
        data.map((r: any) => ({
          id: r.id,
          area_key: r.area_key,
          area_name: r.area_name,
          charge: Number(r.charge),
          display_text: r.display_text,
          sort_order: r.sort_order,
          is_active: r.is_active,
        }))
      );
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      // Delete removed areas
      const existingIds = (data || []).map((r: any) => r.id);
      const currentIds = areas.filter((a) => a.id).map((a) => a.id);
      const toDelete = existingIds.filter((id: string) => !currentIds.includes(id));

      for (const id of toDelete) {
        const { error } = await supabase.from("delivery_settings").delete().eq("id", id);
        if (error) throw error;
      }

      // Upsert all areas
      for (let i = 0; i < areas.length; i++) {
        const area = areas[i];
        const payload = {
          area_key: area.area_key.trim(),
          area_name: area.area_name.trim(),
          charge: area.charge,
          display_text: area.display_text.trim(),
          sort_order: i,
          is_active: area.is_active,
          updated_at: new Date().toISOString(),
        };

        if (area.id && !area._isNew) {
          const { error } = await supabase
            .from("delivery_settings")
            .update(payload)
            .eq("id", area.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("delivery_settings")
            .insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-settings"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-settings"] });
      toast({ title: "Delivery settings saved!" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Expose save function to parent via ref
  useImperativeHandle(ref, () => ({
    save: () => saveMutation.mutateAsync(),
  }), [saveMutation]);

  const addArea = () => {
    setAreas((prev) => [
      ...prev,
      {
        area_key: `area_${Date.now()}`,
        area_name: "",
        charge: 0,
        display_text: "",
        sort_order: prev.length,
        is_active: true,
        _isNew: true,
      },
    ]);
  };

  const removeArea = (idx: number) => {
    setAreas((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateArea = (idx: number, field: keyof DeliveryArea, value: any) => {
    setAreas((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a))
    );
  };

  if (isLoading) {
    return <p className="text-muted-foreground p-6">Loading delivery settings...</p>;
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold text-foreground">
            Delivery Settings
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage delivery areas, charges, and display labels for the checkout page.
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          <Save size={16} />
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        {areas.map((area, idx) => (
          <div
            key={area.id || `new-${idx}`}
            className="p-4 rounded-xl bg-muted/30 border border-border space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical size={16} className="text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
                  Area {idx + 1}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Active</Label>
                  <Switch
                    checked={area.is_active}
                    onCheckedChange={(v) => updateArea(idx, "is_active", v)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive h-8 w-8"
                  onClick={() => removeArea(idx)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Area Key (internal)</Label>
                <Input
                  value={area.area_key}
                  onChange={(e) => updateArea(idx, "area_key", e.target.value)}
                  placeholder="e.g. inside_dhaka"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Area Name (Bangla/English)</Label>
                <Input
                  value={area.area_name}
                  onChange={(e) => updateArea(idx, "area_name", e.target.value)}
                  placeholder="e.g. ঢাকার ভেতরে"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Charge Amount (৳)</Label>
                <Input
                  type="number"
                  value={area.charge}
                  onChange={(e) =>
                    updateArea(idx, "charge", Number(e.target.value))
                  }
                  placeholder="e.g. 60"
                  className="font-num"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Display Text / Label</Label>
                <Input
                  value={area.display_text}
                  onChange={(e) =>
                    updateArea(idx, "display_text", e.target.value)
                  }
                  placeholder="e.g. (৳60)"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addArea} className="gap-2 w-full">
        <Plus size={16} /> Add New Area
      </Button>
    </div>
  );
});

DeliverySettingsTab.displayName = "DeliverySettingsTab";

export default DeliverySettingsTab;
