import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Instagram, Package, ChefHat, ShieldCheck, Truck } from "lucide-react";
import flaromaLogo from "@/assets/flaroma-logo.png";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Taka from "@/components/Taka";
import { trackEvent, useAnalyticsInjection } from "@/hooks/use-analytics";

interface OrderState {
  orderId?: string;
  name?: string;
  total?: number;
  title?: string;
  variant?: string;
  quantity?: number;
  deliveryCharge?: number;
  unitPrice?: number;
  subtotal?: number;
  image?: string;
}

interface OrderData {
  name: string;
  total: number;
  title: string;
  variant: string | null;
  quantity: number;
  deliveryCharge: number;
  subtotal: number;
  image: string | null;
  orderId: string | null;
}

const TIMELINE_STEPS = [
{ icon: Package, label: "অর্ডার গৃহীত", sublabel: "Order Received", active: true },
{ icon: ChefHat, label: "তৈরি হচ্ছে", sublabel: "Handcrafting", active: false },
{ icon: ShieldCheck, label: "কোয়ালিটি চেক", sublabel: "Quality Check", active: false },
{ icon: Truck, label: "ডেলিভারিতে", sublabel: "Out for Delivery", active: false }];


const OrderConfirmed = () => {
  const location = useLocation();
  const state = location.state as OrderState || {};
  const analyticsSettings = useAnalyticsInjection();
  const purchaseTracked = useRef(false);

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (state.title && state.total) {
      const dc = state.deliveryCharge || 0;
      const sub = state.subtotal ?? state.total - dc;

      setOrderData({
        orderId: state.orderId || null,
        name: state.name || "",
        total: state.total,
        title: state.title,
        variant: state.variant || null,
        quantity: state.quantity || 1,
        deliveryCharge: dc,
        subtotal: sub,
        image: state.image || null
      });

      // Track Purchase event once
      if (!purchaseTracked.current) {
        purchaseTracked.current = true;
        trackEvent("Purchase", {
          content_name: state.title,
          value: state.total,
          currency: "BDT",
          num_items: state.quantity || 1,
        }, analyticsSettings);
      }

      setLoading(false);
      return;
    }

    setNotFound(true);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 pt-28 pb-16">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-16 w-16 rounded-full mx-auto" />
              <Skeleton className="h-8 w-64 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>


      </div>);

  }

  if (notFound || !orderData) {
    return (
      <div className="min-h-screen bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 pt-28 pb-16">

          <div className="max-w-md mx-auto text-center">
            <div className="text-6xl mb-6 select-none">🍫</div>
            <h1 className="text-2xl font-serif font-bold text-foreground mb-3">
              Looking for your order?
            </h1>
            <p className="text-muted-foreground text-sm mb-8">
              Order details are no longer available on this page. Don't worry — your order has been placed successfully!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/">
                <Button size="lg" className="rounded-xl gap-2 px-8">
                  <ShoppingBag size={18} />
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>


      </div>);

  }

  const d = orderData;

  return (
    <div className="min-h-screen bg-background">

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16">

        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-center mb-10">

            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mb-6 select-none"
              aria-hidden>

              <img src={flaromaLogo} alt="Flaroma" className="w-20 h-20 object-contain mx-auto drop-shadow-lg" />
            </motion.div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
              আপনার মিষ্টি মুহূর্তের প্রস্তুতি শুরু হলো!
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              ধন্যবাদ{d.name ? `, ${d.name}` : ""}! আমাদের কারিগররা এখন আপনার জন্য ফ্রেশ কুনাফা চকোলেট তৈরি করা শুরু করবে।
            </p>
          </motion.div>

          {/* Order Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm mb-8">

            {/* Card Header */}
            <div className="px-4 sm:px-6 py-4 bg-primary text-primary-foreground flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">অর্ডার সামারি</p>
                <p className="font-serif font-bold text-lg">Order Summary</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70">Flaroma</p>
                <p className="text-xs opacity-70">Artisanal Chocolates</p>
              </div>
            </div>

            {/* Product Row */}
            <div className="px-4 sm:px-6 py-5">
              <div className="flex items-start gap-3 sm:gap-4">
                {d.image &&
                <img
                  src={d.image}
                  alt={d.title}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-border shrink-0" />

                }
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-semibold text-foreground text-sm sm:text-base">{d.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    {d.variant &&
                    <span className="bg-muted px-2 py-0.5 rounded truncate max-w-[200px]">{d.variant}</span>
                    }
                    <span className="font-num">Qty: {d.quantity}</span>
                  </div>
                </div>
                <p className="font-semibold text-foreground shrink-0">
                  <Taka amount={d.subtotal} />
                </p>
              </div>

              {/* Dashed Divider */}
              <div className="my-4 border-t border-dashed border-border" />

              {/* Pricing */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <Taka amount={d.subtotal} />
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Charge</span>
                  <Taka amount={d.deliveryCharge} />
                </div>
                <div className="flex justify-between font-bold text-base sm:text-lg text-foreground pt-1 border-t border-border">
                  <span className="font-serif">Total</span>
                  <span className="text-[hsl(var(--gold-dark))]">
                    <Taka amount={d.total} />
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mt-4 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 text-center">
                💵 Cash on Delivery (COD)
              </div>
            </div>
          </motion.div>

          {/* Progress Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-card border border-border rounded-2xl p-4 sm:p-6 mb-8">

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5 text-center">
              ❤ Made Fresh Just For You ❤ 
            </p>

            <div className="flex items-start justify-between relative">
              {/* Connector Line */}
              <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-border z-0" />
              <div
                className="absolute top-5 left-[10%] h-0.5 bg-[hsl(var(--gold))] z-[1]"
                style={{ width: "5%" }} />


              {TIMELINE_STEPS.map((step, i) =>
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex flex-col items-center text-center z-10 flex-1">

                  <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-2 ${
                  step.active ?
                  "bg-[hsl(var(--gold))] text-white shadow-md" :
                  "bg-muted text-muted-foreground"}`
                  }>

                    <step.icon size={16} />
                  </div>
                  <p
                  className={`text-[10px] sm:text-xs font-medium leading-tight ${
                  step.active ? "text-foreground" : "text-muted-foreground"}`
                  }>

                    {step.label}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 mt-0.5">{step.sublabel}</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Personal Touch */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="bg-[hsl(var(--gold)/0.08)] border border-[hsl(var(--gold)/0.2)] rounded-2xl p-4 sm:p-5 mb-8 text-center">

            <p className="text-sm text-foreground leading-relaxed">
              🍫 আমরা আপনার অর্ডার পেয়েছি! আমাদের কারিগররা এখন ভালোবাসা দিয়ে আপনার ফ্রেশ কুনাফা চকোলেট তৈরি শুরু করবে।
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              We'll contact you shortly to confirm delivery details.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3">

            <Link to="/">
              <Button size="lg" className="rounded-xl gap-2 px-8">
                <ShoppingBag size={18} />
                Continue Shopping
              </Button>
            </Link>
            <a
              href="https://www.instagram.com/flaroma19/"
              target="_blank"
              rel="noopener noreferrer">

              <Button
                size="lg"
                variant="outline"
                className="rounded-xl gap-2 px-8 border-[hsl(var(--strawberry)/0.3)] text-[hsl(var(--strawberry))] hover:bg-[hsl(var(--strawberry)/0.05)]">

                <Instagram size={18} />
                Share on Instagram
              </Button>
            </a>
          </motion.div>
        </div>
      </motion.div>

      
    </div>);

};

export default OrderConfirmed;