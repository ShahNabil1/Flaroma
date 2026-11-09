import { Package, Phone, Clock, PhoneCall } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Taka from "@/components/Taka";

interface DraftOrder {
  id: string;
  product_title: string;
  variant: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  delivery_charge: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_area: string;
  customization_note: string | null;
  image_url: string | null;
  created_at: string;
  updated_at?: string;
}

interface ParsedItem {
  title: string;
  variant: string | null;
  quantity: number;
  unitPrice: number;
}

function parseDraftItems(order: DraftOrder): ParsedItem[] {
  if (order.variant) {
    try {
      const parsed = JSON.parse(order.variant);
      if (parsed?.__items && Array.isArray(parsed.__items)) {
        return parsed.__items.map((item: Record<string, unknown>) => ({
          title: String(item.title || order.product_title),
          variant: item.variant ? String(item.variant) : null,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
        }));
      }
      const variantStr = Object.entries(parsed)
        .filter(([k]) => k !== "__items")
        .map(([, v]) => String(v))
        .join(", ");
      return [{
        title: order.product_title,
        variant: variantStr || null,
        quantity: order.quantity,
        unitPrice: order.unit_price,
      }];
    } catch {
      return [{
        title: order.product_title,
        variant: order.variant,
        quantity: order.quantity,
        unitPrice: order.unit_price,
      }];
    }
  }
  return [{
    title: order.product_title,
    variant: null,
    quantity: order.quantity,
    unitPrice: order.unit_price,
  }];
}

function parseVariantDetails(variant: string | null): string | null {
  if (!variant) return null;
  try {
    const parsed = JSON.parse(variant);
    if (parsed?.__items) return null; // multi-item, handled separately
    // Single item variant object — format nicely
    const parts: string[] = [];
    for (const [key, val] of Object.entries(parsed)) {
      if (key.startsWith("__")) continue;
      if (typeof val === "object" && val !== null) {
        const obj = val as Record<string, unknown>;
        if (obj.name) parts.push(`${key}: ${obj.name}`);
      } else {
        parts.push(`${key}: ${val}`);
      }
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  } catch {
    return variant;
  }
}

interface Props {
  order: DraftOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DraftOrderModal({ order, open, onOpenChange }: Props) {
  if (!order) return null;

  const items = parseDraftItems(order);
  const lastActivity = new Date(order.updated_at || order.created_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="text-lg font-serif flex items-center gap-2">
            <Package size={18} className="text-primary" />
            Abandoned Checkout
          </DialogTitle>
          <DialogDescription className="space-y-1 pt-1">
            <span className="flex items-center gap-2 text-sm text-foreground font-medium">
              {order.customer_name}
            </span>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone size={12} />
              <span className="font-mono">{order.customer_phone}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock size={11} />
              Last activity: {lastActivity.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Items in cart */}
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Items in Cart
          </h3>
          <div className="space-y-3">
            {items.map((item, idx) => {
              const variantDetail = item.variant ? parseVariantDetails(item.variant) || item.variant : null;
              return (
                <div
                  key={idx}
                  className="bg-muted/30 rounded-lg p-3 border border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">{item.title}</p>
                      {variantDetail && (
                        <p className="text-xs text-muted-foreground mt-0.5">{variantDetail}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 font-num">
                      × {item.quantity}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Unit Price</span>
                    <Taka amount={item.unitPrice} className="text-sm font-medium" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="mt-4 bg-muted/20 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <Taka amount={order.unit_price} className="font-medium" />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Delivery ({order.delivery_area === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"})</span>
            <Taka amount={order.delivery_charge} className="font-medium" />
          </div>
          <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
            <span>Potential Total</span>
            <Taka amount={order.total_amount} />
          </div>
        </div>

        {order.customization_note && (
          <div className="mt-3 p-3 bg-muted/20 rounded-lg">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-foreground">{order.customization_note}</p>
          </div>
        )}

        {/* Call to action hint */}
        {(() => {
          const rawPhone = order.customer_phone.replace(/\D/g, "");
          const whatsappPhone = rawPhone.startsWith("0") ? `88${rawPhone}` : rawPhone;
          const waMessage = encodeURIComponent(
            `সালাম ${order.customer_name}, আপনি Flaroma থেকে চকোলেট অর্ডার করতে চেয়েছিলেন কিন্তু শেষ করেননি। কোনো সমস্যা হচ্ছে কি? আমরা আপনাকে সাহায্য করতে পারি।`
          );
          return (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                asChild
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                <a href={`tel:${rawPhone}`}>
                  <PhoneCall size={16} />
                  Call Customer
                </a>
              </Button>
              <Button
                asChild
                className="flex-1 bg-strawberry text-destructive-foreground hover:bg-strawberry/90 font-semibold"
              >
                <a href={`https://wa.me/${whatsappPhone}?text=${waMessage}`} target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp Message
                </a>
              </Button>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
