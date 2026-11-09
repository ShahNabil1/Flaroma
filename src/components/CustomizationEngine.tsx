import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ArrowLeft, ShoppingBag, Loader2, MessageSquare, StickyNote, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import Taka from "@/components/Taka";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import darkChocolateImg from "@/assets/bases/dark-chocolate.webp";
import milkChocolateImg from "@/assets/bases/milk-chocolate.jpg";
import whiteChocolateImg from "@/assets/bases/white-chocolate.png";

interface BuildOption {
  id: string;
  step_id: string;
  name: string;
  name_bn: string | null;
  emoji: string | null;
  image_url: string | null;
  price: number;
  is_premium: boolean;
  sort_order: number;
  enable_color_selection: boolean;
}

interface BuildStep {
  id: string;
  title: string;
  title_bn: string | null;
  sort_order: number;
  max_selections: number;
  options: BuildOption[];
}

interface BuildFlowSettings {
  title: string;
  title_bn: string;
  badge_text: string;
  base_price: number;
}

const defaultSettings: BuildFlowSettings = {
  title: "Build Your Own Chocolate",
  title_bn: "আপনার পছন্দমতো বেস, ফিলিং আর টপিং বেছে নিন।",
  badge_text: "Customize",
  base_price: 750,
};

const DESIGN_COLORS = [
  { name: "No Color", value: "none" },
  { name: "Gold", value: "#D4AF37" },
  { name: "Rose Pink", value: "#EC4899" },
  { name: "White", value: "#FFFFFF" },
  { name: "Red", value: "#E11D48" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#22C55E" },
  { name: "Orange", value: "#F97316" },
];

const CLOUD_NAME = "dvfb58wu4";
const UPLOAD_PRESET = "flaroma_upload";

const HARDCODED_BASES = [
  { id: "dark", name: "Dark Chocolate", name_bn: "ডার্ক চকলেট", image: darkChocolateImg, price: 0 },
  { id: "milk", name: "Milk Chocolate", name_bn: "মিল্ক চকলেট", image: milkChocolateImg, price: 0 },
  { id: "white", name: "White Chocolate", name_bn: "হোয়াইট চকলেট", image: whiteChocolateImg, price: 0 },
];

const STEP_LABELS = ["Choose Base", "Choose Design", "Design Color", "Personalize"];

const CustomizationEngine = () => {
  const [step, setStep] = useState(0);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [uploadedDesignUrl, setUploadedDesignUrl] = useState<string | null>(null);
  const [designColor, setDesignColor] = useState("none");
  const [message, setMessage] = useState("");
  const [specialNote, setSpecialNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const { addItem, openCart } = useCart();

  const { data: dbSteps = [], isLoading } = useQuery({
    queryKey: ["build-flow-public"],
    queryFn: async () => {
      const { data: stepsData } = await supabase.from("build_flow_steps").select("*").order("sort_order");
      if (!stepsData?.length) return [];
      const { data: optsData } = await supabase.from("build_flow_options").select("*").order("sort_order");
      return (stepsData as any[]).map((s) => ({
        ...s,
        options: (optsData as any[] || []).filter((o: any) => o.step_id === s.id),
      })) as BuildStep[];
    },
  });

  const { data: settings = defaultSettings } = useQuery({
    queryKey: ["build-flow-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "build_flow").single();
      return data ? { ...defaultSettings, ...(data.value as any) } : defaultSettings;
    },
  });

  // Map DB steps: first = Base options, second = Design catalog
  const designStep = dbSteps.find(s => s.sort_order === 1) || dbSteps.find(s => s.title?.toLowerCase().includes("design")) || null;

  const getOption = (step: BuildStep | null, id: string | null) =>
    step?.options.find((o) => o.id === id) || null;

  const selectedBase = HARDCODED_BASES.find((b) => b.id === selectedBaseId) || null;
  const selectedDesign = getOption(designStep, selectedDesignId);

  const getBasePrice = (baseId: string) => {
    const prices = (settings as any).base_prices as Record<string, number> | undefined;
    return prices?.[baseId] ?? 0;
  };

  const calculateTotal = () => {
    let total = settings.base_price;
    if (selectedBase) total += getBasePrice(selectedBase.id);
    if (selectedDesign) total += selectedDesign.price;
    return total;
  };

  const handleUploadDesign = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.secure_url) {
        setUploadedDesignUrl(data.secure_url);
        setSelectedDesignId(null);
        setStepError(null);
        toast({ title: "Design uploaded!" });
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSelectCatalogDesign = (optionId: string) => {
    setSelectedDesignId(optionId);
    setUploadedDesignUrl(null);
    setStepError(null);
  };

  const buildCustomizationJson = () => {
    const details: Record<string, any> = {};
    if (selectedBase) details["Base"] = selectedBase.name;
    if (selectedDesign) details["Design"] = selectedDesign.name;
    if (uploadedDesignUrl) details["Custom Design"] = uploadedDesignUrl;
    const colorObj = DESIGN_COLORS.find((c) => c.value === designColor);
    details["Design Color"] = colorObj?.name || "No Color";
    if (message.trim()) details["Message"] = message.trim();
    if (specialNote.trim()) details["Special Note"] = specialNote.trim();
    return details;
  };

  const handleAddToCart = () => {
    const total = calculateTotal();
    const customJson = buildCustomizationJson();
    const desc = Object.entries(customJson)
      .filter(([k]) => k !== "Custom Design")
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ");

    addItem({
      productId: "custom-kunafa-box",
      title: "Custom Chocolate Box",
      price: total,
      quantity: 1,
      variant: JSON.stringify(customJson),
    });
    openCart();
    toast({ title: "Added to cart!", description: desc });
    // Reset
    setStep(0);
    setSelectedBaseId(null);
    setSelectedDesignId(null);
    setUploadedDesignUrl(null);
    setDesignColor("none");
    setMessage("");
    setSpecialNote("");
  };

  const totalPrice = calculateTotal();
  const colorName = DESIGN_COLORS.find((c) => c.value === designColor)?.name || "No Color";

  if (isLoading) {
    return (
      <section id="customize" className="pt-10 sm:pt-16 md:pt-24 pb-10 sm:pb-16 md:pb-24">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} /> Loading...
        </div>
      </section>
    );
  }

  // DB steps are only needed for design catalog (step 2)

  return (
    <section id="customize" className="pt-4 sm:pt-16 md:pt-24 pb-10 sm:pb-16 md:pb-24">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-gold-dark">
            {settings.badge_text}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-foreground mt-3 mb-4">
            {settings.title}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">{settings.title_bn}</p>
        </motion.div>

        {/* 4-Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-12 px-4 overflow-hidden">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Only allow going back or to already-completed steps
                  if (i <= step) { setStep(i); setStepError(null); }
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shrink-0 ${
                  i === step
                    ? "bg-[#E11D48] text-white scale-110 shadow-lg"
                    : i < step
                    ? "bg-gold text-accent-foreground cursor-pointer"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {i < step ? <Check size={16} /> : i + 1}
              </button>
              {i < 3 && (
                <div className={`w-8 sm:w-12 h-0.5 ${i < step ? "bg-gold" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Step 1: Choose Base */}
              {step === 0 && (
                <motion.div key="base" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <h3 className="font-serif font-bold text-lg text-[#3D2314] mb-1">Select Chocolate Type</h3>
                  <p className="text-sm text-muted-foreground mb-5">চকোলেট এর ধরণ নির্বাচন</p>
                  <div className="grid grid-cols-3 gap-4">
                    {HARDCODED_BASES.map((base) => {
                      const isSelected = selectedBaseId === base.id;
                      return (
                        <button
                          key={base.id}
                          onClick={() => { setSelectedBaseId(base.id); setStepError(null); }}
                          className={`relative p-4 rounded-2xl border-2 text-center transition-all duration-300 ${
                            isSelected
                              ? "border-[#E11D48] bg-[#E11D48]/5 shadow-lg ring-1 ring-[#E11D48]/20"
                              : "border-border bg-background hover:border-[#E11D48]/40 hover:shadow-md"
                          }`}
                        >
                          <img src={base.image} alt={base.name} className="w-20 h-20 rounded-xl object-cover mx-auto mb-3" />
                          <p className="font-serif font-semibold text-sm text-[#3D2314]">{base.name}</p>
                          <p className="text-xs text-muted-foreground">{base.name_bn}</p>
                          {getBasePrice(base.id) > 0 && (
                            <p className="text-xs text-[#E11D48] mt-1 font-semibold">+<Taka amount={getBasePrice(base.id)} /></p>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-[#E11D48] rounded-full flex items-center justify-center">
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Choose Design (Catalog + Upload) */}
              {step === 1 && (
                <motion.div key="design" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                  <h3 className="font-serif font-bold text-lg text-[#3D2314]">
                    {designStep?.title || "Choose Design"}
                  </h3>
                  {designStep?.title_bn && <p className="text-sm text-muted-foreground">{designStep.title_bn}</p>}

                  {/* Catalog Grid */}
                  {designStep && designStep.options.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {designStep.options.map((opt) => {
                        const isSelected = selectedDesignId === opt.id && !uploadedDesignUrl;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleSelectCatalogDesign(opt.id)}
                            className={`relative p-3 rounded-2xl border-2 text-center transition-all duration-300 ${
                              isSelected
                                ? "border-[#E11D48] bg-[#E11D48]/5 shadow-lg ring-1 ring-[#E11D48]/20"
                                : "border-border bg-background hover:border-[#E11D48]/40 hover:shadow-md"
                            }`}
                          >
                            {opt.image_url ? (
                              <img src={opt.image_url} alt={opt.name} className="w-full aspect-square rounded-xl object-cover mb-2" />
                            ) : (
                              <span className="text-3xl mb-2 block">{opt.emoji || "🎨"}</span>
                            )}
                            <p className="font-serif font-semibold text-xs text-[#3D2314]">{opt.name}</p>
                            {opt.price > 0 && (
                              <p className="text-xs text-[#E11D48] mt-1 font-semibold">+<Taka amount={opt.price} /></p>
                            )}
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-[#E11D48] rounded-full flex items-center justify-center">
                                <Check size={10} className="text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Upload Custom Design */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Or upload your own</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <label
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
                      uploadedDesignUrl
                        ? "border-[#E11D48] bg-[#E11D48]/5"
                        : "border-border hover:border-[#E11D48]/40 hover:bg-muted/30"
                    }`}
                  >
                    {uploading ? (
                      <Loader2 size={28} className="animate-spin text-[#E11D48]" />
                    ) : uploadedDesignUrl ? (
                      <img src={uploadedDesignUrl} alt="Custom design" className="w-24 h-24 rounded-xl object-cover" />
                    ) : (
                      <Upload size={28} className="text-muted-foreground" />
                    )}
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#3D2314]">
                        {uploadedDesignUrl ? "Custom Design Uploaded ✓" : "Upload Your Own Design"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {uploadedDesignUrl ? "Click to replace" : "JPG, PNG — Upload a reference image"}
                      </p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadDesign(file);
                    }} />
                  </label>
                </motion.div>
              )}

              {/* Step 3: Design Color */}
              {step === 2 && (
                <motion.div key="color" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                  <h3 className="font-serif font-bold text-lg text-[#3D2314]">Choose Design Color</h3>
                  <p className="text-sm text-muted-foreground">Pick the accent color for the design on your chocolate, or select "No Color".</p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    {DESIGN_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setDesignColor(c.value)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-300 ${
                          designColor === c.value
                            ? "border-[#E11D48] bg-[#E11D48]/5 shadow-lg ring-1 ring-[#E11D48]/20"
                            : "border-border bg-background hover:border-[#E11D48]/40 hover:shadow-md"
                        }`}
                      >
                        {c.value === "none" ? (
                          <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center text-muted-foreground text-xs font-bold">
                            ✕
                          </div>
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-full border-2 ${
                              designColor === c.value ? "border-[#3D2314] scale-110 shadow-md" : "border-border"
                            }`}
                            style={{ backgroundColor: c.value }}
                          />
                        )}
                        <span className="text-xs font-semibold text-[#3D2314]">{c.name}</span>
                        {designColor === c.value && (
                          <div className="w-4 h-4 bg-[#E11D48] rounded-full flex items-center justify-center">
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Personalize */}
              {step === 3 && (
                <motion.div key="personalize" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
                  <h3 className="font-serif font-bold text-lg text-[#3D2314]">Personalize Your Box</h3>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-semibold text-[#3D2314]">
                      <MessageSquare size={14} className="text-[#E11D48]" /> Chocolate Message *
                    </Label>
                    <Input
                      value={message}
                      onChange={(e) => { setMessage(e.target.value.slice(0, 20)); if (stepError) setStepError(null); }}
                      placeholder="e.g. Love You, Sorry, Miss You"
                      maxLength={20}
                      className="border-border focus-visible:ring-[#E11D48]/30"
                    />
                    <p className="text-xs text-muted-foreground">
                      চকোলেটের ওপর কী লিখবেন তা অবশ্যই জানাতে হবে (সর্বোচ্চ ২০ অক্ষর) — <span className="font-num">{message.length}/20</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-semibold text-[#3D2314]">
                      <StickyNote size={14} className="text-[#E11D48]" /> Special Instructions (Optional)
                    </Label>
                    <Textarea
                      value={specialNote}
                      onChange={(e) => setSpecialNote(e.target.value.slice(0, 200))}
                      placeholder="Any specific requests for the kitchen..."
                      maxLength={200}
                      rows={3}
                      className="border-border focus-visible:ring-[#E11D48]/30"
                    />
                    <p className="text-xs text-muted-foreground text-right">{specialNote.length}/200</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step Validation Error */}
            <AnimatePresence>
              {stepError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-sm text-[#E11D48] font-medium mt-4 text-center font-bengali"
                >
                  {stepError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => { setStep((s) => Math.max(0, s - 1)); setStepError(null); }}
                disabled={step === 0}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full border border-border text-[#3D2314] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
              {step < 3 ? (
                <button
                  onClick={() => {
                    // Validate current step
                    if (step === 0 && !selectedBaseId) {
                      setStepError("অনুগ্রহ করে চকোলেটের ধরন সিলেক্ট করুন।");
                      return;
                    }
                    if (step === 1 && !selectedDesignId && !uploadedDesignUrl) {
                      setStepError("অনুগ্রহ করে একটি ডিজাইন সিলেক্ট করুন অথবা আপলোড করুন।");
                      return;
                    }
                    // Step 2 (color) always valid since "No Color" is default
                    setStepError(null);
                    setStep((s) => s + 1);
                  }}
                  className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full transition-colors ${
                    (step === 0 && !selectedBaseId) || (step === 1 && !selectedDesignId && !uploadedDesignUrl)
                      ? "bg-[#3D2314]/50 text-white/70 cursor-not-allowed"
                      : "bg-[#3D2314] text-white hover:bg-[#3D2314]/90"
                  }`}
                >
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <motion.button
                  whileHover={message.trim() ? { scale: 1.03 } : {}}
                  whileTap={message.trim() ? { scale: 0.97 } : {}}
                  onClick={() => {
                    if (!message.trim()) {
                      setStepError("অনুগ্রহ করে চকোলেটের ওপর লেখার মেসেজ দিন।");
                      return;
                    }
                    handleAddToCart();
                  }}
                  disabled={!message.trim()}
                  className={`flex items-center gap-2 px-8 py-3 text-sm font-bold rounded-full shadow-lg transition-colors ${
                    message.trim()
                      ? "bg-[#E11D48] text-white hover:bg-[#E11D48]/90"
                      : "bg-[#E11D48]/50 text-white/70 cursor-not-allowed"
                  }`}
                >
                  <ShoppingBag size={16} /> Add to Cart — <Taka amount={totalPrice} />
                </motion.button>
              )}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <h4 className="font-serif font-bold text-sm text-[#3D2314] uppercase tracking-wider">Live Preview</h4>
              <div className="space-y-3 text-sm">
                {selectedBase && (
                  <div>
                    <p className="text-xs text-muted-foreground">Base</p>
                    <p className="font-semibold text-[#3D2314]">{selectedBase.name}</p>
                  </div>
                )}
                {(selectedDesign || uploadedDesignUrl) && (
                  <div>
                    <p className="text-xs text-muted-foreground">Design</p>
                    {uploadedDesignUrl ? (
                      <div className="flex items-center gap-2 mt-1">
                        <img src={uploadedDesignUrl} alt="Custom" className="w-8 h-8 rounded object-cover" />
                        <span className="text-xs font-medium text-[#3D2314]">Custom Upload</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        {selectedDesign?.image_url && (
                          <img src={selectedDesign.image_url} alt={selectedDesign.name} className="w-8 h-8 rounded object-cover" />
                        )}
                        <span className="font-semibold text-[#3D2314]">{selectedDesign?.name}</span>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Design Color</p>
                  <div className="flex items-center gap-2 mt-1">
                    {designColor === "none" ? (
                      <div className="w-5 h-5 rounded-full border border-dashed border-muted-foreground flex items-center justify-center text-[8px] text-muted-foreground">✕</div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: designColor }} />
                    )}
                    <span className="text-xs font-medium text-[#3D2314]">{colorName}</span>
                  </div>
                </div>
                {message && (
                  <div>
                    <p className="text-xs text-muted-foreground">Message</p>
                    <p className="font-serif font-bold text-[#3D2314] text-lg">"{message}"</p>
                  </div>
                )}
                {specialNote && (
                  <div>
                    <p className="text-xs text-muted-foreground">Note</p>
                    <p className="text-xs text-[#3D2314] italic">"{specialNote}"</p>
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="font-serif font-bold text-lg text-[#E11D48]">
                    <Taka amount={totalPrice} />
                  </span>
                </div>
              </div>
              {!selectedBase && !selectedDesign && !uploadedDesignUrl && !message && (
                <p className="text-xs text-muted-foreground text-center py-4 italic">
                  Start customizing to see a preview here
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomizationEngine;
