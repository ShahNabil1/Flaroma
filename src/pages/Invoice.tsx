import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Loader2, Package, MapPin, Phone, User, CreditCard, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Taka from "@/components/Taka";
import { parseCustomVariant, CustomOrderSummary, parseAttributeVariant, AttributesSummary } from "@/components/CustomOrderDetails";
import flaromaLogo from "@/assets/flaroma-logo-full.png";

const FUNCTIONS_URL = "https://ptxenyhuztiaexwdcecl.supabase.co/functions/v1";

interface OrderData {
  id: string;
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
  created_at: string;
}

function parseItems(order: OrderData) {
  try {
    if (order.variant) {
      const parsed = JSON.parse(order.variant);
      if (parsed?.__items) return parsed.__items;
    }
  } catch { /* ignore */ }
  return null;
}

async function generateInvoicePdf(order: OrderData): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  const invoiceNo = `FLA-${order.id.substring(0, 8).toUpperCase()}`;
  const orderDate = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const items = parseItems(order);

  // Header bar
  doc.setFillColor(75, 44, 32); // #4B2C20
  doc.rect(0, 0, w, 38, "F");
  doc.setTextColor(240, 220, 180);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("FLAROMA", 15, 18);
  // Contact info under logo
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(240, 220, 180, 180);
  doc.text("+880 1760-494879  |  hello@flaroma.bd  |  Bogura, Bangladesh", 15, 28);

  doc.setTextColor(218, 165, 32);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", w - 15, 16, { align: "right" });
  doc.setTextColor(240, 220, 180);
  doc.setFontSize(9);
  doc.text(invoiceNo, w - 15, 24, { align: "right" });
  doc.text(orderDate, w - 15, 30, { align: "right" });

  // Payment status badge — Cash on Delivery
  let y = 46;
  const statusText = "CASH ON DELIVERY";
  const badgeColor: [number, number, number] = [218, 165, 32];
  doc.setFillColor(...badgeColor);
  doc.roundedRect(15, y - 4, doc.getTextWidth(statusText) + 10, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, 20, y + 1);

  // Customer info
  y = 62;
  doc.setTextColor(100, 80, 60);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 15, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 30, 20);
  doc.setFontSize(10);
  doc.text(order.customer_name, 15, y + 7);
  doc.setFontSize(9);
  doc.setTextColor(100, 80, 60);
  doc.text(order.customer_phone, 15, y + 13);
  doc.text(order.customer_address, 15, y + 19, { maxWidth: 80 });

  // Order details (right side)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 80, 60);
  doc.text("ORDER DETAILS", w - 80, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 30, 20);
  doc.setFontSize(9);
  doc.text(`Area: ${order.delivery_area.replace(/_/g, " ")}`, w - 80, y + 7);
  doc.text(`Status: ${order.status}`, w - 80, y + 13);
  if (order.customization_note) {
    doc.text(`Note: ${order.customization_note}`, w - 80, y + 19, { maxWidth: 65 });
  }

  // Items table header
  y = 96;
  doc.setFillColor(245, 240, 235);
  doc.rect(15, y, w - 30, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 80, 60);
  doc.text("ITEM", 18, y + 5.5);
  doc.text("QTY", w - 55, y + 5.5, { align: "center" });
  doc.text("AMOUNT", w - 18, y + 5.5, { align: "right" });

  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 30, 20);

  if (items && items.length > 0) {
    for (const item of items) {
      doc.setFontSize(10);
      doc.text(item.title || order.product_title, 18, y);
      if (item.variant && typeof item.variant === "string" && !item.variant.startsWith("{")) {
        doc.setFontSize(8);
        doc.setTextColor(100, 80, 60);
        doc.text(item.variant, 18, y + 5);
        y += 5;
      }
      doc.setFontSize(10);
      doc.setTextColor(40, 30, 20);
      doc.text(String(item.quantity || 1), w - 55, y, { align: "center" });
      doc.text(`${((item.unitPrice || order.unit_price) * (item.quantity || 1)).toLocaleString("en-BD")} BDT`, w - 18, y, { align: "right" });
      y += 10;
    }
  } else {
    doc.setFontSize(10);
    doc.text(order.product_title, 18, y);
    if (order.variant && !order.variant.startsWith("{")) {
      doc.setFontSize(8);
      doc.setTextColor(100, 80, 60);
      doc.text(order.variant, 18, y + 5);
      y += 5;
    }
    doc.setFontSize(10);
    doc.setTextColor(40, 30, 20);
    doc.text(String(order.quantity), w - 55, y, { align: "center" });
    doc.text(`${order.unit_price.toLocaleString("en-BD")} BDT`, w - 18, y, { align: "right" });
    y += 10;
  }

  // Totals
  y += 4;
  doc.setDrawColor(220, 210, 200);
  doc.line(15, y, w - 15, y);
  y += 8;

  const drawTotalRow = (label: string, value: string, bold = false, color: [number, number, number] = [40, 30, 20]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9);
    doc.setTextColor(100, 80, 60);
    doc.text(label, w - 80, y);
    doc.setTextColor(...color);
    doc.text(value, w - 18, y, { align: "right" });
    y += 6;
  };

  drawTotalRow("Subtotal", `${order.unit_price.toLocaleString("en-BD")} BDT`);
  drawTotalRow("Delivery", `${order.delivery_charge.toLocaleString("en-BD")} BDT`);
  if (order.discount > 0) {
    drawTotalRow("Discount", `-${order.discount.toLocaleString("en-BD")} BDT`, false, [16, 185, 129]);
  }
  y += 2;
  doc.setDrawColor(200, 190, 180);
  doc.line(w - 82, y, w - 15, y);
  y += 6;
  drawTotalRow("Total", `${order.total_amount.toLocaleString("en-BD")} BDT`, true);
  drawTotalRow("Cash on Delivery", `${order.total_amount.toLocaleString("en-BD")} BDT`, true, [75, 44, 32]);

  // Refund policy section
  const pageH = doc.internal.pageSize.getHeight();
  const policyY = pageH - 52;
  doc.setDrawColor(220, 210, 200);
  doc.line(15, policyY, w - 15, policyY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(75, 44, 32);
  doc.text("Refund & Return Policy", 15, policyY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 80, 60);
  doc.text(
    "Food products are non-returnable and non-refundable to ensure quality. Please refrigerate for 2-3 hours before consuming.",
    15, policyY + 12, { maxWidth: w - 30 }
  );

  // Footer
  const footerY = pageH - 20;
  doc.setFillColor(245, 240, 235);
  doc.rect(0, footerY - 5, w, 25, "F");
  doc.setFontSize(8);
  doc.setTextColor(100, 80, 60);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for choosing Flaroma", w / 2, footerY + 2, { align: "center" });
  doc.setFontSize(7);
  doc.text("This is a computer-generated invoice. For queries, contact us via WhatsApp.", w / 2, footerY + 8, { align: "center" });

  return doc.output("blob");
}

const Invoice = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!orderId) { setError(true); setLoading(false); return; }

    fetch(`${FUNCTIONS_URL}/post-payment?action=order&id=${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [orderId]);

  const handleDownload = useCallback(async () => {
    if (!order || downloading) return;
    setDownloading(true);
    try {
      const blob = await generateInvoicePdf(order);
      const shortId = order.id.substring(0, 8).toUpperCase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Flaroma-Invoice-${shortId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [order, downloading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(30,40%,96%)] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[hsl(38,92%,50%)]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[hsl(30,40%,96%)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <FileText size={48} className="mx-auto text-[hsl(22,20%,40%)]" />
          <p className="text-[hsl(22,51%,12%)] font-serif text-xl">Invoice not found</p>
        </div>
      </div>
    );
  }

  const items = parseItems(order);
  const invoiceNo = `FLA-${order.id.substring(0, 8).toUpperCase()}`;
  const orderDate = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[hsl(30,40%,96%)] py-8 px-4 print:bg-white print:py-0">
      {/* Download button */}
      <div className="max-w-2xl mx-auto mb-4 flex justify-end print:hidden">
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="gap-2 bg-[hsl(22,51%,16%)] hover:bg-[hsl(22,35%,28%)] text-[hsl(38,60%,92%)]"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {downloading ? "Downloading..." : "Download Receipt"}
        </Button>
      </div>

      {/* Invoice Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-[hsl(30,20%,85%)] overflow-hidden print:shadow-none print:border-none print:rounded-none"
      >
        {/* Header */}
        <div className="bg-[hsl(22,51%,16%)] p-6 sm:p-8 flex items-center justify-between">
          <div>
            <img src={flaromaLogo} alt="Flaroma" className="h-10 sm:h-12" />
            <p className="text-[hsl(38,60%,92%)] text-xs mt-2 opacity-70">Premium Artisan Chocolates</p>
          </div>
          <div className="text-right">
            <h1 className="text-[hsl(38,92%,50%)] font-serif text-xl sm:text-2xl font-bold">INVOICE</h1>
            <p className="text-[hsl(38,60%,92%)] text-xs mt-1 font-mono">{invoiceNo}</p>
            <p className="text-[hsl(38,60%,92%)] text-xs opacity-70 flex items-center justify-end gap-1 mt-1">
              <Calendar size={10} /> {orderDate}
            </p>
          </div>
        </div>

        {/* Status Badge — Cash on Delivery */}
        <div className="px-6 sm:px-8 pt-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <CreditCard size={12} />
            Cash on Delivery
          </div>
        </div>

        {/* Customer Info */}
        <div className="px-6 sm:px-8 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-[hsl(30,20%,90%)]">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[hsl(22,20%,40%)] uppercase tracking-wider">Bill To</h3>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[hsl(22,51%,12%)] flex items-center gap-1.5">
                <User size={13} className="text-[hsl(38,92%,50%)]" /> {order.customer_name}
              </p>
              <p className="text-xs text-[hsl(22,20%,40%)] flex items-center gap-1.5">
                <Phone size={12} className="text-[hsl(38,92%,50%)]" /> {order.customer_phone}
              </p>
              <p className="text-xs text-[hsl(22,20%,40%)] flex items-center gap-1.5">
                <MapPin size={12} className="text-[hsl(38,92%,50%)]" /> {order.customer_address}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[hsl(22,20%,40%)] uppercase tracking-wider">Order Details</h3>
            <div className="space-y-1 text-xs text-[hsl(22,20%,40%)]">
              <p>Delivery Area: <span className="font-medium text-[hsl(22,51%,12%)]">{order.delivery_area.replace(/_/g, " ")}</span></p>
              <p>Status: <span className="font-medium text-[hsl(22,51%,12%)] capitalize">{order.status}</span></p>
              {order.customization_note && (
                <p>Note: <span className="font-medium text-[hsl(22,51%,12%)]">{order.customization_note}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-6 sm:px-8 py-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(30,20%,90%)]">
                <th className="text-left pb-3 text-xs font-semibold text-[hsl(22,20%,40%)] uppercase tracking-wider">Item</th>
                <th className="text-center pb-3 text-xs font-semibold text-[hsl(22,20%,40%)] uppercase tracking-wider">Qty</th>
                <th className="text-right pb-3 text-xs font-semibold text-[hsl(22,20%,40%)] uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items ? (
                items.map((item: any, idx: number) => {
                  const itemCustom = parseCustomVariant(item.variant && typeof item.variant === "string" ? item.variant : undefined);
                  const itemAttr = parseAttributeVariant(item.variant && typeof item.variant === "string" ? item.variant : undefined);
                  return (
                    <tr key={idx} className="border-b border-[hsl(30,20%,95%)]">
                      <td className="py-3">
                        <p className="font-medium text-[hsl(22,51%,12%)]">{itemCustom.isCustom ? "Your Custom Kunafa Box" : item.title}</p>
                        {itemCustom.isCustom ? (
                          <div className="mt-1"><CustomOrderSummary parsed={itemCustom} compact /></div>
                        ) : itemAttr.isAttributes ? (
                          <div className="mt-1"><AttributesSummary variant={item.variant} compact /></div>
                        ) : (
                          item.variant && typeof item.variant === "string" && <p className="text-xs text-[hsl(22,20%,40%)] mt-0.5">{item.variant}</p>
                        )}
                      </td>
                      <td className="py-3 text-center text-[hsl(22,51%,12%)]">{item.quantity}</td>
                      <td className="py-3 text-right font-semibold text-[hsl(22,51%,12%)]">
                        <Taka amount={item.unitPrice * item.quantity} />
                      </td>
                    </tr>
                  );
                })
              ) : (() => {
                const singleCustom = parseCustomVariant(order.variant || undefined);
                const singleAttr = parseAttributeVariant(order.variant || undefined);
                return (
                  <tr className="border-b border-[hsl(30,20%,95%)]">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {order.image_url && (
                          <img src={order.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-[hsl(30,20%,90%)]" />
                        )}
                        <div>
                          <p className="font-medium text-[hsl(22,51%,12%)]">{singleCustom.isCustom ? "Your Custom Kunafa Box" : order.product_title}</p>
                          {singleCustom.isCustom ? (
                            <div className="mt-1"><CustomOrderSummary parsed={singleCustom} compact /></div>
                          ) : singleAttr.isAttributes ? (
                            <div className="mt-1"><AttributesSummary variant={order.variant || undefined} compact /></div>
                          ) : (
                            order.variant && !order.variant.startsWith("{") && (
                              <p className="text-xs text-[hsl(22,20%,40%)] mt-0.5">{order.variant}</p>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center text-[hsl(22,51%,12%)]">{order.quantity}</td>
                    <td className="py-3 text-right font-semibold text-[hsl(22,51%,12%)]">
                      <Taka amount={order.unit_price} />
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 sm:px-8 pb-6">
          <div className="bg-[hsl(30,40%,96%)] rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-[hsl(22,20%,40%)]">
              <span>Subtotal</span>
              <span className="font-medium text-[hsl(22,51%,12%)]"><Taka amount={order.unit_price} /></span>
            </div>
            <div className="flex justify-between text-sm text-[hsl(22,20%,40%)]">
              <span>Delivery</span>
              <span className="font-medium text-[hsl(22,51%,12%)]"><Taka amount={order.delivery_charge} /></span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span className="font-medium">-<Taka amount={order.discount} /></span>
              </div>
            )}
            <div className="border-t border-[hsl(30,20%,85%)] pt-2 flex justify-between text-base font-bold text-[hsl(22,51%,12%)]">
              <span>Total</span>
              <Taka amount={order.total_amount} />
            </div>
            <div className="flex justify-between text-sm font-bold text-[hsl(38,90%,38%)] pt-1">
              <span>Cash on Delivery</span>
              <Taka amount={order.total_amount} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[hsl(30,40%,96%)] px-6 sm:px-8 py-4 text-center border-t border-[hsl(30,20%,90%)]">
          <p className="text-xs text-[hsl(22,20%,40%)]">
            Thank you for choosing <span className="font-semibold text-[hsl(22,51%,12%)]">Flaroma</span> — Premium Artisan Chocolates
          </p>
          <p className="text-[10px] text-[hsl(22,20%,40%)] opacity-60 mt-1">
            This is a computer-generated invoice. For queries, contact us via WhatsApp.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Invoice;
