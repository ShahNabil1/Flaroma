import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Package, MapPin, Phone, User, MessageSquare, Wallet, Minus, Plus, Trash2, Info, FileText, ShieldX, Ticket, CheckCircle, X, Banknote, Snowflake, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import productsBanner from "@/assets/products-banner.jpg";
import heroChocolate from "@/assets/hero-chocolate.jpg";
import Taka from "@/components/Taka";
import { parseCustomVariant, CustomizedBadge, CustomOrderSummary, parseAttributeVariant, AttributesSummary } from "@/components/CustomOrderDetails";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { useDeliverySettings } from "@/hooks/use-delivery-settings";
import { trackEvent, useAnalyticsInjection } from "@/hooks/use-analytics";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BD_PHONE_RE = /^01[3-9]\d{8}$/;

/** Build the order payload from cart items */
function buildOrderPayload(items: CartItem[], form: { name: string; phone: string; address: string; area: string; notes: string }, deliveryCharge: number) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const grandTotal = subtotal + deliveryCharge;
  const isSingleItem = items.length === 1;
  const firstItem = items[0];
  const safeProductId = isSingleItem && UUID_RE.test(firstItem.productId) ? firstItem.productId : null;

  let orderTitle: string;
  let orderVariant: string | null;
  let orderImage: string | null;

  if (isSingleItem) {
    orderTitle = firstItem.title;
    orderVariant = firstItem.variant || null;
    orderImage = firstItem.image || null;
  } else {
    orderTitle = `${items.length} Items Order`;
    const itemsBundle = items.map((item) => ({
      title: item.title,
      productId: item.productId,
      variant: item.variant || null,
      quantity: item.quantity,
      unitPrice: item.price,
      image: item.image || null,
    }));
    orderVariant = JSON.stringify({ __items: itemsBundle });
    orderImage = firstItem.image || null;
  }

  return {
    product_id: safeProductId,
    product_title: orderTitle,
    variant: orderVariant,
    quantity: totalItems,
    unit_price: subtotal,
    delivery_charge: deliveryCharge,
    total_amount: grandTotal,
    customer_name: form.name.trim(),
    customer_phone: form.phone.trim(),
    customer_address: form.address.trim() || "Not provided yet",
    delivery_area: form.area,
    customization_note: form.notes.trim() || null,
    image_url: orderImage,
  };
}

/** Renders a single item row in the order summary */
function SummaryItem({ item, onUpdateQuantity, onRemove }: { item: CartItem; onUpdateQuantity?: (productId: string, variant: string | undefined, qty: number) => void; onRemove?: (productId: string, variant?: string) => void }) {
  const parsed = parseCustomVariant(item.variant);
  const isCustom = parsed.isCustom;
  const displayTitle = isCustom ? "Your Custom Kunafa Box" : item.title;
  const displayImage = isCustom ? (parsed.customDesignUrl || heroChocolate) : (item.image || productsBanner);

  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-border shrink-0">
        <img src={displayImage} alt={displayTitle} className="w-full h-full object-cover" />
        {isCustom && <CustomizedBadge className="!text-[8px] !px-1.5 !py-0" />}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-serif font-semibold text-foreground text-sm line-clamp-1">{displayTitle}</h3>
          {onRemove && (
            <button onClick={() => onRemove(item.productId, item.variant)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
              <Trash2 size={12} />
            </button>
          )}
        </div>
        {isCustom ? (
          <CustomOrderSummary parsed={parsed} compact />
        ) : parseAttributeVariant(item.variant).isAttributes ? (
          <AttributesSummary variant={item.variant} compact />
        ) : (
          item.variant && <p className="text-[11px] text-muted-foreground break-words line-clamp-1">{item.variant}</p>
        )}
        <div className="flex items-center justify-between mt-0.5">
          {onUpdateQuantity ? (
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button onClick={() => onUpdateQuantity(item.productId, item.variant, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center hover:bg-muted transition-colors text-foreground">
                <Minus size={10} />
              </button>
              <span className="w-6 text-center text-xs font-semibold text-foreground">{item.quantity}</span>
              <button onClick={() => onUpdateQuantity(item.productId, item.variant, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center hover:bg-muted transition-colors text-foreground">
                <Plus size={10} />
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
          )}
          <p className="text-sm font-semibold text-foreground"><Taka amount={item.price * item.quantity} /></p>
        </div>
      </div>
    </div>
  );
}


const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { items: cartItems, clearCart, updateQuantity, removeItem, addItem } = useCart();
  const { data: deliveryAreas } = useDeliverySettings();
  const analyticsSettings = useAnalyticsInjection();

  // Track InitiateCheckout on mount
  useEffect(() => {
    if (cartItems.length > 0) {
      trackEvent("InitiateCheckout", {
        content_ids: cartItems.map((i) => i.productId),
        num_items: cartItems.reduce((s, i) => s + i.quantity, 0),
        value: cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
        currency: "BDT",
      }, analyticsSettings);
    }
  }, []); // fire once on mount

  // For URL-param "Buy Now" flow, auto-add to cart so controls work
  const hasAutoAdded = useRef(false);
  useEffect(() => {
    if (cartItems.length === 0 && !hasAutoAdded.current) {
      const productId = searchParams.get("productId") || "";
      const title = searchParams.get("title") || "Product";
      const price = Number(searchParams.get("price")) || 0;
      const quantity = Number(searchParams.get("quantity")) || 1;
      const variant = searchParams.get("variant") || "";
      const image = searchParams.get("image") || "";
      if (productId) {
        addItem({ productId, title, price, quantity, variant: variant || undefined, image: image || undefined });
        hasAutoAdded.current = true;
      }
    }
  }, [searchParams, cartItems.length, addItem]);

  const checkoutItems: CartItem[] = cartItems;

  const subtotal = checkoutItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalItems = checkoutItems.reduce((s, i) => s + i.quantity, 0);

  const FORM_STORAGE_KEY = "flaroma_checkout_form";
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { name: parsed.name || "", phone: parsed.phone || "", address: parsed.address || "", area: parsed.area || "inside_dhaka", notes: parsed.notes || "" };
      }
    } catch {}
    return { name: "", phone: "", address: "", area: "inside_dhaka", notes: "" };
  });

  // Persist form data to localStorage
  useEffect(() => {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
  }, [form]);
  const [submitting, setSubmitting] = useState(false);
  const draftIdRef = useRef<string | null>(null);
  const leadSavedRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Compute delivery charge from dynamic settings
  const deliveryCharge = useMemo(() => {
    if (!deliveryAreas || deliveryAreas.length === 0) {
      return form.area === "inside_dhaka" ? 60 : 120;
    }
    const matched = deliveryAreas.find((a) => a.area_key === form.area);
    return matched ? matched.charge : (deliveryAreas[0]?.charge ?? 0);
  }, [deliveryAreas, form.area]);

  const couponDiscount = couponApplied?.discount || 0;
  const grandTotal = Math.max(0, subtotal + deliveryCharge - couponDiscount);

  // Apply coupon handler
  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponError("");
    setCouponLoading(true);
    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !coupon) {
        setCouponError("কুপন কোডটি সঠিক নয়।");
        return;
      }
      if (coupon.min_order_amount > 0 && subtotal < coupon.min_order_amount) {
        setCouponError(`সর্বনিম্ন ৳${coupon.min_order_amount} অর্ডার করতে হবে।`);
        return;
      }
      if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
        setCouponError("এই কুপনের ব্যবহার সীমা শেষ হয়ে গেছে।");
        return;
      }
      // Check product-specific coupon
      if (coupon.product_id) {
        const hasProduct = checkoutItems.some(item => item.productId === coupon.product_id);
        if (!hasProduct) {
          setCouponError("এই কুপনটি আপনার কার্টের পণ্যে প্রযোজ্য নয়।");
          return;
        }
      }
      // Calculate discount
      let discount = 0;
      if (coupon.discount_type === "percentage") {
        discount = Math.round(subtotal * (coupon.discount_value / 100));
      } else {
        discount = coupon.discount_value;
      }
      discount = Math.min(discount, subtotal); // Cap at subtotal
      const label = coupon.discount_type === "percentage" ? `${coupon.discount_value}% off` : `৳${coupon.discount_value} off`;
      setCouponApplied({ code: coupon.code, discount, label });
    } catch {
      setCouponError("কুপন যাচাই করতে সমস্যা হয়েছে।");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
    setCouponError("");
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Silent lead capture — upserts customer as 'lead' status
  const captureLeadSilently = useCallback(async (name: string, phone: string) => {
    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedPhone.length < 11 || !BD_PHONE_RE.test(trimmedPhone)) return;
    if (leadSavedRef.current === `${trimmedPhone}:${trimmedName}`) return;

    try {
      const { data: existing } = await supabase
        .from("customers")
        .select("id, status")
        .eq("customer_phone", trimmedPhone)
        .maybeSingle();

      if (existing) {
        const updates: Record<string, unknown> = { customer_name: trimmedName };
        if (existing.status === "lead") updates.status = "lead";
        await supabase.from("customers").update(updates).eq("id", existing.id);
      } else {
        await supabase.from("customers").insert({
          customer_name: trimmedName,
          customer_phone: trimmedPhone,
          status: "lead",
          total_orders: 0,
          phone_validity_status: "pending",
          risk_level: "unknown",
          success_rate: 0,
          total_success: 0,
          total_cancel: 0,
        });
      }
      leadSavedRef.current = `${trimmedPhone}:${trimmedName}`;
    } catch (err) {
      console.error("Lead capture error:", err);
    }
  }, []);

  // Auto-save draft order silently
  const autoSaveDraft = useCallback(async (currentForm: typeof form) => {
    if (checkoutItems.length === 0) return;
    const trimmedPhone = currentForm.phone.trim();
    const trimmedName = currentForm.name.trim();
    if (!trimmedName || !BD_PHONE_RE.test(trimmedPhone)) return;

    try {
      const currentDeliveryCharge = (() => {
        if (!deliveryAreas || deliveryAreas.length === 0) {
          return currentForm.area === "inside_dhaka" ? 60 : 120;
        }
        const matched = deliveryAreas.find((a) => a.area_key === currentForm.area);
        return matched ? matched.charge : (deliveryAreas[0]?.charge ?? 0);
      })();
      const payload = buildOrderPayload(checkoutItems, currentForm, currentDeliveryCharge);

      if (draftIdRef.current) {
        // Update existing draft
        await supabase
          .from("orders")
          .update({
            ...payload,
            status: "draft",
            updated_at: new Date().toISOString(),
          })
          .eq("id", draftIdRef.current)
          .eq("status", "draft"); // safety: only update if still draft
      } else {
        // Check if a draft already exists for this phone
        const { data: existingDraft } = await supabase
          .from("orders")
          .select("id")
          .eq("customer_phone", trimmedPhone)
          .eq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingDraft) {
          draftIdRef.current = existingDraft.id;
          await supabase
            .from("orders")
            .update({
              ...payload,
              status: "draft",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingDraft.id);
        } else {
          // Insert new draft
          const { data: newDraft } = await supabase
            .from("orders")
            .insert({ ...payload, status: "draft" })
            .select("id")
            .single();
          if (newDraft) draftIdRef.current = newDraft.id;
        }
      }
    } catch (err) {
      console.error("Draft auto-save error:", err);
    }
  }, [checkoutItems]);

  // Debounced auto-save on form changes (name/phone/address/area)
  useEffect(() => {
    if (!form.name.trim() || !BD_PHONE_RE.test(form.phone.trim()) || checkoutItems.length === 0) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveDraft(form);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [form.name, form.phone, form.address, form.area, form.notes, autoSaveDraft, form, checkoutItems.length]);

  // CRM upsert on successful order
  const upsertCustomerOnOrder = async (name: string, phone: string) => {
    if (!name.trim() || !BD_PHONE_RE.test(phone.trim())) return;
    try {
      const { data: existing } = await supabase
        .from("customers")
        .select("id, total_orders")
        .eq("customer_phone", phone.trim())
        .maybeSingle();

      if (existing) {
        await supabase.from("customers").update({
          customer_name: name.trim(),
          status: "active",
          total_orders: (existing.total_orders || 0) + 1,
        }).eq("id", existing.id);
      } else {
        await supabase.from("customers").insert({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          status: "active",
          total_orders: 1,
          phone_validity_status: "pending",
          risk_level: "unknown",
          success_rate: 0,
          total_success: 0,
          total_cancel: 0,
        });
      }
    } catch (err) {
      console.error("CRM upsert error:", err);
    }
  };

  // onBlur handler — triggers lead capture + immediate draft save
  const handleLeadBlur = () => {
    captureLeadSilently(form.name, form.phone);
    // Also trigger immediate draft save (clear any pending debounce)
    if (form.name.trim() && BD_PHONE_RE.test(form.phone.trim()) && checkoutItems.length > 0) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveDraft(form);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    if (!BD_PHONE_RE.test(form.phone.trim())) {
      toast({ title: "Please enter a valid Bangladeshi phone number", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...buildOrderPayload(checkoutItems, form, deliveryCharge),
        discount: couponDiscount,
        coupon_code: couponApplied?.code || null,
        discount_from_coupon: couponDiscount,
        total_amount: grandTotal,
      };

      let orderId: string | null = draftIdRef.current;

      if (draftIdRef.current) {
        const { error } = await supabase
          .from("orders")
          .update({
            ...payload,
            status: "draft",
            updated_at: new Date().toISOString(),
          })
          .eq("id", draftIdRef.current)
          .eq("status", "draft");
        if (error) throw error;
        orderId = draftIdRef.current;
      } else {
        const { data: newOrder, error } = await supabase.from("orders").insert({
          ...payload,
          status: "draft",
        }).select("id").single();
        if (error) throw error;
        orderId = newOrder?.id || null;
      }

      if (!orderId) throw new Error("Order creation failed");

      // Increment coupon used_count
      if (couponApplied) {
        try {
          const { data: couponRow } = await supabase
            .from("coupons")
            .select("used_count")
            .eq("code", couponApplied.code)
            .maybeSingle();
          if (couponRow) {
            await supabase
              .from("coupons")
              .update({ used_count: (couponRow.used_count || 0) + 1 } as any)
              .eq("code", couponApplied.code);
          }
        } catch { /* non-critical */ }
      }

      // Cash on Delivery — finalize order as pending immediately
      const finalizeUpdate = {
        status: "pending",
        payment_status: "cod",
        updated_at: new Date().toISOString(),
      };

      const { error: finalErr } = await supabase
        .from("orders")
        .update(finalizeUpdate)
        .eq("id", orderId);

      if (finalErr) {
        // Fallback: log but continue — order exists as draft, admin can recover
        console.error("Finalize order error:", finalErr);
      }

      // CRM upsert on successful order
      await upsertCustomerOnOrder(form.name, form.phone);

      // Track Purchase event
      trackEvent("Purchase", {
        content_name: checkoutItems[0]?.title || "Order",
        value: grandTotal,
        currency: "BDT",
        num_items: totalItems,
      }, analyticsSettings);

      // Prepare state for OrderConfirmed page
      const orderState = {
        orderId,
        name: form.name.trim(),
        total: grandTotal,
        title: checkoutItems.length === 1 ? checkoutItems[0].title : `${checkoutItems.length} Items Order`,
        variant: checkoutItems.length === 1 ? checkoutItems[0].variant : null,
        quantity: totalItems,
        deliveryCharge,
        subtotal,
        image: checkoutItems[0]?.image || null,
      };

      // Clear cart and draft ref, navigate to confirmation
      clearCart();
      localStorage.removeItem(FORM_STORAGE_KEY);
      draftIdRef.current = null;
      navigate("/order-confirmed", { state: orderState });
      return;
    } catch (err: any) {
      toast({ title: "Order failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbTitle = checkoutItems.length === 1
    ? (parseCustomVariant(checkoutItems[0].variant).isCustom ? "Your Custom Kunafa Box" : checkoutItems[0].title)
    : "Your Cart";

  const isOrderDisabled = submitting || checkoutItems.length === 0;

  return (
    <div className="min-h-screen bg-background">

      <div
        className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16"
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-foreground transition-colors shrink-0">Home</Link>
          <ChevronRight size={14} className="shrink-0" />
          <span className="truncate max-w-[160px] sm:max-w-none">{breadcrumbTitle}</span>
          <ChevronRight size={14} className="shrink-0" />
          <span className="text-foreground font-medium shrink-0">Checkout</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-foreground mb-6 sm:mb-10">
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-14 items-start">
          {/* Order Summary */}
          <div className="lg:col-span-2 order-first lg:order-last">
            <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border space-y-4 sm:space-y-5">
              <h2 className="text-base sm:text-lg font-serif font-bold text-foreground">
                Order Summary
                {totalItems > 1 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({totalItems} items)</span>
                )}
              </h2>

              <div className="space-y-3 max-h-[40vh] lg:max-h-[50vh] overflow-y-auto pr-1">
                {checkoutItems.map((item, idx) => (
                  <SummaryItem key={`${item.productId}-${item.variant || idx}`} item={item} onUpdateQuantity={updateQuantity} onRemove={removeItem} />
                ))}
              </div>

              {/* Coupon Code Input */}
              <div className="border-t border-border pt-3">
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-600" />
                      <div>
                        <span className="text-xs font-bold text-green-800 font-mono">{couponApplied.code}</span>
                        <span className="text-xs text-green-600 ml-1.5">— {couponApplied.label}</span>
                      </div>
                    </div>
                    <button onClick={removeCoupon} className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Ticket size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="কুপন কোড"
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                          className="pl-9 h-10 text-sm font-mono tracking-wider"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 px-4 text-xs font-semibold"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                      >
                        {couponLoading ? "..." : "Apply"}
                      </Button>
                    </div>
                    {couponError && <p className="text-xs text-destructive mt-1.5">{couponError}</p>}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 sm:pt-4 space-y-2.5 sm:space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <Taka amount={subtotal} />
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <Taka amount={deliveryCharge} />
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span>-<Taka amount={couponDiscount} /></span>
                  </div>
                )}
                <div className="flex justify-between text-foreground font-bold text-base sm:text-lg pt-2 border-t border-border">
                  <span>Total</span>
                  <Taka amount={grandTotal} />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground text-center">
                💵 ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে পরিশোধ করুন
              </p>
            </div>

            {/* Important Notices */}
            <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-card border border-border border-l-4 border-l-gold shadow-sm space-y-3">
              <h3 className="font-serif font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                <Info size={16} className="text-gold shrink-0" />
                অর্ডার সংক্রান্ত জরুরি তথ্য
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-[13px] text-muted-foreground font-bengali leading-relaxed">
                <li className="flex gap-2">
                  <Banknote size={14} className="text-gold shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">পেমেন্ট পদ্ধতি:</strong> সম্পূর্ণ মূল্য ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে পরিশোধ করুন, এক টাকাও অগ্রিম নয়।</span>
                </li>
                <li className="flex gap-2">
                  <XCircle size={14} className="text-gold shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">অর্ডার ক্যান্সেলেশন:</strong> কনফার্ম হওয়ার পরে অর্ডার ক্যান্সেল করা যাবে না। ক্যান্সেল করতে চাইলে অবশ্যই ফুল পেমেন্ট পরিশোধ করে ক্যান্সেল করতে হবে।</span>
                </li>
                <li className="flex gap-2">
                  <Snowflake size={14} className="text-gold shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">সংরক্ষণ পরামর্শ:</strong> পণ্য হাতে পাওয়ার পরে অবশ্যই ২-৩ ঘন্টা রেফ্রিজারেট করে ঠান্ডা করে খাবেন — সেরা স্বাদ পাওয়ার জন্য।</span>
                </li>
                <li className="flex gap-2">
                  <Clock size={14} className="text-gold shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">ডেলিভারি সময়:</strong> ঢাকার ভিতরে ১-২ দিন, ঢাকার বাইরে ২-৩ দিনের মধ্যে পণ্য পৌঁছে যাবে।</span>
                </li>
                <li className="flex gap-2">
                  <Package size={14} className="text-gold shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">প্যাকেজিং:</strong> সতেজতা রক্ষার্থে বিশেষ ইনসুলেটেড প্যাকেজিং-এ পণ্য পাঠানো হবে।</span>
                </li>
                <li className="flex gap-2">
                  <ShieldX size={14} className="text-gold shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">রিফান্ড ও রিটার্ন:</strong> খাদ্য পণ্য হওয়ায় পণ্যের গুণগত মান রক্ষায় কোনো রিটার্ন বা রিফান্ড প্রযোজ্য নয়।</span>
                </li>
              </ul>
            </div>

            {/* Payment Method Trust Badge */}
            <div className="mt-5 p-5 rounded-2xl bg-gradient-to-br from-[hsl(var(--gold)/0.08)] to-[hsl(var(--gold)/0.02)] border border-[hsl(var(--gold)/0.25)] shadow-sm">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold-dark))] flex items-center justify-center shadow-md">
                  <Banknote size={26} className="text-primary-foreground" strokeWidth={2.2} />
                </div>
                <div>
                  <p className="font-serif font-bold text-sm sm:text-base text-foreground">
                    ক্যাশ অন ডেলিভারি
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-bengali leading-relaxed">
                    পণ্য হাতে পেয়ে সম্পূর্ণ মূল্য পরিশোধ<br />
                    <span className="text-[hsl(var(--gold-dark))] font-semibold">এক টাকাও অগ্রিম নয়</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="lg:col-span-3 order-last lg:order-first space-y-5 sm:space-y-6"
          >
            <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border space-y-4 sm:space-y-5">
              <h2 className="text-base sm:text-lg font-serif font-bold text-foreground flex items-center gap-2">
                <User size={18} className="text-gold" />
                Delivery Information
              </h2>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="আপনার নাম"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={handleLeadBlur}
                  maxLength={100}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone size={14} /> Phone Number *
                </Label>
                <Input
                  id="phone"
                  placeholder="01XXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  onBlur={handleLeadBlur}
                  maxLength={11}
                  className="w-full font-[Inter,sans-serif]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-1.5">
                  <MapPin size={14} /> Delivery Address *
                </Label>
                <Textarea
                  id="address"
                  placeholder="সম্পূর্ণ ঠিকানা লিখুন"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Area *</Label>
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  {(deliveryAreas && deliveryAreas.length > 0
                    ? deliveryAreas.map((a) => ({ value: a.area_key, label: `${a.area_name} ${a.display_text}` }))
                    : [
                        { value: "inside_dhaka", label: "ঢাকার ভেতরে (৳60)" },
                        { value: "outside_dhaka", label: "ঢাকার বাইরে (৳120)" },
                      ]
                  ).map((opt) => (
                    <motion.button
                      type="button"
                      key={opt.value}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleChange("area", opt.value)}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-colors duration-300 ${
                        form.area === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40"
                      }`}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
              </div>
            </div>

            {/* Payment Method — COD Only, Locked */}
            <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border space-y-4 sm:space-y-5">
              <h2 className="text-base sm:text-lg font-serif font-bold text-foreground flex items-center gap-2">
                <Banknote size={18} className="text-gold" />
                Payment Method
              </h2>

              <div className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left border-2 border-primary bg-primary/5 cursor-default">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold-dark))] text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                  <Banknote size={22} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-1.5">
                    ক্যাশ অন ডেলিভারি
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold-dark))] uppercase tracking-wide">COD</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-bengali">
                    পণ্য হাতে পেয়ে <Taka amount={grandTotal} /> পরিশোধ করুন
                  </p>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                </div>
              </div>
            </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-1.5">
                  <MessageSquare size={14} /> Customization Details (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="বিশেষ কোনো নির্দেশনা থাকলে লিখুন"
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="btn-premium-pay w-full h-14 sm:h-14 text-base sm:text-base rounded-xl gap-2 font-semibold"
              disabled={isOrderDisabled}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span className="animate-pulse">Placing Order...</span>
                </div>
              ) : (
                <>
                  <Banknote size={18} />
                  <span>Place Order (COD)</span> — <Taka amount={grandTotal} />
                </>
              )}
            </Button>
          </motion.form>
        </div>

        <div className="mt-6 sm:mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={14} /> Continue Shopping
          </Link>
        </div>
      </div>

      
    </div>
  );
};

export default Checkout;
