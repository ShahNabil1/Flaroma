import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, MapPin, Truck, AlertTriangle, CheckCircle,
  XCircle, Clock, Send, Loader2, Package, Printer, Copy, Save,
  DollarSign, CreditCard, Download, X, Image as ImageIcon, FileText, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Order {
  id: string;
  product_id: string | null;
  product_title: string;
  variant: string | null;
  quantity: number;
  unit_price: number;
  delivery_charge: number;
  total_amount: number;
  discount: number;
  advance_amount: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_area: string;
  customization_note: string | null;
  image_url: string | null;
  status: string;
  payment_status: string;
  invoice_url: string | null;
  steadfast_consignment_id: string | null;
  steadfast_tracking_code: string | null;
  created_at: string;
}

interface FraudData {
  status?: boolean;
  message?: string;
  data?: {
    Summaries?: Record<string, {
      logo?: string;
      data_type?: string;
      customer_rating?: string;
      risk_level?: string;
      message?: string;
      total?: number;
      success?: number;
      cancel?: number;
      show_count?: boolean;
    }>;
    totalSummary?: {
      total?: number;
      success?: number;
      cancel?: number;
      successRate?: number;
      cancelRate?: number;
    };
  };
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-800 border-amber-200" },
  confirmed: { label: "Confirmed", icon: CheckCircle, className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  processing: { label: "Processing", icon: Truck, className: "bg-blue-100 text-blue-800 border-blue-200" },
  shipped: { label: "Shipped", icon: Send, className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  completed: { label: "Completed", icon: CheckCircle, className: "bg-green-100 text-green-800 border-green-200" },
  returned: { label: "Returned", icon: XCircle, className: "bg-red-100 text-red-800 border-red-200" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "bg-gray-100 text-gray-800 border-gray-200" },
};

// Image Preview Modal
function ImagePreviewModal({ url, orderId, onClose }: { url: string; orderId: string; onClose: () => void }) {
  const handleDownload = () => {
    const fileName = `Design_Order_${orderId.slice(0, 8)}.jpg`;
    // For Cloudinary URLs, use fl_attachment to force download
    if (url.includes("cloudinary.com")) {
      const downloadUrl = url.includes("/upload/")
        ? url.replace("/upload/", `/upload/fl_attachment:${fileName}/`)
        : url;
      window.open(downloadUrl, "_blank");
      return;
    }
    // Fallback: open in new tab (works on all devices)
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-lg mx-4 bg-[#FFF9F5] rounded-2xl shadow-2xl border border-border overflow-hidden"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center bg-foreground/10 hover:bg-foreground/20 text-foreground transition-colors"
          >
            <X size={16} />
          </button>

          <div className="p-4 pt-5">
            <p className="text-sm font-serif font-bold text-[#3D2314] mb-3 flex items-center gap-2">
              <ImageIcon size={14} /> Custom Design
            </p>
            <div className="rounded-xl border-2 border-border overflow-hidden bg-muted/20">
              <img src={url} alt="Custom design" className="w-full max-h-[60vh] object-contain" />
            </div>
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-[#E11D48] text-white font-semibold text-sm hover:bg-[#BE123C] transition-colors"
            >
              <Download size={14} /> Download Image
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fraudData: FraudData | undefined;
  fraudLoading: boolean;
  onSendSteadfast: (order: Order) => void;
  steadfastPending: boolean;
  onUpdateOrder: (params: Record<string, unknown>) => void;
  updatePending: boolean;
}

function getSuccessRateBadge(fraudData: FraudData | undefined, fraudLoading: boolean) {
  if (fraudLoading) return <Badge variant="outline" className="text-xs gap-1"><Loader2 size={10} className="animate-spin" /> Checking</Badge>;
  if (!fraudData?.data?.totalSummary) return <Badge variant="outline" className="text-xs">No data</Badge>;
  const ts = fraudData.data.totalSummary;
  if (!ts.total) return <Badge variant="outline" className="text-xs">New Customer</Badge>;
  const rate = ts.successRate ?? 0;
  if (rate >= 70) return <Badge className="text-xs bg-green-100 text-green-800 border border-green-200 gap-1"><CheckCircle size={10} /> {rate.toFixed(0)}% Safe</Badge>;
  if (rate >= 40) return <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-200 gap-1"><AlertTriangle size={10} /> {rate.toFixed(0)}% Medium</Badge>;
  return <Badge className="text-xs bg-red-100 text-red-800 border border-red-200 gap-1"><AlertTriangle size={10} /> {rate.toFixed(0)}% High Risk</Badge>;
}

function CustomerReliabilityCard({ fraudData, fraudLoading }: { fraudData: FraudData | undefined; fraudLoading: boolean }) {
  if (fraudLoading) {
    return (
      <div className="bg-muted/30 border border-border rounded-xl p-4 text-center">
        <Loader2 size={20} className="animate-spin mx-auto text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground">Checking delivery reliability...</p>
      </div>
    );
  }

  const summaries = fraudData?.data?.Summaries;
  const totalSummary = fraudData?.data?.totalSummary;

  if (!summaries || !totalSummary) {
    return (
      <div className="bg-muted/30 border border-border rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground">No courier data available</p>
      </div>
    );
  }

  const rate = totalSummary.successRate ?? 0;
  const rateColor = rate >= 70 ? "text-green-600" : rate >= 40 ? "text-amber-600" : "text-red-600";
  const rateBg = rate >= 70 ? "bg-green-50 border-green-200" : rate >= 40 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  return (
    <div className={`border rounded-xl p-4 ${rateBg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className={rateColor} />
          <p className="text-sm font-semibold text-foreground">Customer Delivery Reliability</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <p className={`text-2xl font-bold font-num ${rateColor}`}>{rate.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">Success Rate</p>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2">
          <div className="text-center bg-background/60 rounded-lg py-1.5 px-2">
            <p className="text-sm font-bold font-num text-foreground">{totalSummary.total ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="text-center bg-background/60 rounded-lg py-1.5 px-2">
            <p className="text-sm font-bold font-num text-green-700">{totalSummary.success ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Delivered</p>
          </div>
          <div className="text-center bg-background/60 rounded-lg py-1.5 px-2">
            <p className="text-sm font-bold font-num text-red-600">{totalSummary.cancel ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Cancelled</p>
          </div>
        </div>
      </div>

      {/* Courier Breakdown */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Breakdown by Courier</p>
        {Object.entries(summaries).map(([name, courier]) => {
          if (courier.data_type === "rating") {
            return (
              <div key={name} className="flex items-center justify-between text-xs bg-background/60 rounded-lg px-2.5 py-1.5">
                <span className="font-medium text-foreground">{name}</span>
                <span className="text-muted-foreground">{courier.message || courier.customer_rating || "N/A"}</span>
              </div>
            );
          }
          const t = courier.total ?? 0;
          const s = courier.success ?? 0;
          const c = courier.cancel ?? 0;
          const pct = t > 0 ? ((s / t) * 100).toFixed(0) : "0";
          return (
            <div key={name} className="flex items-center justify-between text-xs bg-background/60 rounded-lg px-2.5 py-1.5">
              <span className="font-medium text-foreground">{name}</span>
              <span className="text-muted-foreground font-num">Total {t} • Cancel {c} • {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderDetailModal({
  order, open, onOpenChange, fraudData, fraudLoading,
  onSendSteadfast, steadfastPending, onUpdateOrder, updatePending,
}: OrderDetailModalProps) {
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDiscount, setEditDiscount] = useState(0);
  const [editAdvance, setEditAdvance] = useState(0);
  const [editPaymentStatus, setEditPaymentStatus] = useState("unpaid");
  const [editStatus, setEditStatus] = useState("pending");
  const [editDeliveryCharge, setEditDeliveryCharge] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Sync form state when order changes
  useEffect(() => {
    if (order) {
      setEditName(order.customer_name);
      setEditPhone(order.customer_phone);
      setEditAddress(order.customer_address);
      setEditDiscount(order.discount || 0);
      setEditAdvance(order.advance_amount || 0);
      setEditPaymentStatus(order.payment_status);
      setEditStatus(order.status);
      setEditDeliveryCharge(order.delivery_charge);
      setHasChanges(false);
    }
  }, [order]);

  if (!order) return null;

  // Parse multi-item bundle or single item
  const parsedVariant = (() => {
    if (!order.variant) return null;
    try { return JSON.parse(order.variant); } catch { return null; }
  })();
  const isMultiItem = parsedVariant && parsedVariant.__items && Array.isArray(parsedVariant.__items);
  const bundledItems = isMultiItem ? parsedVariant.__items as Array<{ title: string; variant: string | null; quantity: number; unitPrice: number; image: string | null }> : null;

  const subtotal = order.unit_price;
  const codAmount = editPaymentStatus === "paid" ? 0 : subtotal + editDeliveryCharge - editDiscount - editAdvance;

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  const markChanged = () => setHasChanges(true);

  const handleSave = () => {
    onUpdateOrder({
      id: order.id,
      customer_name: editName,
      customer_phone: editPhone,
      customer_address: editAddress,
      discount: editDiscount,
      advance_amount: editAdvance,
      payment_status: editPaymentStatus,
      status: editStatus,
      delivery_charge: editDeliveryCharge,
      total_amount: subtotal + editDeliveryCharge,
    });
    setHasChanges(false);
  };

  // Build the order object with latest edited data for Steadfast
  const getEditedOrder = (): Order => ({
    ...order,
    customer_name: editName,
    customer_phone: editPhone,
    customer_address: editAddress,
    discount: editDiscount,
    advance_amount: editAdvance,
    delivery_charge: editDeliveryCharge,
    total_amount: editPaymentStatus === "paid" ? 0 : Math.max(0, codAmount),
  });

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[94%] p-0 overflow-hidden border-border/50 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] rounded-2xl">
        <DialogDescription className="sr-only">Order details for {order.customer_name}</DialogDescription>

        {/* Header */}
        <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-serif font-bold text-foreground">{editName}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">#{order.id.slice(0, 8)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs gap-1 border ${cfg.className}`}>
                <StatusIcon size={10} /> {cfg.label}
              </Badge>
              <Badge className={`text-xs border ${
                editPaymentStatus === "paid" ? "bg-green-100 text-green-800 border-green-200" :
                editPaymentStatus === "partially_paid" ? "bg-amber-100 text-amber-800 border-amber-200" :
                "bg-red-100 text-red-800 border-red-200"
              }`}>
                <CreditCard size={10} className="mr-1" />
                {editPaymentStatus === "paid" ? "Paid" : editPaymentStatus === "partially_paid" ? "Partial" : "Unpaid"}
              </Badge>
            </div>
          </div>

          {/* Steadfast Info */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {order.steadfast_consignment_id ? (
              <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 w-full">
                <Truck size={14} className="text-muted-foreground shrink-0" />
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <span className="text-muted-foreground">CN:</span>
                  <a href={`https://steadfast.com.bd/t/${order.steadfast_tracking_code}`} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold text-primary hover:underline">
                    {order.steadfast_consignment_id}
                  </a>
                  <button className="text-muted-foreground hover:text-foreground" onClick={() => { navigator.clipboard.writeText(order.steadfast_consignment_id!); toast({ title: "Copied!" }); }}>
                    <Copy size={12} />
                  </button>
                  {order.steadfast_tracking_code && (
                    <>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-muted-foreground">Track:</span>
                      <span className="font-mono font-semibold text-foreground">{order.steadfast_tracking_code}</span>
                      <button className="text-muted-foreground hover:text-foreground" onClick={() => { navigator.clipboard.writeText(order.steadfast_tracking_code!); toast({ title: "Copied!" }); }}>
                        <Copy size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : ["confirmed", "processing"].includes(order.status) ? (
              <Button size="sm" className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" disabled={steadfastPending} onClick={() => onSendSteadfast(getEditedOrder())}>
                {steadfastPending ? <Loader2 size={12} className="animate-spin" /> : <Truck size={12} />}
                Send to Steadfast (COD: ৳{Math.max(0, codAmount)})
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={() => window.print()}>
              <Printer size={12} /> Print
            </Button>
            {!["pending", "cancelled"].includes(order.status) ? (
              <a href={`/i/${order.id.substring(0, 8)}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <FileText size={12} /> View Invoice
                </Button>
              </a>
            ) : (
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" disabled>
                <FileText size={12} /> No Invoice
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Editable Customer Details */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Customer Details</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input value={editName} onChange={(e) => { setEditName(e.target.value); markChanged(); }} className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Mobile</Label>
                  <Input value={editPhone} onChange={(e) => { setEditPhone(e.target.value); markChanged(); }} className="h-9 text-sm mt-1" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Shipping Address</Label>
                  {getSuccessRateBadge(fraudData, fraudLoading)}
                </div>
                <Input value={editAddress} onChange={(e) => { setEditAddress(e.target.value); markChanged(); }} className="h-9 text-sm mt-1" />
              </div>
            </div>
          </section>

          <Separator />

          {/* Customer Delivery Reliability Card */}
          <CustomerReliabilityCard fraudData={fraudData} fraudLoading={fraudLoading} />

          <Separator />

          {/* Product Info */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {bundledItems ? `Products (${bundledItems.length} items)` : "Product"}
            </h4>

            {bundledItems ? (
              <div className="space-y-3">
                {bundledItems.map((item, idx) => {
                  const itemParsed = (() => {
                    if (!item.variant) return null;
                    try { return JSON.parse(item.variant); } catch { return null; }
                  })();
                   const isCustomBuild = itemParsed && typeof itemParsed === "object" && !Array.isArray(itemParsed) && itemParsed.Base;
                   const hasAttributes = itemParsed && itemParsed.__attributes;

                  return (
                    <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-3">
                        {item.image ? (
                          <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package size={16} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-serif font-semibold text-sm text-foreground">{item.title}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>Qty: {item.quantity}</span>
                            <span className="font-num">৳{item.unitPrice}</span>
                          </div>
                        </div>
                      </div>
                      {isCustomBuild && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1.5 mt-2">
                          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">🎨 Custom Build #{idx + 1}</p>
                          {Object.entries(itemParsed).filter(([k]) => k !== "__attributes").map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-amber-800 font-medium">{key}</span>
                              <span className="text-amber-900 font-semibold flex items-center gap-1">
                                {key === "Design Color" ? (
                                  <>
                                    <span className="w-3 h-3 rounded-full border border-amber-300 inline-block" style={{ backgroundColor: String(value) }} />
                                    {String(value)}
                                  </>
                                ) : key === "Custom Design" ? (
                                  <button type="button" onClick={() => setPreviewImageUrl(String(value))} className="text-primary underline cursor-pointer">View Image</button>
                                ) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {hasAttributes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 space-y-1.5 mt-2">
                          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">📋 Selected Options</p>
                          {Object.entries(itemParsed.__attributes).map(([type, info]: [string, any]) => (
                            <div key={type} className="flex justify-between text-xs">
                              <span className="text-blue-800 font-medium">{type}</span>
                              <span className="text-blue-900 font-semibold">
                                {info.value} {info.price > 0 && <span className="text-blue-600">(+৳{info.price})</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  {order.image_url ? (
                    <img src={order.image_url} alt="" className="w-14 h-14 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                      <Package size={18} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-serif font-semibold text-sm text-foreground">{order.product_title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {order.variant && !parsedVariant && <span className="bg-muted/50 px-2 py-0.5 rounded">{order.variant}</span>}
                      {/* Display __attributes selections */}
                      {parsedVariant && parsedVariant.__attributes && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(parsedVariant.__attributes).map(([type, info]: [string, any]) => (
                            <span key={type} className="bg-primary/10 text-foreground px-2 py-0.5 rounded text-[10px] font-medium">
                              {type}: {info.value} {info.price > 0 && `(+৳${info.price})`}
                            </span>
                          ))}
                        </div>
                      )}
                      <span>Qty: {order.quantity}</span>
                      <span className="font-num">৳{order.unit_price}</span>
                    </div>
                  </div>
                </div>

                {/* Single-item custom build details */}
                {parsedVariant && typeof parsedVariant === "object" && !parsedVariant.__items && !parsedVariant.__attributes && parsedVariant.Base && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 mt-3">
                    <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">🎨 Custom Build Details</p>
                    {Object.entries(parsedVariant).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-amber-800 font-medium">{key}</span>
                        <span className="text-amber-900 font-semibold flex items-center gap-1.5">
                          {key === "Design Color" ? (
                            <>
                              <span className="w-4 h-4 rounded-full border border-amber-300 inline-block" style={{ backgroundColor: String(value) }} />
                              {String(value)}
                            </>
                          ) : key === "Custom Design" ? (
                            <button type="button" onClick={() => setPreviewImageUrl(String(value))} className="text-primary underline cursor-pointer">View Image</button>
                          ) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Single-item attribute selections */}
                {parsedVariant && parsedVariant.__attributes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 mt-3">
                    <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">📋 Selected Options</p>
                    {Object.entries(parsedVariant.__attributes).map(([type, info]: [string, any]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-blue-800 font-medium">{type}</span>
                        <span className="text-blue-900 font-semibold">
                          {info.value} {info.price > 0 && <span className="text-blue-600">(+৳{info.price})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {order.customization_note && (
            <>
              <Separator />
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customization Note</h4>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-900 font-medium leading-relaxed">{order.customization_note}</p>
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Editable Financials */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <DollarSign size={12} /> Financials
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{bundledItems ? `Items Subtotal (${order.quantity} pcs)` : `Unit Price × ${order.quantity}`}</span>
                <span className="font-medium font-num text-foreground">৳{subtotal}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Delivery Charge</Label>
                  <Input type="number" value={editDeliveryCharge} onChange={(e) => { setEditDeliveryCharge(Number(e.target.value) || 0); markChanged(); }} className="h-9 text-sm mt-1" min={0} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Discount</Label>
                  <Input type="number" value={editDiscount} onChange={(e) => { setEditDiscount(Number(e.target.value) || 0); markChanged(); }} className="h-9 text-sm mt-1" min={0} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Advance Paid</Label>
                  <Input type="number" value={editAdvance} onChange={(e) => { setEditAdvance(Number(e.target.value) || 0); markChanged(); }} className="h-9 text-sm mt-1" min={0} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Payment Status</Label>
                  <Select value={editPaymentStatus} onValueChange={(v) => { setEditPaymentStatus(v); markChanged(); }}>
                    <SelectTrigger className="h-9 text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-1" />

              {/* Payable Summary */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>৳{subtotal}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>+ Delivery</span>
                  <span>৳{editDeliveryCharge}</span>
                </div>
                {editDiscount > 0 && (
                  <div className="flex justify-between text-xs text-green-700">
                    <span>− Discount</span>
                    <span>−৳{editDiscount}</span>
                  </div>
                )}
                {editAdvance > 0 && (
                  <div className="flex justify-between text-xs text-blue-700">
                    <span>− Advance Paid</span>
                    <span>−৳{editAdvance}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-serif font-bold text-base text-foreground">
                  <span>💰 Cash to Collect (COD)</span>
                  <span className={codAmount < 0 ? "text-red-600" : ""}>৳{Math.max(0, codAmount)}</span>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Status Update */}
          {order.status !== "completed" && order.status !== "cancelled" && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Order Status</h4>
              <Select value={editStatus} onValueChange={(v) => { setEditStatus(v); markChanged(); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </section>
          )}

          <p className="text-xs text-muted-foreground/60 text-center pt-1">
            Ordered {new Date(order.created_at).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-border/50 bg-muted/10">
          <Button className="w-full gap-2 h-10 font-semibold" disabled={!hasChanges || updatePending} onClick={handleSave}>
            {updatePending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {hasChanges ? "Update Order" : "No Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {previewImageUrl && (
      <ImagePreviewModal
        url={previewImageUrl}
        orderId={order.id}
        onClose={() => setPreviewImageUrl(null)}
      />
    )}
    </>
  );
}
