import { ShoppingBag, X, Minus, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Taka from "@/components/Taka";
import { parseCustomVariant, CustomizedBadge, CustomOrderSummary, parseAttributeVariant, AttributesSummary } from "@/components/CustomOrderDetails";
import heroChocolate from "@/assets/hero-chocolate.jpg";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalItems, subtotal } = useCart();
  const navigate = useNavigate();

  // Fetch current stock status for all cart items
  const productIds = items.map((i) => i.productId);
  const { data: stockStatus = {} } = useQuery({
    queryKey: ["cart-stock", productIds.join(",")],
    queryFn: async () => {
      if (productIds.length === 0) return {};
      const { data } = await supabase
        .from("products")
        .select("id, status")
        .in("id", productIds);
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.id] = p.status; });
      return map;
    },
    enabled: isOpen && productIds.length > 0,
    refetchInterval: isOpen ? 10000 : false,
  });

  const hasUnavailable = items.some((i) => stockStatus[i.productId] && stockStatus[i.productId] !== "in_stock");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} className="text-foreground" />
                <h2 className="font-serif text-lg font-bold text-foreground">Your Cart</h2>
                {totalItems > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-strawberry text-destructive-foreground">
                    {totalItems}
                  </span>
                )}
              </div>
              <button onClick={closeCart} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <ShoppingBag size={32} className="text-muted-foreground" />
                  </div>
                  <p className="font-serif text-lg font-semibold text-foreground">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground font-bengali">সুস্বাদু চকোলেট যোগ করুন!</p>
                  <Button variant="outline" onClick={closeCart}>Continue Shopping</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {items.map((item) => {
                      const isUnavailable = stockStatus[item.productId] && stockStatus[item.productId] !== "in_stock";
                      const parsed = parseCustomVariant(item.variant);
                      const isCustom = parsed.isCustom;
                      const displayTitle = isCustom ? "Your Custom Kunafa Box" : item.title;
                      const displayImage = isCustom ? (parsed.customDesignUrl || heroChocolate) : item.image;

                      return (
                      <motion.div
                        key={`${item.productId}-${item.variant || "default"}`}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 80 }}
                        className={`relative flex gap-3 p-3 rounded-xl bg-card border border-border ${isUnavailable ? "opacity-60 border-destructive/30" : ""}`}
                      >
                        {isUnavailable && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold z-10">
                            <AlertTriangle size={10} /> Unavailable
                          </div>
                        )}

                        {/* Thumbnail */}
                        <div className="relative w-20 shrink-0">
                          {displayImage ? (
                            <img src={displayImage} alt={displayTitle} className="w-20 h-20 rounded-lg object-cover border border-border" />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                              <ShoppingBag size={20} className="text-muted-foreground" />
                            </div>
                          )}
                          {isCustom && <CustomizedBadge />}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="font-serif font-semibold text-sm text-foreground line-clamp-1">{displayTitle}</h4>

                          {isCustom ? (
                            <CustomOrderSummary parsed={parsed} compact showEditLink />
                          ) : parseAttributeVariant(item.variant).isAttributes ? (
                            <AttributesSummary variant={item.variant} compact />
                          ) : (
                            item.variant && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded inline-block">{item.variant}</span>
                            )
                          )}

                          <p className="font-bold text-foreground mt-1"><Taka amount={item.price * item.quantity} /></p>

                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center border border-border rounded-lg overflow-hidden">
                              <button
                                onClick={() => updateQuantity(item.productId, item.variant, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors text-foreground"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold text-foreground">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.variant, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors text-foreground"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <button
                              onClick={() => removeItem(item.productId, item.variant)}
                              className="p-2 rounded-lg text-muted-foreground hover:text-strawberry hover:bg-strawberry/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border px-6 py-5 space-y-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-bold text-lg text-foreground"><Taka amount={subtotal} /></span>
                </div>
                <Separator />
                <Button
                  size="lg"
                  className="w-full h-14 text-base gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                  disabled={hasUnavailable}
                  onClick={() => {
                    if (hasUnavailable) {
                      toast({ title: "This item is currently unavailable", description: "Please remove out-of-stock items before checkout.", variant: "destructive" });
                      return;
                    }
                    closeCart();
                    navigate("/checkout");
                  }}
                >
                  <ShoppingBag size={18} />
                  {hasUnavailable ? "Remove unavailable items" : <><span>Checkout Now —</span> <Taka amount={subtotal} /></>}
                </Button>
                <p className="text-xs text-center text-muted-foreground">Delivery charges calculated at checkout</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
