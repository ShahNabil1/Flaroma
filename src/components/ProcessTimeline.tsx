import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useSiteSettings } from "@/hooks/use-site-settings";

import kataifiImg from "@/assets/process/kataifi.jpg";
import pistachioImg from "@/assets/process/pistachio.jpg";
import chocolateImg from "@/assets/process/chocolate.jpg";
import smallbatchImg from "@/assets/process/smallbatch.jpg";

const defaultSteps = [
  { num: "01", title: "Authentic Kataifi", title_bn: "আসল কাতাইফি", desc: "আমরা সবচেয়ে ভালো মানের কাতাইফি প্যাস্ট্রি ব্যবহার করি — প্রতিটি সুতো সূক্ষ্মভাবে তৈরি।", icon: "Wheat", image_url: "" },
  { num: "02", title: "Premium Pistachio", title_bn: "প্রিমিয়াম পেস্তা", desc: "ইরানি ও তুর্কি পেস্তা থেকে বাছাই করা — সতেজ, সুগন্ধি, পুষ্টিকর।", icon: "Leaf", image_url: "" },
  { num: "03", title: "Artisan Chocolate", title_bn: "আর্টিজান চকোলেট", desc: "বেলজিয়ান কোকো থেকে তৈরি প্রিমিয়াম চকোলেট — কোনো প্রিজারভেটিভ নেই।", icon: "Coffee", image_url: "" },
  { num: "04", title: "Small Batch Production", title_bn: "স্মল ব্যাচ প্রোডাকশন", desc: "প্রতিটি ব্যাচ ৫০ পিসের বেশি নয় — সর্বোচ্চ মান নিশ্চিত করতে।", icon: "FlameKindling", image_url: "" },
];

const fallbackImages = [kataifiImg, pistachioImg, chocolateImg, smallbatchImg];

// Staggered vertical offsets for masonry feel
const masonryOffsets = ["md:mt-0", "md:mt-12", "md:mt-4", "md:mt-16"];

const ProcessCard = ({ step, index }: { step: { num: string; title: string; title_bn: string; desc: string; icon: string; image_url?: string }; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Parallax: image moves at a slower rate
  const imageY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  const imgSrc = step.image_url || fallbackImages[index] || fallbackImages[0];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.15, duration: 0.7, type: "spring", bounce: 0.25 }}
      className={`group ${masonryOffsets[index] || ""}`}
    >
      <div
        className="relative h-full rounded-2xl overflow-hidden border border-border/60 shadow-sm transition-all duration-500 hover:shadow-[0_0_30px_-5px_hsl(var(--strawberry)/0.2)] hover:border-strawberry/30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5b0' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: "hsl(var(--background))",
        }}
      >
        {/* Circular image with gold ring */}
        <div className="flex justify-center pt-8 pb-4">
          <div className="relative">
            {/* Gold ring */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-br from-gold via-gold-light to-gold-dark">
              <div className="w-full h-full rounded-full overflow-hidden">
                <motion.div style={{ y: imageY }} className="w-full h-[120%] -mt-[10%]">
                  <img
                    src={imgSrc}
                    alt={step.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </motion.div>
              </div>
            </div>
            {/* Sketch-style decorative ring */}
            <div
              className="absolute -inset-2 rounded-full border border-dashed border-gold/30 pointer-events-none"
              style={{ borderSpacing: "4px" }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-7 pt-2 text-center">
          {/* Step number */}
          <span className="inline-block text-xs font-bold tracking-[0.3em] font-num text-strawberry mb-2">
            {step.num}
            <span className="block h-[2px] w-6 mx-auto mt-1 rounded-full bg-strawberry/40" />
          </span>

          {/* Title */}
          <h3 className="font-serif text-lg font-bold mt-2 mb-1 text-foreground group-hover:text-strawberry transition-colors duration-300">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-3 font-bengali">{step.title_bn}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
        </div>
      </div>
    </motion.div>
  );
};

const ProcessTimeline = () => {
  const { data: settings } = useSiteSettings();
  const p = settings?.process;

  const badgeText = p?.badge_text ?? "Our Process";
  const title = p?.title ?? "কিভাবে তৈরি হয়?";
  const subtitle = p?.subtitle ?? "আমরা শুধু চকোলেট বানাই না, আমরা তৈরি করি একটি অভিজ্ঞতা।";
  const steps = p?.steps?.length ? p.steps : defaultSteps;

  return (
    <section id="process" className="pt-10 sm:pt-14 pb-24 bg-secondary/30 scroll-mt-24">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-gold-dark">
            {badgeText}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mt-3">
            {title}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto text-sm leading-relaxed">
            {subtitle}
          </p>
        </motion.div>

        {/* Masonry-style staggered grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <ProcessCard key={s.num} step={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessTimeline;
