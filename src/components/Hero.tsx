import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import heroChocolateDefault from "@/assets/hero-chocolate.jpg";
import { useSiteSettings } from "@/hooks/use-site-settings";
import Taka from "@/components/Taka";

const Hero = () => {
  const { data: settings } = useSiteSettings();
  const h = settings?.hero;

  const title = h?.title ?? "এক কামড়েই দুবাইয়ের";
  const titleHighlight = h?.title_highlight ?? "আভিজাত্য";
  const subtitle = h?.subtitle ?? "— এখন আপনার হাতে।";
  const description = h?.description ?? "খাঁটি পেস্তা, ক্রিসপি কুনাফা আর প্রিমিয়াম চকোলেটের এক অনন্য ফিউশন।\nপ্রতিটি বার পরম যত্নে হাতে তৈরি।";
  const ctaText = h?.cta_text ?? "স্বাদ নিতে ক্লিক করুন";
  const secondaryCtaText = h?.secondary_cta_text ?? "আমাদের গল্প জানুন";
  const badgeText = h?.badge_text ?? "Handcrafted in Dhaka";
  const stat1Value = h?.stat_1_value ?? "500+";
  const stat1Label = h?.stat_1_label ?? "Happy Customers";
  const stat2Value = h?.stat_2_value ?? "100%";
  const stat2Label = h?.stat_2_label ?? "Handmade";
  const stat3Value = h?.stat_3_value ?? "4.9★";
  const stat3Label = h?.stat_3_label ?? "Avg Rating";
  const startingPrice = h?.starting_price ?? "৳ 350";

  // Media logic
  const videoUrl = h?.video_url;
  const videoActive = h?.video_active ?? false;
  const showVideo = !!videoUrl && videoActive;

  // Build image list: prefer image_urls array, fallback to single image_url, then default
  const imageUrls: string[] = (() => {
    if (h?.image_urls && h.image_urls.length > 0) return h.image_urls;
    if (h?.image_url) return [h.image_url];
    return [heroChocolateDefault];
  })();

  const showSlider = !showVideo && imageUrls.length > 1;

  // Auto-fading slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % imageUrls.length);
  }, [imageUrls.length]);

  useEffect(() => {
    if (!showSlider) return;
    const interval = setInterval(nextSlide, 4000);
    return () => clearInterval(interval);
  }, [showSlider, nextSlide]);

  // Reset slide index when images change
  useEffect(() => {
    setCurrentSlide(0);
  }, [imageUrls.length]);

  return (
    <section className="relative min-h-screen flex items-center pt-28 sm:pt-20 overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-strawberry/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="order-2 lg:order-1"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-gold/10 text-gold-dark text-xs font-semibold tracking-widest uppercase mb-6">
              {badgeText}
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold leading-[1.1] text-foreground mb-6">
              {title}{" "}
              <span className="text-gradient-gold">{titleHighlight}</span>
              <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl font-medium italic text-muted-foreground">
                {subtitle}
              </span>
            </h1>

            <p className="text-base lg:text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed whitespace-pre-line">
              {description}
            </p>

            <div className="flex flex-wrap gap-4 items-center">
              <motion.a
                href="#products"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-strawberry text-destructive-foreground font-semibold rounded-full shadow-lg animate-pulse-cta transition-colors hover:bg-strawberry-light"
              >
                {ctaText}
              </motion.a>
              <a
                href="#process"
                className="inline-flex items-center gap-2 px-6 py-4 text-foreground font-medium border border-border rounded-full hover:bg-card transition-colors"
              >
                {secondaryCtaText}
              </a>
            </div>

            <div className="flex items-center gap-8 mt-10 pt-8 border-t border-border">
              <div>
                <p className="text-2xl font-num font-bold text-foreground">{stat1Value}</p>
                <p className="text-xs text-muted-foreground">{stat1Label}</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div>
                <p className="text-2xl font-num font-bold text-foreground">{stat2Value}</p>
                <p className="text-xs text-muted-foreground">{stat2Label}</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div>
                <p className="text-2xl font-num font-bold text-foreground">{stat3Value}</p>
                <p className="text-xs text-muted-foreground">{stat3Label}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="order-1 lg:order-2 relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-lg">
              <div className="absolute inset-0 bg-gradient-gold rounded-3xl rotate-3 scale-105 opacity-20 blur-xl" />

              {/* Video Player */}
              {showVideo && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    autoPlay
                    muted={isMuted}
                    loop
                    playsInline
                    className="relative rounded-3xl shadow-luxury w-full object-cover aspect-[3/4]"
                  />
                  <button
                    onClick={() => {
                      setIsMuted(m => !m);
                      if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
                    }}
                    className="absolute bottom-4 right-4 z-10 p-2.5 rounded-full bg-background/70 backdrop-blur-sm border border-border text-foreground hover:bg-background/90 transition-colors"
                    aria-label={isMuted ? "Unmute video" : "Mute video"}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
              )}

              {/* Image Slider (multiple images) */}
              {showSlider && (
                <div className="relative rounded-3xl shadow-luxury w-full aspect-[3/4] overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentSlide}
                      src={imageUrls[currentSlide]}
                      alt="Premium Dubai Kunafa Chocolate"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="absolute inset-0 w-full h-full object-cover rounded-3xl"
                    />
                  </AnimatePresence>
                  {/* Slide indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {imageUrls.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          i === currentSlide ? "bg-white w-6" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Single Image (fallback) */}
              {!showVideo && !showSlider && (
                <img
                  src={imageUrls[0]}
                  alt="Premium Dubai Kunafa Chocolate with pistachio layers"
                  className="relative rounded-3xl shadow-luxury w-full object-cover aspect-[3/4]"
                />
              )}

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 bg-background rounded-2xl p-4 shadow-luxury border border-border"
              >
                <p className="text-xs text-muted-foreground">Starting from</p>
                <p className="text-xl font-bold text-foreground"><Taka amount={startingPrice.replace(/[৳\s]/g, '')} /></p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
