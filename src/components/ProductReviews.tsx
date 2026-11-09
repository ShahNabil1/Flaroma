import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReviewForm from "./ReviewForm";

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  image_url: string | null;
  created_at: string;
}

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const { data: reviews = [], refetch } = useQuery<Review[]>({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Customer Reviews</h2>
          {avgRating && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    className={s <= Math.round(Number(avgRating)) ? "text-gold fill-gold" : "text-border"}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {avgRating} ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Review List */}
        <div className="lg:col-span-2">
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No reviews yet. Be the first to review this product!
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {reviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 rounded-2xl bg-card border border-border"
                >
                  <div className="flex gap-0.5 mb-2.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={s <= review.rating ? "text-gold fill-gold" : "text-border"}
                      />
                    ))}
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      "{review.comment}"
                    </p>
                  )}
                  {review.image_url && (
                    <button
                      onClick={() => setExpandedImage(review.image_url)}
                      className="mb-3 rounded-xl overflow-hidden border border-border w-20 h-20 hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={review.image_url}
                        alt="Review"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{review.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Review Form */}
        <div>
          <ReviewForm productId={productId} onSubmitted={refetch} />
        </div>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-foreground/80 flex items-center justify-center p-6"
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-lg max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={expandedImage}
                alt="Review photo"
                className="rounded-2xl max-w-full max-h-[80vh] object-contain"
              />
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background text-foreground flex items-center justify-center shadow-lg"
              >
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductReviews;
