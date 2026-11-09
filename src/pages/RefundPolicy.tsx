import { Shield, Wallet, RotateCcw, Gift, Phone } from "lucide-react";
import PageTransition from "@/components/PageTransition";

const sections = [
  {
    icon: Shield,
    title: "১. সাধারণ নীতিমালা",
    body: "আমাদের প্রতিটি পণ্য কাস্টমাইজড এবং প্রিমিয়াম ফুড আইটেম হওয়ায় আমরা পণ্যের সর্বোচ্চ গুণগত মান নিশ্চিত করি। স্বাস্থ্যবিধি এবং পণ্যের সতেজতা বজায় রাখতে আমাদের কিছু সুনির্দিষ্ট নীতিমালা রয়েছে।",
  },
  {
    icon: Wallet,
    title: "২. অগ্রিম পেমেন্ট ও অর্ডার কনফার্মেশন",
    body: null,
    bullets: [
      "যেকোনো অর্ডার কনফার্ম করার জন্য নূন্যতম ৩০% অগ্রিম পেমেন্ট করা বাধ্যতামূলক।",
      "আপনার প্রদানকৃত এই অগ্রিম পেমেন্ট সম্পূর্ণ অফেরতযোগ্য (Non-refundable)।",
    ],
  },
  {
    icon: RotateCcw,
    title: "৩. রিটার্ন ও রিফান্ড সংক্রান্ত শর্তাবলী",
    body: null,
    bullets: [
      "আমাদের পণ্যগুলো পচনশীল (Perishable) এবং আপনার অর্ডারের ভিত্তিতে বিশেষভাবে তৈরি করা হয়, তাই কোনো প্রকার রিটার্ন বা রিফান্ড প্রযোজ্য নয়।",
      "পণ্য ডেলিভারি নেওয়ার সময় কোনো সমস্যা থাকলে তাৎক্ষণিকভাবে ডেলিভারি ম্যানের উপস্থিতিতে আমাদের সাথে যোগাযোগ করতে হবে।",
    ],
  },
  {
    icon: Gift,
    title: "৪. গিফট ডেলিভারি",
    body: "প্রিয়জনকে উপহার পাঠানোর ক্ষেত্রে সম্পূর্ণ মূল্য (Full Payment) অগ্রিম পরিশোধ করতে হবে। এক্ষেত্রেও কোনো রিফান্ড বা অর্ডার বাতিল করার সুযোগ নেই।",
  },
  {
    icon: Phone,
    title: "৫. যোগাযোগ",
    body: "যেকোনো জিজ্ঞাসা বা সহায়তার জন্য আমাদের সাথে সরাসরি হোয়াটসঅ্যাপে যোগাযোগ করুন অথবা কল করুন:",
    contact: "+880 1766-919551",
  },
];

const RefundPolicy = () => (
  <div className="min-h-screen bg-background">
    {/* Hero header with top padding to clear navbar */}
    <div className="bg-primary pt-28 pb-10 md:pt-32 md:pb-16 text-center">
      <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary-foreground">
        রিটার্ন ও রিফান্ড পলিসি
      </h1>
      <p className="mt-3 text-primary-foreground/60 text-sm md:text-base font-sans">
        Return &amp; Refund Policy
      </p>
    </div>

    {/* Content */}
    <div className="container mx-auto max-w-3xl px-5 py-12 md:py-16 space-y-8">
      {sections.map((s, i) => {
        const Icon = s.icon;
        return (
          <section
            key={i}
            className="bg-card rounded-xl p-6 md:p-8 shadow-sm border border-border"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon size={20} className="text-primary" />
              </div>
              <h2 className="font-serif text-lg md:text-xl font-semibold text-foreground">
                {s.title}
              </h2>
            </div>

            {s.body && (
              <p className="text-muted-foreground leading-relaxed font-sans text-sm md:text-base">
                {s.body}
              </p>
            )}

            {s.bullets && (
              <ul className="mt-2 space-y-3">
                {s.bullets.map((b, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2 text-muted-foreground text-sm md:text-base font-sans leading-relaxed"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            )}

            {s.contact && (
              <a
                href={`tel:${s.contact.replace(/\s/g, "")}`}
                className="inline-block mt-3 font-num text-primary font-semibold hover:text-accent transition-colors"
              >
                {s.contact}
              </a>
            )}
          </section>
        );
      })}
    </div>
  </div>
);

export default RefundPolicy;
