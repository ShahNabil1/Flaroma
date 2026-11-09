import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, X, Loader2, Package, ShoppingBag, TruckIcon,
  CheckCircle2, XCircle, AlertTriangle, UserCheck, Upload, Check,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/admin-api";
import Taka from "@/components/Taka";

const SUPABASE_URL = "https://ptxenyhuztiaexwdcecl.supabase.co";
const ORDERS_URL = `${SUPABASE_URL}/functions/v1/admin-orders`;
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dvfb58wu4/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "flaroma_upload";

const DESIGN_COLORS = [
  { name: "No Color", value: "none" },
  { name: "Gold", value: "#D4AF37" },
  { name: "Rose Pink", value: "#EC4899" },
  { name: "Red", value: "#DC2626" },
  { name: "Silver", value: "#C0C0C0" },
  { name: "White", value: "#FFFFFF" },
  { name: "Sky Blue", value: "#38BDF8" },
  { name: "Green", value: "#22C55E" },
  { name: "Purple", value: "#A855F7" },
  { name: "Orange", value: "#F97316" },
];

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
  };
}

interface Product {
  id: string;
  title: string;
  title_bn: string | null;
  base_price: number;
  image_url: string | null;
  product_variants: { variant_type: string; variant_value: string; price_modifier: number }[];
}

interface BDCourierData {
  total: number;
  success: number;
  cancel: number;
  successRate: number;
  name?: string;
  address?: string;
}

interface ManualOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ManualOrderModal = ({ open, onOpenChange }: ManualOrderModalProps) => {
  const queryClient = useQueryClient();

  // Customer
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmFound, setCrmFound] = useState(false);

  // BD Courier
  const [bdCourierData, setBdCourierData] = useState<BDCourierData | null>(null);
  const [bdCourierLoading, setBdCourierLoading] = useState(false);
  const [bdCourierError, setBdCourierError] = useState(false);

  // Product
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [isCustomBox, setIsCustomBox] = useState(false);
  const [customBase, setCustomBase] = useState("");
  const [customDesign, setCustomDesign] = useState("");
  const [customDesignUrl, setCustomDesignUrl] = useState("");
  const [customColor, setCustomColor] = useState("none");
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const designFileRef = useRef<HTMLInputElement>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [specialNote, setSpecialNote] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Financials
  const [deliveryArea, setDeliveryArea] = useState("inside_dhaka");
  const [deliveryCharge, setDeliveryCharge] = useState(80);
  const [discount, setDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [orderStatus, setOrderStatus] = useState("pending");

  const [saving, setSaving] = useState(false);

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: adminApi.getProducts,
  });

  // Fetch build flow designs (step 2)
  const { data: buildFlowDesigns = [] } = useQuery<{ id: string; name: string; image_url: string | null }[]>({
    queryKey: ["build-flow-designs"],
    queryFn: async () => {
      const { data: steps } = await supabase
        .from("build_flow_steps")
        .select("id")
        .order("sort_order")
        .limit(10);
      if (!steps || steps.length < 2) return [];
      // Step 2 is the "Design" step (sort_order index 1)
      const designStepId = steps[1]?.id;
      if (!designStepId) return [];
      const { data: options } = await supabase
        .from("build_flow_options")
        .select("id, name, image_url")
        .eq("step_id", designStepId)
        .order("sort_order");
      return options || [];
    },
  });

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.title_bn && p.title_bn.includes(productSearch))
  );

  // CRM lookup on phone change
  const lookupCRM = useCallback(async (phoneVal: string) => {
    if (phoneVal.length < 11) { setCrmFound(false); return; }
    setCrmLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${ORDERS_URL}?action=crm-lookup&phone=${encodeURIComponent(phoneVal)}`, { headers });
      const data = await res.json();
      if (data?.customer_name) {
        if (!name) setName(data.customer_name);
        if (!address && data.address) setAddress(data.address);
        setCrmFound(true);
      } else {
        setCrmFound(false);
      }
    } catch {
      setCrmFound(false);
    } finally {
      setCrmLoading(false);
    }
  }, [name, address]);

  // BD Courier lookup on phone change (11 digits)
  const lookupBDCourier = useCallback(async (phoneVal: string) => {
    if (phoneVal.length !== 11) { setBdCourierData(null); setBdCourierError(false); return; }
    setBdCourierLoading(true);
    setBdCourierError(false);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${ORDERS_URL}?action=fraud-check`, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: phoneVal }),
      });
      const result = await res.json();
      if (result?.data?.totalSummary) {
        const summary = result.data.totalSummary;
        // Check for name/address from BD Courier raw data
        setBdCourierData({
          total: summary.total || 0,
          success: summary.success || 0,
          cancel: summary.cancel || 0,
          successRate: summary.successRate || 0,
          name: result.data.name || undefined,
          address: result.data.address || undefined,
        });
      } else {
        setBdCourierData(null);
      }
    } catch {
      setBdCourierError(true);
      setBdCourierData(null);
    } finally {
      setBdCourierLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (phone.length >= 11) {
        lookupCRM(phone);
        lookupBDCourier(phone);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [phone, lookupCRM, lookupBDCourier]);

  // Price calculation
  const unitPrice = (() => {
    if (!selectedProduct) return 0;
    let price = selectedProduct.base_price;
    const variants = selectedProduct.product_variants || [];
    for (const [type, value] of Object.entries(selectedVariants)) {
      const v = variants.find((vr) => vr.variant_type === type && vr.variant_value === value);
      if (v) price += v.price_modifier;
    }
    return price;
  })();

  const subtotal = unitPrice * quantity;
  const total = subtotal + deliveryCharge - discount;

  // Grouped variants for selected product
  const variantGroups = (() => {
    if (!selectedProduct?.product_variants) return [];
    const map = new Map<string, { value: string; price: number }[]>();
    selectedProduct.product_variants.forEach((v) => {
      if (!map.has(v.variant_type)) map.set(v.variant_type, []);
      map.get(v.variant_type)!.push({ value: v.variant_value, price: v.price_modifier });
    });
    return Array.from(map.entries()).map(([type, options]) => ({ type, options }));
  })();

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariants({});
    setProductSearch("");
  };

  const buildVariantString = () => {
    if (isCustomBox) {
      // Store as structured JSON matching the web order custom variant format
      const customData: Record<string, string> = {};
      if (customBase) customData.base = customBase;
      if (customDesign === "Custom Upload" && customDesignUrl) {
        customData.design = customDesignUrl;
      } else if (customDesign) {
        customData.design = customDesign;
      }
      const colorObj = DESIGN_COLORS.find((c) => c.value === customColor);
      if (colorObj && customColor !== "none") customData.color = colorObj.name;
      if (customMessage) customData.message = customMessage;
      return JSON.stringify(customData);
    }
    return Object.entries(selectedVariants)
      .map(([type, value]) => `${type}: ${value}`)
      .join(", ") || null;
  };

  const handleSave = async () => {
    if (!name.trim()) return toast({ title: "Customer name is required", variant: "destructive" });
    if (!phone.trim() || phone.length < 11) return toast({ title: "Valid phone number required", variant: "destructive" });
    if (!address.trim()) return toast({ title: "Address is required", variant: "destructive" });
    if (!selectedProduct) return toast({ title: "Please select a product", variant: "destructive" });

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const customNote = isCustomBox
        ? [
            `Base: ${customBase}`,
            `Design: ${customDesign}`,
            customDesignUrl ? `Design URL: ${customDesignUrl}` : "",
            `Color: ${customColor}`,
            `Message: ${customMessage}`,
            specialNote ? `Note: ${specialNote}` : "",
          ].filter(Boolean).join(", ")
        : specialNote || null;

      const res = await fetch(`${ORDERS_URL}?action=create-order`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_address: address.trim(),
          delivery_area: deliveryArea,
          product_id: selectedProduct.id,
          product_title: selectedProduct.title,
          variant: buildVariantString(),
          unit_price: unitPrice,
          quantity,
          delivery_charge: deliveryCharge,
          discount,
          total_amount: total,
          payment_status: paymentStatus,
          status: orderStatus,
          customization_note: customNote,
          source: "manual",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create order");
      }
      toast({ title: "Manual order created!" });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName(""); setPhone(""); setAddress("");
    setSelectedProduct(null); setSelectedVariants({});
    setProductSearch(""); setIsCustomBox(false);
    setCustomBase(""); setCustomDesign(""); setCustomDesignUrl("");
    setCustomBase(""); setCustomDesign(""); setCustomDesignUrl("");
    setCustomColor("none"); setCustomMessage(""); setSpecialNote("");
    setQuantity(1); setDeliveryCharge(80); setDiscount(0);
    setPaymentStatus("unpaid"); setOrderStatus("pending");
    setCrmFound(false); setBdCourierData(null); setBdCourierError(false);
  };

  const handleAutofillFromCourier = () => {
    if (bdCourierData?.name && !name) setName(bdCourierData.name);
    if (bdCourierData?.address && !address) setAddress(bdCourierData.address);
    toast({ title: "Auto-filled from BD Courier data" });
  };

  const getReliabilityColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getReliabilityBg = (rate: number) => {
    if (rate >= 80) return "bg-green-50 border-green-200";
    if (rate >= 50) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" /> Manual Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Customer Information */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Phone Number *</Label>
                <div className="relative">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                    placeholder="01XXXXXXXXX"
                    maxLength={15}
                    className="font-num pr-8"
                  />
                  {(crmLoading || bdCourierLoading) && (
                    <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
                {crmFound && (
                  <p className="text-[10px] text-green-600 font-medium">✓ Customer found in CRM — auto-filled</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
              </div>
            </div>

            {/* BD Courier Reliability Card */}
            {phone.length === 11 && (bdCourierLoading || bdCourierData || bdCourierError) && (
              <div className={`mt-3 rounded-xl border p-3 transition-all ${
                bdCourierLoading ? "bg-muted/30 border-border" :
                bdCourierError ? "bg-red-50 border-red-200" :
                bdCourierData ? getReliabilityBg(bdCourierData.successRate) : ""
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TruckIcon size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Reliability</span>
                  </div>
                  {bdCourierData && (bdCourierData.name || bdCourierData.address) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] gap-1 text-primary hover:text-primary"
                      onClick={handleAutofillFromCourier}
                    >
                      <UserCheck size={12} /> Auto-fill
                    </Button>
                  )}
                </div>

                {bdCourierLoading && (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 size={12} className="animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Checking BD Courier...</span>
                  </div>
                )}

                {bdCourierError && (
                  <div className="flex items-center gap-2 py-1">
                    <AlertTriangle size={12} className="text-red-500" />
                    <span className="text-xs text-red-600">Could not reach BD Courier API</span>
                  </div>
                )}

                {bdCourierData && !bdCourierLoading && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <CheckCircle2 size={12} className="text-green-600" />
                        <span className="text-lg font-num font-bold text-green-700">{bdCourierData.success}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Successful</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <XCircle size={12} className="text-red-500" />
                        <span className="text-lg font-num font-bold text-red-600">{bdCourierData.cancel}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cancelled</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <TruckIcon size={12} className={getReliabilityColor(bdCourierData.successRate)} />
                        <span className={`text-lg font-num font-bold ${getReliabilityColor(bdCourierData.successRate)}`}>
                          {bdCourierData.successRate.toFixed(0)}%
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Success Rate</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 space-y-1.5">
              <Label className="text-xs">Shipping Address *</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full delivery address" rows={2} />
            </div>
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs">Delivery Area</Label>
              <Select value={deliveryArea} onValueChange={(v) => {
                setDeliveryArea(v);
                setDeliveryCharge(v === "inside_dhaka" ? 80 : 150);
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inside_dhaka">Inside Dhaka (৳80)</SelectItem>
                  <SelectItem value="outside_dhaka">Outside Dhaka (৳150)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <Separator />

          {/* Product Selection */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Product Selection</h3>

            {!selectedProduct ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="pl-9"
                  />
                </div>
                {productSearch && (
                  <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3">No products found</p>
                    ) : (
                      filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => selectProduct(p)}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3 border-b border-border last:border-0"
                        >
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-8 h-8 rounded-md object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                              <Package size={14} className="text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                            <p className="text-xs text-muted-foreground font-num">৳{p.base_price}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Selected product card */}
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border mb-4">
                  {selectedProduct.image_url ? (
                    <img src={selectedProduct.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Package size={18} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{selectedProduct.title}</p>
                    <p className="text-xs text-muted-foreground font-num">Base: ৳{selectedProduct.base_price}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedProduct(null); setSelectedVariants({}); setIsCustomBox(false); }}>
                    <X size={16} />
                  </Button>
                </div>

                {/* Variant selection */}
                {variantGroups.length > 0 && !isCustomBox && (
                  <div className="space-y-3 mb-4">
                    {variantGroups.map(({ type, options }) => (
                      <div key={type} className="space-y-1.5">
                        <Label className="text-xs">{type}</Label>
                        <div className="flex flex-wrap gap-2">
                          {options.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setSelectedVariants((s) => ({ ...s, [type]: opt.value }))}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                selectedVariants[type] === opt.value
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border text-foreground hover:border-primary/50"
                              }`}
                            >
                              {opt.value}
                              {opt.price !== 0 && <span className="ml-1 font-num opacity-70">{opt.price > 0 ? `+৳${opt.price}` : `-৳${Math.abs(opt.price)}`}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                )

                {/* Quantity */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-24 font-num"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Custom Order Toggle - always visible */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20">
            <input
              type="checkbox"
              id="customOrderToggle"
              checked={isCustomBox}
              onChange={(e) => setIsCustomBox(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500"
            />
            <Label htmlFor="customOrderToggle" className="text-sm font-medium cursor-pointer">
              ✦ This is a Custom Build Order
            </Label>
          </div>

          {/* Custom Box Build Details */}
          {isCustomBox && (
            <div className="space-y-4 p-4 rounded-xl border-2 border-amber-300 bg-amber-50/60">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-amber-800">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-400/80 text-white text-[10px]">✦</span>
                Custom Build Details
              </h4>

              {/* Base Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs">Base *</Label>
                <Select value={customBase} onValueChange={setCustomBase}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select base" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dark Chocolate">Dark Chocolate</SelectItem>
                    <SelectItem value="Milk Chocolate">Milk Chocolate</SelectItem>
                    <SelectItem value="White Chocolate">White Chocolate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Design Catalog */}
              <div className="space-y-2">
                <Label className="text-xs">Design</Label>
                <div className="grid grid-cols-4 gap-2">
                  {buildFlowDesigns.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => { setCustomDesign(d.name); setCustomDesignUrl(""); }}
                      className={`relative rounded-lg border-2 overflow-hidden aspect-square transition-all ${
                        customDesign === d.name
                          ? "border-amber-500 ring-2 ring-amber-300"
                          : "border-border hover:border-amber-300"
                      }`}
                    >
                      {d.image_url ? (
                        <img src={d.image_url} alt={d.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Package size={16} className="text-muted-foreground" />
                        </div>
                      )}
                      {customDesign === d.name && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
                        <p className="text-[9px] text-white text-center truncate">{d.name}</p>
                      </div>
                    </button>
                  ))}

                  {/* Upload Custom Design */}
                  <button
                    type="button"
                    onClick={() => designFileRef.current?.click()}
                    className={`relative rounded-lg border-2 border-dashed overflow-hidden aspect-square transition-all flex flex-col items-center justify-center gap-1 ${
                      customDesign === "Custom Upload"
                        ? "border-amber-500 ring-2 ring-amber-300 bg-amber-50"
                        : "border-border hover:border-amber-300 bg-muted/30"
                    }`}
                  >
                    {uploadingDesign ? (
                      <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    ) : customDesign === "Custom Upload" && customDesignUrl ? (
                      <img src={customDesignUrl} alt="Uploaded" className="w-full h-full object-cover absolute inset-0" />
                    ) : (
                      <>
                        <Upload size={14} className="text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground">Upload</span>
                      </>
                    )}
                    {customDesign === "Custom Upload" && customDesignUrl && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                  <input
                    ref={designFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingDesign(true);
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
                        formData.append("folder", "manual-orders");
                        const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData });
                        const data = await res.json();
                        if (data.secure_url) {
                          setCustomDesignUrl(data.secure_url);
                          setCustomDesign("Custom Upload");
                        }
                      } catch {
                        toast({ title: "Upload failed", variant: "destructive" });
                      } finally {
                        setUploadingDesign(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>

              {/* Design Color Selector */}
              <div className="space-y-2">
                <Label className="text-xs">Design Color</Label>
                <div className="flex flex-wrap gap-2">
                  {DESIGN_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCustomColor(c.value)}
                      className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all ${
                        customColor === c.value
                          ? "border-amber-500 bg-amber-50"
                          : "border-transparent hover:border-amber-200"
                      }`}
                    >
                      {c.value === "none" ? (
                        <div className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center text-[8px] text-muted-foreground">✕</div>
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-full border ${c.value === "#FFFFFF" ? "border-gray-300" : "border-transparent"}`}
                          style={{ backgroundColor: c.value }}
                        />
                      )}
                      <span className="text-[9px] font-medium text-foreground">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label className="text-xs">Message on Chocolate</Label>
                <Input
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="e.g. Happy Birthday"
                  maxLength={20}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Special Instructions</Label>
                <Textarea
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="Any extra instructions from the customer..."
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {/* Special Note for non-custom products */}
          {selectedProduct && !isCustomBox && (
            <div className="space-y-1.5">
              <Label className="text-xs">Special Instructions (optional)</Label>
              <Textarea
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                placeholder="Any extra notes from the customer..."
                rows={2}
                className="text-xs"
              />
            </div>
          )}

          <Separator />

          {/* Financials */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Financials & Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Delivery Charge (৳)</Label>
                <Input
                  type="number"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                  className="font-num"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discount (৳)</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="font-num"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Order Status</Label>
                <Select value={orderStatus} onValueChange={setOrderStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Order Summary */}
            {selectedProduct && (
              <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unit Price</span>
                  <Taka amount={unitPrice} className="font-medium font-num" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({quantity}x)</span>
                  <Taka amount={subtotal} className="font-medium font-num" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <Taka amount={deliveryCharge} className="font-medium font-num" />
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600 font-num font-medium">-৳{discount}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <Taka amount={Math.max(0, total)} />
                </div>
              </div>
            )}
          </section>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              Source: Manual
            </Badge>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 size={14} className="animate-spin mr-2" /> Creating...</> : <><Plus size={14} className="mr-2" /> Create Order</>}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualOrderModal;
