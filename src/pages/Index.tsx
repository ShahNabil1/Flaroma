import Hero from "@/components/Hero";
import ProductCatalog from "@/components/ProductCatalog";
import CustomizationEngine from "@/components/CustomizationEngine";
import ProcessTimeline from "@/components/ProcessTimeline";
import SocialProof from "@/components/SocialProof";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <ProductCatalog />
      <CustomizationEngine />
      <SocialProof />
      <ProcessTimeline />
    </div>
  );
};

export default Index;
