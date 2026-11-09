import { useState, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck, Fingerprint } from "lucide-react";

interface PinPromptProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  loading?: boolean;
  title?: string;
  description?: string;
}

const PIN_LENGTH = 4;

const PinPrompt = ({
  open, onClose, onConfirm, loading,
  title = "Security Verification",
  description = "Enter your PIN to authorize this action.",
}: PinPromptProps) => {
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setDigits(Array(PIN_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all filled
    if (value && index === PIN_LENGTH - 1 && newDigits.every(d => d !== "")) {
      onConfirm(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && digits.every(d => d !== "")) {
      onConfirm(digits.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (pasted.length > 0) {
      const newDigits = Array(PIN_LENGTH).fill("");
      pasted.split("").forEach((ch, i) => { newDigits[i] = ch; });
      setDigits(newDigits);
      const focusIdx = Math.min(pasted.length, PIN_LENGTH - 1);
      inputRefs.current[focusIdx]?.focus();
      if (pasted.length === PIN_LENGTH) {
        onConfirm(newDigits.join(""));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setDigits(Array(PIN_LENGTH).fill("")); onClose(); } }}>
      <DialogContent className="max-w-[340px] p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
        {/* Gradient header */}
        <div className="relative bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(25,60%,25%)] to-[hsl(30,40%,15%)] px-6 pt-8 pb-6 text-center">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,200,100,0.2) 0%, transparent 50%)"
          }} />
          <div className="relative">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-4 shadow-lg">
              {loading ? (
                <Fingerprint size={28} className="text-amber-200 animate-pulse" />
              ) : (
                <ShieldCheck size={28} className="text-amber-200" />
              )}
            </div>
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-serif text-white tracking-wide">{title}</DialogTitle>
              <DialogDescription className="text-amber-100/70 text-xs">{description}</DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* PIN input area */}
        <div className="bg-card px-6 py-8">
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`
                  w-14 h-14 text-center text-xl font-bold font-num rounded-xl
                  border-2 transition-all duration-200 outline-none
                  bg-muted/50 text-foreground
                  ${digit ? "border-primary/60 shadow-[0_0_12px_hsl(var(--primary)/0.15)]" : "border-border"}
                  focus:border-primary focus:shadow-[0_0_16px_hsl(var(--primary)/0.25)] focus:bg-background
                `}
                disabled={loading}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl text-sm"
              onClick={() => { setDigits(Array(PIN_LENGTH).fill("")); onClose(); }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-11 rounded-xl text-sm bg-gradient-to-r from-primary to-[hsl(25,60%,30%)] hover:opacity-90 transition-opacity"
              onClick={() => onConfirm(digits.join(""))}
              disabled={digits.some(d => d === "") || loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Lock size={14} className="animate-pulse" /> Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock size={14} /> Confirm
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinPrompt;
