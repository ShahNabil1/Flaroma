import { Pencil } from "lucide-react";
import Taka from "@/components/Taka";

interface ParsedCustomOrder {
  isCustom: boolean;
  base?: string;
  design?: string;
  customDesignUrl?: string;
  designColor?: string;
  message?: string;
  specialNote?: string;
}

export interface ParsedAttributes {
  isAttributes: boolean;
  selections: { type: string; value: string; price: number }[];
}

export function parseAttributeVariant(variant?: string): ParsedAttributes {
  if (!variant) return { isAttributes: false, selections: [] };
  try {
    const data = JSON.parse(variant);
    if (typeof data !== "object" || !data.__attributes) return { isAttributes: false, selections: [] };
    const attrs = data.__attributes as Record<string, { value: string; price: number }>;
    const selections = Object.entries(attrs).map(([type, info]) => ({
      type,
      value: info.value,
      price: info.price || 0,
    }));
    return { isAttributes: true, selections };
  } catch {
    return { isAttributes: false, selections: [] };
  }
}

export function parseCustomVariant(variant?: string): ParsedCustomOrder {
  if (!variant) return { isCustom: false };
  try {
    const data = JSON.parse(variant);
    if (typeof data !== "object" || !data["Base"]) return { isCustom: false };
    return {
      isCustom: true,
      base: data["Base"],
      design: data["Design"],
      customDesignUrl: data["Custom Design"],
      designColor: data["Design Color"],
      message: data["Message"],
      specialNote: data["Special Note"],
    };
  } catch {
    return { isCustom: false };
  }
}

interface CustomOrderBadgeProps {
  className?: string;
}

export function CustomizedBadge({ className = "" }: CustomOrderBadgeProps) {
  return (
    <span
      className={`absolute top-1.5 left-1.5 z-10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-foreground/80 text-amber-300 backdrop-blur-sm ${className}`}
    >
      ✦ Customized
    </span>
  );
}

/** Displays attribute selections as chips */
export function AttributesSummary({ variant, compact = false }: { variant?: string; compact?: boolean }) {
  const { isAttributes, selections } = parseAttributeVariant(variant);
  if (!isAttributes || selections.length === 0) return null;

  return (
    <div className={compact ? "flex flex-wrap gap-1" : "flex flex-wrap gap-1.5"}>
      {selections.map((s, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 rounded-md bg-muted/60 border border-border/50 text-muted-foreground ${
            compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
          }`}
        >
          <span className="font-medium text-foreground/70">{s.type}:</span>
          <span>{s.value}</span>
        </span>
      ))}
    </div>
  );
}

interface CustomOrderSummaryProps {
  parsed: ParsedCustomOrder;
  compact?: boolean;
  showEditLink?: boolean;
}

export function CustomOrderSummary({ parsed, compact = false, showEditLink = false }: CustomOrderSummaryProps) {
  if (!parsed.isCustom) return null;

  const details = [
    parsed.base && { label: "Base", value: parsed.base },
    parsed.design && { label: "Design", value: parsed.design },
    parsed.customDesignUrl && { label: "Design", value: "Custom Uploaded" },
    parsed.designColor && parsed.designColor !== "No Color" && { label: "Color", value: parsed.designColor },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-1.5">
      {/* Detail chips */}
      <div className={compact ? "flex flex-wrap gap-1" : "flex flex-wrap gap-1.5"}>
        {details.map((d, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-md bg-muted/60 border border-border/50 text-muted-foreground ${
              compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
            }`}
          >
            <span className="font-medium text-foreground/70">{d.label}:</span>
            <span>{d.value}</span>
          </span>
        ))}
      </div>

      {/* Message preview */}
      {parsed.message && (
        <p className={`italic text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
          <span className="not-italic font-medium text-foreground/60">Message:</span>{" "}
          "{parsed.message}"
        </p>
      )}

      {/* Edit link */}
      {showEditLink && (
        <a
          href="/#customize"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700 transition-colors mt-0.5"
        >
          <Pencil size={10} /> Edit Customization
        </a>
      )}
    </div>
  );
}
