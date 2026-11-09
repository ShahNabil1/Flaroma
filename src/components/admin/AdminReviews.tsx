import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/admin-api";
import { useIsMobile } from "@/hooks/use-mobile";

interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
}

const AdminReviews = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["admin-reviews", filter],
    queryFn: () => adminApi.getReviews(filter),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateReview(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Review updated" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Review deleted" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground">Reviews</h2>
          <p className="text-xs md:text-sm text-muted-foreground">{reviews.length} reviews</p>
        </div>
        <div className="flex gap-1.5 md:gap-2">
          {(["pending", "approved", "all"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize text-xs md:text-sm"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No reviews found.</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Rating</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Comment</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Photo</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium text-foreground">{r.customer_name}</td>
                    <td className="p-4">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={12} className={s <= r.rating ? "text-gold fill-gold" : "text-border"} />
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground max-w-[200px] truncate">{r.comment || "—"}</td>
                    <td className="p-4">
                      {r.image_url ? (
                        <button onClick={() => setPreviewImage(r.image_url)} className="w-10 h-10 rounded-lg overflow-hidden border border-border hover:opacity-80">
                          <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        r.status === "approved" ? "bg-green-100 text-green-700" : "bg-accent/20 text-accent-foreground"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-1">
                      {r.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => updateMutation.mutate({ id: r.id, status: "approved" })}
                        >
                          <Check size={16} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this review?")) deleteMutation.mutate(r.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-foreground">{r.customer_name}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={r.status === "approved" ? "default" : "secondary"} className="text-[10px] capitalize">
                    {r.status}
                  </Badge>
                </div>
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} className={s <= r.rating ? "text-gold fill-gold" : "text-border"} />
                  ))}
                </div>
                {r.comment && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-3">{r.comment}</p>
                )}
                {r.image_url && (
                  <button onClick={() => setPreviewImage(r.image_url)} className="w-16 h-16 rounded-lg overflow-hidden border border-border mb-3">
                    <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                )}
                <div className="flex gap-2">
                  {r.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs text-green-600 border-green-200"
                      onClick={() => updateMutation.mutate({ id: r.id, status: "approved" })}
                    >
                      <Check size={12} className="mr-1" /> Approve
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-destructive border-destructive/30"
                    onClick={() => {
                      if (confirm("Delete this review?")) deleteMutation.mutate(r.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Image Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-foreground/80 flex items-center justify-center p-6" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Review" className="max-w-lg max-h-[80vh] object-contain rounded-2xl" />
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
