import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { toast } from "sonner";
import Taka from "@/components/Taka";
import productsBanner from "@/assets/products-banner.jpg";

const tagColors: Record<string, string> = {
  "Best Seller": "bg-gold/20 text-gold-dark",
  "Handmade": "bg-primary/10 text-foreground",
  "New": "bg-strawberry/15 text-strawberry",
  "Premium": "bg-gold text-accent-foreground",
  "Gift Box": "bg-primary text-primary-foreground",
};

interface VariantRow {
  id: string;
  price_modifier: number;
}

function getPriceRange(basePrice: number, variants: VariantRow[]) {
  if (!variants || variants.length === 0) return { min: basePrice, max: basePrice, isRange: false };
  const prices = variants.map((v) => basePrice + (v.price_modifier || 0));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, isRange: min !== max };
}

const ProductCatalog = () => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const { data: settings } = useSiteSettings();
  const ps = settings?.products_section;

  const badgeText = ps?.badge_text ?? "Our Collection";
  const title = ps?.title ?? "প্রিমিয়াম কুনাফা চকোলেট";
  const subtitle = ps?.subtitle ?? "প্রতিটি বার দুবাইয়ের ঐতিহ্যবাহী রেসিপিতে তৈরি — প্রিমিয়াম উপকরণ দিয়ে।";

  const { data: products = [] } = useQuery({
    queryKey: ["products-with-variants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(id, price_modifier)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch active product-specific coupons
  const { data: productCoupons = [] } = useQuery({
    queryKey: ["active-product-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("code, product_id, discount_type, discount_value")
        .eq("is_active", true)
        .not("product_id", "is", null);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.status !== "in_stock") return;
    const hasVariants = product.product_variants?.length > 0;
    if (hasVariants) {
      toast("অনুগ্রহ করে সাইজ এবং ফ্লেভার সিলেক্ট করুন।", { duration: 3000 });
      navigate(`/product/${product.slug || product.id}?selectVariant=true`);
      return;
    }
    addItem({
      productId: product.id,
      title: product.title,
      price: product.base_price,
      quantity: 1,
      image: product.image_url || undefined,
    });
    toast.success(`${product.title} কার্টে যোগ হয়েছে!`);
  };

  const handleBuyNow = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.status !== "in_stock") return;
    const hasVariants = product.product_variants?.length > 0;
    if (hasVariants) {
      toast("অনুগ্রহ করে সাইজ এবং ফ্লেভার সিলেক্ট করুন।", { duration: 3000 });
      navigate(`/product/${product.slug || product.id}?selectVariant=true`);
      return;
    }
    // Add to cart and go to checkout
    addItem({
      productId: product.id,
      title: product.title,
      price: product.base_price,
      quantity: 1,
      image: product.image_url || undefined,
    });
    const params = new URLSearchParams({
      productId: product.id,
      title: product.title,
      price: String(product.base_price),
      quantity: "1",
      total: String(product.base_price),
      ...(product.image_url ? { image: product.image_url } : {}),
    });
    navigate(`/checkout?${params.toString()}`);
  };

  return (
    <section id="products" className="pt-24 pb-10 sm:pb-16 md:pb-24 bg-card/50 scroll-mt-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-gold-dark">{badgeText}</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-foreground mt-3 mb-4 font-bengali">
            {title}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto font-bengali">
            {subtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product: any, i: number) => {
            const { min, max, isRange } = getPriceRange(
              Number(product.base_price),
              product.product_variants || []
            );
            const isOutOfStock = product.status !== "in_stock";

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="group relative bg-background rounded-2xl overflow-hidden border border-border hover:shadow-luxury transition-all duration-500">
                  <Link to={`/product/${product.slug || product.id}`} className="block">
                    <div className="relative overflow-hidden aspect-square">
                      <img
                        src={product.image_url || productsBanner}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 rounded-t-2xl"
                      />
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                          <span className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full bg-destructive text-destructive-foreground">
                            Sold Out
                          </span>
                        </div>
                      )}
                      {!isOutOfStock && product.tag && (
                        <span className={`absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full ${tagColors[product.tag] || "bg-muted text-muted-foreground"}`}>
                          {product.tag}
                        </span>
                      )}
                      {/* Coupon Badge */}
                      {(() => {
                        const coupon = productCoupons.find((c: any) => c.product_id === product.id);
                        if (!coupon || isOutOfStock) return null;
                        return (
                          <span className="absolute bottom-3 left-3 right-3 px-2.5 py-1.5 text-[10px] font-bold tracking-wide rounded-lg bg-gold/90 text-accent-foreground backdrop-blur-sm border border-gold-dark/20 text-center shadow-sm">
                            🎟️ Use Code: {coupon.code}
                          </span>
                        );
                      })()}
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors duration-500" />
                    </div>

                    <div className="p-4 pb-2">
                      <h3 className="font-serif font-semibold text-sm text-foreground leading-tight mb-1 line-clamp-1">
                        {product.title}
                      </h3>
                      {product.title_bn && <p className="text-xs text-muted-foreground mb-2 font-bengali">{product.title_bn}</p>}

                      {/* Price / Price Range */}
                      <div className="mb-1">
                        {isRange ? (
                          <p className="font-bold text-base sm:text-lg text-foreground font-num">
                            <Taka amount={min} /> – <Taka amount={max} />
                          </p>
                        ) : (
                          <p className="font-bold text-base sm:text-lg text-foreground">
                            <Taka amount={min} />
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Button Stack */}
                  <div className="px-4 pb-4 pt-1 space-y-2">
                    {isOutOfStock ? (
                      <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-muted text-muted-foreground text-xs sm:text-sm font-semibold tracking-wide cursor-not-allowed">
                        Out of Stock
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          className="flex items-center justify-center gap-1.5 w-full py-2 sm:py-2.5 rounded-xl border-2 border-primary text-primary text-xs sm:text-sm font-semibold tracking-wide hover:bg-primary/5 active:scale-[0.97] transition-all duration-300"
                        >
                          <ShoppingBag size={14} />
                          Add to Cart
                        </button>
                        <button
                          onClick={(e) => handleBuyNow(e, product)}
                          className="flex items-center justify-center gap-1.5 w-full py-2 sm:py-2.5 rounded-xl bg-strawberry text-destructive-foreground text-xs sm:text-sm font-semibold tracking-wide hover:brightness-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-300"
                        >
                          Buy Now
                          <ArrowRight size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductCatalog;
