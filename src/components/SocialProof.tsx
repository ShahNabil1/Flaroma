import { motion } from "framer-motion";
import { Instagram } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import social1 from "@/assets/social/social-1.jpg";
import social2 from "@/assets/social/social-2.jpg";
import social3 from "@/assets/social/social-3.jpg";
import social4 from "@/assets/social/social-4.jpg";
import social5 from "@/assets/social/social-5.jpg";
import social6 from "@/assets/social/social-6.jpg";
import social7 from "@/assets/social/social-7.jpg";
import social8 from "@/assets/social/social-8.jpg";

const fallbackImages = [
  { src: social1, alt: "Kunafa chocolate box unboxing" },
  { src: social2, alt: "Chocolate bar cross section with pistachios" },
  { src: social3, alt: "Assorted artisan truffles and kunafa bites" },
  { src: social4, alt: "Hands holding gift box of chocolates" },
  { src: social5, alt: "Single kunafa piece with chocolate drizzle" },
  { src: social6, alt: "Premium gift packaging" },
  { src: social7, alt: "Customer review with 5 stars" },
  { src: social8, alt: "Stacked kunafa chocolate bars" },
];

const SocialProof = () => {
  const { data: settings } = useSiteSettings();
  const c = settings?.community;

  const badgeText = c?.badge_text ?? "Community";
  const title = c?.title ?? "#FlaromaMoments";
  const subtitle = c?.subtitle ?? "আমাদের কমিউনিটির চকোলেট প্রেমীদের কিছু মুহূর্ত";

  // Use CMS images if available, otherwise fallback
  const images = c?.images?.length
    ? c.images.map(img => ({ src: img.url, alt: img.alt }))
    : fallbackImages;

  return (
    <section id="community" className="pt-10 sm:pt-16 md:pt-24 pb-10 sm:pb-14 bg-secondary/30 scroll-mt-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-gold-dark">
            {badgeText}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mt-3">
            {title}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto text-sm">
            {subtitle}
          </p>
        </motion.div>

        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="relative group break-inside-avoid overflow-hidden rounded-2xl"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/40 transition-all duration-300 flex items-center justify-center">
                <Instagram
                  size={28}
                  className="text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <a
            href="https://www.instagram.com/flaroma19/"
            target="_blank"
            rel="noopener noreferrer"
            className="group/ig inline-flex items-center gap-2 text-sm font-semibold text-gold-dark transition-all duration-300"
          >
            <span className="relative inline-flex w-[18px] h-[18px]">
              {/* Default icon */}
              <Instagram size={18} className="absolute inset-0 transition-opacity duration-300 group-hover/ig:opacity-0" />
              {/* Gradient icon on hover — uses inline SVG with gradient stroke */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18" height="18" viewBox="0 0 24 24"
                fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="absolute inset-0 opacity-0 group-hover/ig:opacity-100 transition-opacity duration-300"
              >
                <defs>
                  <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fcaf45" />
                    <stop offset="30%" stopColor="#f56040" />
                    <stop offset="55%" stopColor="#e1306c" />
                    <stop offset="80%" stopColor="#833ab4" />
                    <stop offset="100%" stopColor="#405de6" />
                  </linearGradient>
                </defs>
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" stroke="url(#ig-grad)" />
                <circle cx="12" cy="12" r="5" stroke="url(#ig-grad)" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" stroke="url(#ig-grad)" />
              </svg>
            </span>
            <span className="group-hover/ig:bg-gradient-to-r group-hover/ig:from-[#833ab4] group-hover/ig:via-[#e1306c] group-hover/ig:to-[#f77737] group-hover/ig:bg-clip-text group-hover/ig:text-transparent transition-all duration-300">
              Follow @flaroma19 on Instagram
            </span>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default SocialProof;
