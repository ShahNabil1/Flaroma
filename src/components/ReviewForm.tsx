import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CLOUD_NAME = "dvfb58wu4";
const UPLOAD_PRESET = "flaroma_upload";

async function compressImage(file: File, maxDim = 1000, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

interface ReviewFormProps {
  productId: string;
  onSubmitted: () => void;
}

const ReviewForm = ({ productId, onSubmitted }: ReviewFormProps) => {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const compressed = await compressImage(imageFile);
        const fd = new FormData();
        fd.append("file", compressed, "review.jpg");
        fd.append("upload_preset", UPLOAD_PRESET);
        fd.append("folder", "reviews");
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");
        imageUrl = data.secure_url;
      }

      const { error } = await supabase.from("reviews" as any).insert({
        product_id: productId,
        customer_name: name.trim(),
        rating,
        comment: comment.trim() || null,
        image_url: imageUrl,
      });

      if (error) throw error;

      // Send email notification to admins (fire-and-forget)
      const ratingStars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
      fetch(
        "https://ptxenyhuztiaexwdcecl.supabase.co/functions/v1/send-email?action=send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_key: "new_review",
            variables: {
              customer_name: name.trim(),
              rating_stars: ratingStars,
              comment: comment.trim() || "No comment provided",
            },
          }),
        }
      ).catch(() => {}); // silent fail

      toast.success("Review submitted! It will appear after approval.");
      setName("");
      setRating(0);
      setComment("");
      removeImage();
      onSubmitted();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h3 className="font-serif text-lg font-bold text-foreground mb-4">Write a Review</h3>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Your Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            disabled={submitting}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
                className="p-0.5 transition-transform hover:scale-110"
                disabled={submitting}
              >
                <Star
                  size={24}
                  className={
                    s <= (hoverRating || rating)
                      ? "text-gold fill-gold"
                      : "text-border"
                  }
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Comment</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience..."
            rows={3}
            disabled={submitting}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Photo (optional)</label>
          <div className="flex items-center gap-3">
            {imagePreview ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={removeImage}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 text-background flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                disabled={submitting}
              >
                <Camera size={16} />
                Add Photo
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-11 rounded-xl font-semibold"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Review"
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default ReviewForm;
