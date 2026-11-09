import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ShoppingBag, Minus, Plus, Truck, Snowflake, Clock, Star, ChevronRight, Banknote, PencilLine, ShieldAlert, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import productsBanner from "@/assets/products-banner.jpg";
import Taka from "@/components/Taka";
import ProductReviews from "@/components/ProductReviews";
import { trackEvent, useAnalyticsInjection } from "@/hooks/use-analytics";

const tabs = ["Description", "Delivery Policy", "Storage Instructions"] as const;

const orderingGuidePoints = [
  {
    icon: Banknote,
    text: <>প্রতিটি অর্ডার কনফার্ম করার জন্য <strong>৩০% অ্যাডভান্স</strong> করতে হবে, যেহেতু এটি একটি হ্যান্ডমেড ফুড আইটেম।</>,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: PencilLine,
    text: <>কাস্টমাইজড চকোলেটের ক্ষেত্রে আপনার চাহিদা চেকআউট নোটে বিস্তারিত লিখুন এবং রেফারেন্স ছবি আপলোড করুন।</>,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: ShieldAlert,
    text: <>অ্যাডভান্স করা টাকা <strong>অফেরতযোগ্য</strong> (Non-refundable)।</>,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  {
    icon: XCircle,
    text: <>অ্যাডভান্স করার পর অর্ডার ক্যান্সেল বা রিটার্ন করলে <strong>কোনো রিফান্ড প্রযোজ্য হবে না</strong>।</>,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
];

const OrderingGuideCard = () => (
  <div className="rounded-xl border border-border p-5 sm:p-7" style={{ backgroundColor: "#FFF9F5" }}>
    <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground mb-4">
      অর্ডার করার নিয়মাবলী
    </h3>
    <div className="space-y-3.5">
      {orderingGuidePoints.map(({ icon: Icon, text, color, bg }, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className={`shrink-0 w-8 h-8 rounded-lg ${bg} flex items-center justify-center mt-0.5`}>
            <Icon size={16} className={color} />
          </div>
          <p className="text-sm leading-relaxed text-foreground/80 font-sans font-bengali">
            {text}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const ProductDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightVariants = searchParams.get("selectVariant") === "true";
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({}); // { "Size": variantId, "Filling": variantId }
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Description");
  const [mainImage, setMainImage] = useState(0);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [pulseVariants, setPulseVariants] = useState(highlightVariants);
  const { addItem } = useCart();
  const analyticsSettings = useAnalyticsInjection();

  // Clear pulse highlight and selectVariant param after a few seconds
  useEffect(() => {
    if (pulseVariants) {
      const timer = setTimeout(() => setPulseVariants(false), 4000);
      // Clean up the URL param
      searchParams.delete("selectVariant");
      setSearchParams(searchParams, { replace: true });
      return () => clearTimeout(timer);
    }
  }, [pulseVariants]);

  // Determine if the param looks like a UUID (legacy support)
  const isUUID = slug ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug) : false;

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      // Try slug first, fallback to ID for legacy URLs
      const query = supabase
        .from("products")
        .select("*, product_variants(*)");
      
      const { data, error } = isUUID
        ? await query.eq("id", slug!).maybeSingle()
        : await query.eq("slug", slug!).maybeSingle();
      
      if (error) throw error;
      
      // If slug lookup returned nothing, try by ID as final fallback
      if (!data && !isUUID) {
        const { data: fallback, error: fallbackErr } = await supabase
          .from("products")
          .select("*, product_variants(*)")
          .eq("id", slug!)
          .maybeSingle();
        if (fallbackErr) throw fallbackErr;
        return fallback;
      }
      
      return data;
    },
    enabled: !!slug,
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", product?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .neq("id", product!.id)
        .eq("status", "in_stock")
        .order("sort_order")
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!product?.id,
  });

  // Track ViewContent when product loads
  useEffect(() => {
    if (product) {
      trackEvent("ViewContent", {
        content_name: product.title,
        content_ids: [product.id],
        content_type: "product",
        value: Number(product.base_price),
        currency: "BDT",
      }, analyticsSettings);
    }
  }, [product?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">

        <div className="container mx-auto px-6 py-32 text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">

        <div className="container mx-auto px-6 py-32 text-center">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-4">Product Not Found</h1>
          <Link to="/#products">
            <Button variant="outline"><ChevronLeft size={16} className="mr-2" /> Back to Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = product.image_url ? [product.image_url] : [productsBanner];
  const variants = (product as any).product_variants || [];
  const variantTypes = [...new Set(variants.map((v: any) => v.variant_type))] as string[];
  const isOutOfStock = product.status !== "in_stock";

  // Group variants by type
  const groupedVariants: Record<string, any[]> = {};
  variants.forEach((v: any) => {
    if (!groupedVariants[v.variant_type]) groupedVariants[v.variant_type] = [];
    groupedVariants[v.variant_type].push(v);
  });

  // Calculate total price from all selected attributes
  const totalPriceModifier = Object.values(selectedAttributes).reduce((sum, variantId) => {
    const v = variants.find((v: any) => v.id === variantId);
    return sum + (v?.price_modifier || 0);
  }, 0);
  const totalPrice = (Number(product.base_price) + totalPriceModifier) * quantity;

  const requiresVariant = variantTypes.length > 0;
  const hasValidSelection = !requiresVariant || variantTypes.every((t) => selectedAttributes[t]);

  const validateVariant = () => {
    if (!requiresVariant) return true;
    const missingType = variantTypes.find((t) => !selectedAttributes[t]);
    if (missingType) {
      setVariantError(missingType);
      return false;
    }
    return true;
  };

  // Build a variant summary string for display and storage
  const buildVariantSummary = (): string | undefined => {
    if (variantTypes.length === 0) return undefined;
    const selections: Record<string, { value: string; price: number }> = {};
    for (const type of variantTypes) {
      const variantId = selectedAttributes[type];
      if (variantId) {
        const v = variants.find((v: any) => v.id === variantId);
        if (v) selections[type] = { value: v.variant_value, price: v.price_modifier };
      }
    }
    if (Object.keys(selections).length === 0) return undefined;
    return JSON.stringify({ __attributes: selections });
  };

  const handleAddToCart = () => {
    if (!validateVariant()) return;
    const variantMeta = buildVariantSummary();
    // Build a simple display string for cart matching
    const displayVariant = variantTypes.map((t) => {
      const v = variants.find((v: any) => v.id === selectedAttributes[t]);
      return v?.variant_value;
    }).filter(Boolean).join(" / ");

    const itemPrice = Number(product.base_price) + totalPriceModifier;
    addItem({
      productId: product.id,
      title: product.title,
      price: itemPrice,
      quantity,
      variant: variantMeta || displayVariant || undefined,
      image: product.image_url || undefined,
    });
    trackEvent("AddToCart", {
      content_name: product.title,
      content_ids: [product.id],
      content_type: "product",
      value: itemPrice * quantity,
      currency: "BDT",
    }, analyticsSettings);
    toast.success(`${product.title} added to cart!`);
  };

  const handleBuyNow = () => {
    if (!validateVariant()) return;
    const variantMeta = buildVariantSummary();
    const displayVariant = variantTypes.map((t) => {
      const v = variants.find((v: any) => v.id === selectedAttributes[t]);
      return v?.variant_value;
    }).filter(Boolean).join(" / ");

    const params = new URLSearchParams({
      productId: product.id,
      title: product.title,
      price: String(Number(product.base_price) + totalPriceModifier),
      quantity: String(quantity),
      total: String(totalPrice),
      ...(variantMeta ? { variant: variantMeta } : displayVariant ? { variant: displayVariant } : {}),
      ...(product.image_url ? { image: product.image_url } : {}),
    });
    navigate(`/checkout?${params.toString()}`);
  };

  const handleWhatsApp = () => {
    if (!validateVariant()) return;
    const selections = variantTypes.map((t) => {
      const v = variants.find((v: any) => v.id === selectedAttributes[t]);
      return v ? `${t}: ${v.variant_value}` : null;
    }).filter(Boolean).join("\n");
    const msg = `Hi Flaroma, I want to order this:\nProduct: ${product.title}${selections ? `\n${selections}` : ""}\nQuantity: ${quantity}\nPrice: ৳${totalPrice}\nLink: ${window.location.href}`;
    window.open(`https://wa.me/8801760494879?text=${encodeURIComponent(msg)}`, "_blank");
  };


  return (
     <div className="min-h-screen bg-background overflow-x-hidden">


      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-20 sm:pb-16"
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8 overflow-x-auto">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight size={14} />
          <Link to="/#products" className="hover:text-foreground transition-colors">Products</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium truncate">{product.title}</span>
        </nav>

        {/* Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Image Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative rounded-2xl overflow-hidden aspect-square bg-card border border-border mb-4">
              <AnimatePresence mode="wait">
                <motion.img
                  key={mainImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={images[mainImage]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              {isOutOfStock && (
                <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                  <span className="px-5 py-2.5 text-sm font-bold uppercase tracking-widest rounded-full bg-destructive text-destructive-foreground shadow-lg">
                    Sold Out
                  </span>
                </div>
              )}
              {!isOutOfStock && product.tag && (
                <span className="absolute top-4 left-4 px-3 py-1.5 text-xs font-bold tracking-wide uppercase rounded-full bg-gold/20 text-gold-dark">
                  {product.tag}
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setMainImage(i)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      i === mainImage ? "border-primary shadow-gold" : "border-border opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col"
          >
            {/* Title & Price */}
            {product.title_bn && (
              <p className="text-sm text-muted-foreground mb-1 font-bengali">{product.title_bn}</p>
            )}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-foreground mb-3">
              {product.title}
            </h1>

            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-2xl sm:text-3xl font-bold text-foreground"><Taka amount={totalPrice} /></span>
              {totalPriceModifier !== 0 && (
                <span className="text-sm text-muted-foreground line-through">
                  <Taka amount={Number(product.base_price) * quantity} />
                </span>
              )}
            </div>

            {/* Variant Selection - Grouped by Type */}
            {variantTypes.length > 0 && (
              <div className="mb-5 space-y-4">
                {variantTypes.map((type) => {
                  const typeOptions = groupedVariants[type] || [];
                  const hasError = variantError === type;

                  return (
                    <div key={type}>
                      <label className="text-sm font-semibold text-foreground mb-3 block uppercase tracking-wide">
                        {type}
                      </label>
                      <motion.div
                        className="flex flex-row flex-wrap gap-3"
                        animate={hasError ? { x: [0, -6, 6, -6, 6, 0] } : {}}
                        transition={{ duration: 0.4 }}
                      >
                        {typeOptions.map((v: any) => {
                          const isSelected = selectedAttributes[type] === v.id;
                          return (
                            <motion.button
                              key={v.id}
                              onClick={() => {
                                setSelectedAttributes((prev) => ({
                                  ...prev,
                                  [type]: isSelected ? undefined : v.id,
                                }));
                                if (hasError) setVariantError(null);
                                if (pulseVariants) setPulseVariants(false);
                              }}
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.97 }}
                              animate={pulseVariants && !isSelected ? {
                                scale: [1, 1.06, 1],
                                borderColor: ["hsl(var(--border))", "hsl(var(--primary))", "hsl(var(--border))"],
                              } : {}}
                              transition={pulseVariants ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
                              className={`px-5 py-3 rounded-xl text-sm font-semibold border-2 transition-colors duration-300 ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                  : hasError
                                  ? "border-destructive/50 bg-card text-foreground"
                                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                              }`}
                            >
                              {v.variant_value}
                              {v.price_modifier !== 0 && (
                                <span className="ml-1.5 text-xs opacity-75">
                                  {v.price_modifier > 0 ? "+" : ""}<Taka amount={v.price_modifier} />
                                </span>
                              )}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                      <AnimatePresence>
                        {hasError && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-sm text-destructive mt-2 font-medium"
                          >
                            Please select a {type.toLowerCase()}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quantity & Action Buttons */}
            <div className="space-y-3 mb-4">
              <div className={`inline-flex items-center border border-border rounded-xl overflow-hidden ${isOutOfStock ? "opacity-50 pointer-events-none" : ""}`}>
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                  disabled={isOutOfStock}
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-sm font-semibold text-foreground">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                  disabled={isOutOfStock}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 text-sm gap-2 rounded-xl font-semibold border-2 border-primary text-primary hover:bg-primary/10"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                >
                  <ShoppingBag size={16} />
                  {isOutOfStock ? "Unavailable" : "Add to Cart"}
                </Button>

                <Button
                  size="lg"
                  className="h-12 text-sm gap-2 rounded-xl font-semibold"
                  disabled={isOutOfStock}
                  onClick={handleBuyNow}
                >
                  {isOutOfStock ? "Out of Stock" : <><span>Buy Now —</span> <Taka amount={totalPrice} /></>}
                </Button>
              </div>
            </div>

            {/* Order on WhatsApp */}
            {isOutOfStock ? (
              <div className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-base font-semibold text-white bg-muted-foreground/40 cursor-not-allowed opacity-60">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Currently Unavailable
              </div>
            ) : (
              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-base font-semibold text-white transition-all duration-300 hover:brightness-110 hover:-translate-y-0.5 active:scale-95"
                style={{ backgroundColor: "#25D366" }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Order On WhatsApp
              </button>
            )}

            {/* Trust Badges */}
            {(product as any).show_trust_badges !== false && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
                {[
                  { icon: Truck, label: "Free Delivery", sub: "Inside Dhaka" },
                  { icon: Clock, label: "Made Fresh", sub: "Upon Order" },
                  { icon: Snowflake, label: "Cool Packed", sub: "Guaranteed" },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex flex-col items-center p-2 sm:p-3 rounded-xl bg-card border border-border text-center">
                    <Icon size={18} className="text-gold mb-1.5" />
                    <span className="text-[10px] sm:text-xs font-semibold text-foreground">{label}</span>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground">{sub}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ordering Guide — Desktop (right column) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="hidden lg:block mt-8"
            >
              <OrderingGuideCard />
            </motion.div>

          </motion.div>
        </div>

        {/* Ordering Guide — Mobile (full width below grid) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 lg:hidden"
        >
          <OrderingGuideCard />
        </motion.div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <div className="flex gap-1 border-b border-border mb-8">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl text-muted-foreground leading-relaxed"
            >
              {activeTab === "Description" && (
                <p className="whitespace-pre-line">
                  {product.description ||
                    "আমাদের প্রিমিয়াম কুনাফা চকোলেট দুবাইয়ের ঐতিহ্যবাহী রেসিপি অনুসরণ করে হাতে তৈরি করা হয়। প্রতিটি পণ্য সর্বোচ্চ মানের উপকরণ ব্যবহার করে তৈরি — খাঁটি পেস্তা, প্রিমিয়াম চকোলেট, এবং ক্রিস্পি কুনাফা ময়দা দিয়ে। আমরা প্রতিটি অর্ডারে সতেজতা এবং স্বাদ নিশ্চিত করি।"}
                </p>
              )}
              {activeTab === "Delivery Policy" && (
                <p className="whitespace-pre-line">
                  {(product as any).delivery_policy ||
                    "🚚 ঢাকার ভেতরে: অর্ডারের ২৪-৪৮ ঘণ্টার মধ্যে ডেলিভারি। ডেলিভারি চার্জ ৳৬০।\n📦 ঢাকার বাইরে: কুরিয়ারের মাধ্যমে ২-৩ কার্যদিবসের মধ্যে। চার্জ এলাকা ভেদে পরিবর্তন হতে পারে।\n🧊 কুল প্যাকেজিং: প্রতিটি অর্ডার ইনসুলেটেড প্যাকেজিংয়ে পাঠানো হয় যাতে পণ্যের গুণমান বজায় থাকে।\n⚡ Fresh on Order: প্রতিটি বক্স অর্ডার পাওয়ার পরেই তাজা করে তৈরি করা হয়।"}
                </p>
              )}
              {activeTab === "Storage Instructions" && (
                <p className="whitespace-pre-line">
                  {(product as any).storage_instructions ||
                    "❄️ রেফ্রিজারেটরে সংরক্ষণ করুন: পণ্য পাওয়ার পর অবিলম্বে ফ্রিজে রাখুন। ৪-৮°C তাপমাত্রায় সংরক্ষণ করুন।\n📅 সেরা সময়ের মধ্যে খান: ফ্রিজে রাখলে ৫-৭ দিনের মধ্যে সেবন করুন।\n🌡️ পরিবেশনের আগে: ফ্রিজ থেকে বের করে ১০-১৫ মিনিট ঘরের তাপমাত্রায় রাখুন — সেরা স্বাদ পেতে।\n⚠️ সতর্কতা: সরাসরি সূর্যের আলো বা উচ্চ তাপমাত্রা থেকে দূরে রাখুন।"}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Customer Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <ProductReviews productId={product.id} />
        </motion.div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20"
          >
            <h2 className="text-2xl font-serif font-bold text-foreground mb-8">Explore More</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((rp: any, i: number) => (
                <motion.div
                  key={rp.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/product/${rp.slug || rp.id}`}
                    className="group block bg-background rounded-2xl overflow-hidden border border-border hover:shadow-luxury transition-all duration-500"
                  >
                    <div className="relative overflow-hidden aspect-square">
                      <img
                        src={rp.image_url || productsBanner}
                        alt={rp.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-serif font-semibold text-sm text-foreground line-clamp-1 mb-1">
                        {rp.title}
                      </h3>
                      <p className="font-bold text-lg text-foreground"><Taka amount={rp.base_price} /></p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      
    </div>
  );
};

export default ProductDetails;
