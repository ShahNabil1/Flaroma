import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, RefreshCw, Trash2, Copy, ImageIcon, Loader2, CheckSquare, Square, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

const MediaLibrary = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => setDebouncedSearch(value), 500);
    setSearchTimeout(timeout);
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["cloudinary-media", debouncedSearch],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("cloudinary-media", {
        body: {
          action: "list",
          ...(debouncedSearch ? { search_expression: `filename:${debouncedSearch}*` } : {}),
        },
      });
      if (error) throw error;
      return data as { resources: CloudinaryResource[]; next_cursor?: string };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (publicId: string) => {
      const { data, error } = await supabase.functions.invoke("cloudinary-media", {
        body: { action: "delete", public_id: publicId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudinary-media"] });
      toast({ title: "Image deleted", description: "The image has been permanently removed from Cloudinary." });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete sequentially to avoid rate limits
      for (const id of ids) {
        const { error } = await supabase.functions.invoke("cloudinary-media", {
          body: { action: "delete", public_id: id },
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudinary-media"] });
      toast({ title: `${selected.size} images deleted`, description: "All selected images have been permanently removed." });
      setSelected(new Set());
      setShowBulkDelete(false);
    },
    onError: (err: Error) => {
      toast({ title: "Bulk delete failed", description: err.message, variant: "destructive" });
      setShowBulkDelete(false);
    },
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === resources.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(resources.map((r) => r.public_id)));
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied!", description: "Image URL has been copied to clipboard." });
  };

  const resources = data?.resources || [];
  const fileName = (publicId: string) => publicId.split("/").pop() || publicId;
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const hasSelection = selected.size > 0;

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-foreground">Media Library</h3>
          <div className="flex items-center gap-2">
            {resources.length > 0 && (
              <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={selectAll}>
                {selected.size === resources.length ? <CheckSquare size={14} /> : <Square size={14} />}
                {selected.size === resources.length ? "Deselect All" : "Select All"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["cloudinary-media"] })}
              disabled={isFetching}
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Bulk action bar */}
        {hasSelection && (
          <div className="flex items-center justify-between bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-foreground">
              {selected.size} image{selected.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setSelected(new Set())}>
                <XCircle size={14} /> Clear
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowBulkDelete(true)}
              >
                <Trash2 size={14} /> Delete {selected.size} image{selected.size > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
            <ImageIcon size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {debouncedSearch ? "No images match your search." : "No images found in your Cloudinary account."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {resources.map((res) => {
              const isSelected = selected.has(res.public_id);
              return (
                <div
                  key={res.public_id}
                  className={`group relative bg-background rounded-xl border-2 overflow-hidden hover:shadow-luxury transition-all duration-300 cursor-pointer ${
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
                  }`}
                  onClick={() => toggleSelect(res.public_id)}
                >
                  {/* Checkbox */}
                  <div className={`absolute top-2 left-2 z-20 transition-opacity duration-200 ${isSelected || hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(res.public_id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5 border-2 border-background bg-background/80 backdrop-blur-sm data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>

                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={res.secure_url}
                      alt={fileName(res.public_id)}
                      className={`w-full h-full object-cover transition-all duration-500 ${isSelected ? "scale-95 rounded-lg" : "group-hover:scale-105"}`}
                      loading="lazy"
                    />
                  </div>

                  {/* Overlay actions */}
                  <div className={`absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors duration-300 flex items-center justify-center gap-2 ${hasSelection ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"}`}>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 px-3 text-xs gap-1.5"
                      onClick={(e) => { e.stopPropagation(); copyUrl(res.secure_url); }}
                    >
                      <Copy size={12} /> Copy URL
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(res.public_id); }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-foreground truncate" title={res.public_id}>
                      {fileName(res.public_id)}.{res.format}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {res.width}×{res.height} · {formatBytes(res.bytes)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Single Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Delete this image?"
        description="This will permanently remove the image from your Cloudinary storage. This action cannot be undone."
        confirmLabel="Delete Image"
        loading={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirmation */}
      <DeleteConfirmDialog
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={() => bulkDeleteMutation.mutate([...selected])}
        title={`Delete ${selected.size} image${selected.size > 1 ? "s" : ""}?`}
        description={`This will permanently remove ${selected.size} image${selected.size > 1 ? "s" : ""} from your Cloudinary storage. This action cannot be undone.`}
        confirmLabel={`Delete ${selected.size} Image${selected.size > 1 ? "s" : ""}`}
        loading={bulkDeleteMutation.isPending}
        icon="warning"
      />
    </div>
  );
};

export default MediaLibrary;
