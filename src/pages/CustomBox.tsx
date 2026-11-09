import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CustomizationEngine from "@/components/CustomizationEngine";

const CustomBox = () => {
  useEffect(() => {
    document.title = "Build Your Custom Kunafa Box | Flaroma";

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        if (property.startsWith("og:") || property.startsWith("twitter:")) {
          el.setAttribute("property", property);
        } else {
          el.setAttribute("name", property);
        }
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("og:title", "Build Your Custom Kunafa Box | Flaroma");
    setMeta("og:description", "Choose your base, design, and color to create the perfect personalized chocolate box.");
    setMeta("og:image", "https://flaroma.lovable.app/images/custom-box-og.jpg");
    setMeta("og:url", "https://flaroma.lovable.app/custom");
    setMeta("og:type", "website");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", "Build Your Custom Kunafa Box | Flaroma");
    setMeta("twitter:description", "Choose your base, design, and color to create the perfect personalized chocolate box.");

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Choose your base, design, and color to create the perfect personalized chocolate box.");
    }

    return () => {
      document.title = "Flaroma";
      const defaultDesc = "খাঁটি পেস্তা, ক্রিসপি কুনাফা আর প্রিমিয়াম চকোলেটের এক অনন্য ফিউশন। প্রতিটি বার পরম যত্নে হাতে তৈরি।";
      setMeta("og:title", "Flaroma");
      setMeta("og:description", defaultDesc);
      setMeta("twitter:title", "Flaroma");
      setMeta("twitter:description", defaultDesc);
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", defaultDesc);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-28 md:pt-20">
        <div className="container mx-auto px-6 mb-4 md:hidden">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
        </div>
        <CustomizationEngine />
      </div>
    </div>
  );
};

export default CustomBox;
