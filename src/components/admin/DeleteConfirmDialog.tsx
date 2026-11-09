import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  icon?: "trash" | "warning";
}

const DeleteConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone. This will be permanently deleted.",
  confirmLabel = "Delete",
  loading = false,
  icon = "trash",
}: DeleteConfirmDialogProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-sm mx-4 bg-[#FFF9F5] rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="p-6 pt-8 flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                {icon === "trash" ? (
                  <Trash2 size={24} className="text-destructive" />
                ) : (
                  <AlertTriangle size={24} className="text-destructive" />
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-serif font-bold text-[#3D2314] mb-2">
                {title}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                {description}
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-border text-muted-foreground hover:bg-muted/30"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-[#E11D48] text-white hover:bg-[#BE123C] transition-colors gap-2"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  <>
                    <Trash2 size={14} />
                    {confirmLabel}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteConfirmDialog;
