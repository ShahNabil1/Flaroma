import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import loginChocolate from "@/assets/admin-login-chocolate.png";
import flaromaLogo from "@/assets/flaroma-logo.png";

/* ── Flaroma Logo ── */
const FlaromaLogo = () =>
  <img src={flaromaLogo} alt="Flaroma logo" className="w-24 h-24 sm:w-28 sm:h-28 mx-auto drop-shadow-lg object-contain" />;


const AdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [requestSent, setRequestSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const res = await fetch(
          "https://ptxenyhuztiaexwdcecl.supabase.co/functions/v1/admin-users?action=my-permissions",
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`
            }
          }
        );
        if (res.ok) {
          navigate("/admin/dashboard");
        } else {
          setChecking(false);
        }
      } else {
        setChecking(false);
      }
    });

    supabase.auth.getSession();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/admin" }
    });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    setRequestLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin + "/admin?request=true" }
        });
        if (error) throw error;
        return;
      }

      const res = await fetch(
        "https://ptxenyhuztiaexwdcecl.supabase.co/functions/v1/admin-users?action=request-access",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (res.ok) {
        setRequestSent(true);
      } else {
        const data = await res.json();
        if (data.error === "Already an admin") {
          navigate("/admin/dashboard");
        } else {
          throw new Error(data.error || "Request failed");
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRequestLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("request") === "true" && !requestSent && !checking) {
      const timer = setTimeout(() => handleRequestAccess(), 1000);
      return () => clearTimeout(timer);
    }
  }, [checking]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>);

  }

  return (
    <div className="relative min-h-screen flex">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat"
        }} />


      {/* ── Left: Moody chocolate image (desktop only) ── */}
      <div className="hidden md:block md:w-[45%] lg:w-1/2 relative overflow-hidden">
        <img
          src={loginChocolate}
          alt="Artisan chocolate close-up"
          className="absolute inset-0 w-full h-full object-cover" />

        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-primary/40" />
        {/* Center attribution */}
        <div className="absolute top-8 left-8 right-8 flex justify-center">
          <p
            className="font-serif italic text-5xl font-bold text-cream/90 text-left"
            style={{ textShadow: "0 4px 20px hsl(var(--primary) / 0.7)" }}>

            "Handcrafted with intention,<br />delivered with care."
          </p>
        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10 relative"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, hsl(var(--gold) / 0.04) 0%, transparent 60%),
            hsl(var(--cream))
          `
        }}>

        {/* Subtle paper texture lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 31px,
              hsl(var(--primary) / 0.3) 31px,
              hsl(var(--primary) / 0.3) 32px
            )`
          }} />


        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-sm relative z-10">

          {/* Artisanal card with hand-cut feel */}
          <div
            className="p-8 sm:p-10 space-y-8 text-center"
            style={{
              background: "hsl(var(--cream) / 0.85)",
              border: "1.5px solid hsl(var(--chocolate-light) / 0.35)",
              borderRadius: "12px 4px 14px 6px",
              boxShadow: "4px 6px 20px hsl(var(--primary) / 0.08)"
            }}>

            {/* Wax Seal Logo */}
            <motion.div
              initial={{ scale: 0.8, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}>

              <FlaromaLogo />
            </motion.div>

            {/* Title */}
            <div className="space-y-2">
              <h1
                className="text-3xl font-serif font-bold text-foreground italic"
                style={{ letterSpacing: "0.08em" }}>

                Flaroma
              </h1>
              <p
                className="text-xs font-sans uppercase text-muted-foreground"
                style={{ letterSpacing: "0.25em" }}>

                Administration
              </p>
            </div>

            {/* Google Sign In — stamped look */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group relative w-full h-12 flex items-center justify-center gap-2.5 font-sans text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              style={{
                background: "hsl(var(--primary))",
                borderRadius: "6px 2px 8px 3px",
                border: "1px solid hsl(var(--chocolate-light) / 0.5)",
                boxShadow: "2px 3px 0px hsl(var(--primary) / 0.3)"
              }}>

              {/* Hover overlay */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "hsl(var(--chocolate-light))",
                  borderRadius: "inherit"
                }} />

              <span className="relative flex items-center gap-2.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {loading ? "Redirecting…" : "Sign in with Google"}
              </span>
            </button>

            {/* Request Access / Pending State */}
            <AnimatePresence mode="wait">
              {requestSent ?
              <motion.div
                key="postal"
                initial={{ opacity: 0, rotateX: 90 }}
                animate={{ opacity: 1, rotateX: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="relative p-6 space-y-3"
                style={{
                  background: "linear-gradient(145deg, hsl(var(--cream)) 0%, hsl(var(--cream-dark) / 0.6) 100%)",
                  border: "1.5px dashed hsl(var(--gold-dark) / 0.4)",
                  borderRadius: "3px 10px 5px 12px"
                }}>

                  {/* Stamp corner */}
                  <div
                  className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center"
                  style={{
                    border: "2px solid hsl(var(--gold-dark) / 0.3)",
                    borderRadius: "2px"
                  }}>

                    <motion.div
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>

                      <Mail className="text-gold-dark" size={16} />
                    </motion.div>
                  </div>

                  <p className="text-sm font-bengali leading-relaxed text-foreground/90 pt-2">
                    আপনার রিকোয়েস্টটি আমরা হাতে পেয়েছি।
                  </p>
                  <p className="text-xs font-bengali text-muted-foreground leading-relaxed">
                    খুব শীঘ্রই আপনাকে জানানো হবে।
                  </p>
                  <div className="pt-2">
                    <span
                    className="inline-block text-[10px] uppercase font-sans text-gold-dark"
                    style={{ letterSpacing: "0.2em" }}>

                      — Flaroma Team
                    </span>
                  </div>
                </motion.div> :

              <motion.div key="request" className="pt-1">
                  <button
                  onClick={handleRequestAccess}
                  disabled={requestLoading}
                  className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 font-sans">

                    <UserPlus size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                    <span className="relative">
                      {requestLoading ? "Processing…" : "Request Access"}
                      {/* Handwritten-style underline */}
                      <span
                      className="absolute -bottom-0.5 left-0 w-full h-[1.5px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                      style={{
                        background: "hsl(var(--foreground) / 0.4)",
                        borderRadius: "1px",
                        transform: "rotate(-0.5deg)"
                      }} />

                    </span>
                  </button>
                </motion.div>
              }
            </AnimatePresence>

            {/* Footer note */}
            <p className="text-[10px] text-muted-foreground/50 font-sans leading-relaxed pt-2">
              Only authorized artisans may enter.
            </p>
          </div>
        </motion.div>
      </div>
    </div>);

};

export default AdminLogin;