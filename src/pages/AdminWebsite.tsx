import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save, Upload, Trash2, Plus, Image as ImageIcon, FolderOpen, Truck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";
import type { HeroSettings, ProductsSectionSettings, ProcessSettings, ProcessStep, CommunitySettings } from "@/hooks/use-site-settings";
import MediaLibrary from "@/components/admin/MediaLibrary";
import BuildFlowManager from "@/components/admin/BuildFlowManager";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAnalyticsHeader from "@/components/admin/AdminAnalyticsHeader";
import DeliverySettingsTab, { type DeliverySettingsTabRef } from "@/components/admin/DeliverySettingsTab";

const CLOUD_NAME = "dvfb58wu4";
const UPLOAD_PRESET = "flaroma_upload";

const ICON_OPTIONS = ["Wheat", "Leaf", "Coffee", "FlameKindling", "Heart", "Star", "Sparkles", "Gem", "Award", "Package"];

const defaultHero: HeroSettings = {
  title: "এক কামড়েই দুবাইয়ের", title_highlight: "আভিজাত্য", subtitle: "— এখন আপনার হাতে।",
  description: "", cta_text: "স্বাদ নিতে ক্লিক করুন", secondary_cta_text: "আমাদের গল্প জানুন",
  image_url: "", image_urls: [], video_url: "", video_active: false,
  badge_text: "Handcrafted in Dhaka",
  stat_1_value: "500+", stat_1_label: "Happy Customers",
  stat_2_value: "100%", stat_2_label: "Handmade",
  stat_3_value: "4.9★", stat_3_label: "Avg Rating",
  starting_price: "৳ 350",
};

const defaultProducts: ProductsSectionSettings = {
  badge_text: "Our Collection", title: "প্রিমিয়াম কুনাফা চকোলেট",
  subtitle: "প্রতিটি বার দুবাইয়ের ঐতিহ্যবাহী রেসিপিতে তৈরি — প্রিমিয়াম উপকরণ দিয়ে।",
};

const defaultProcess: ProcessSettings = {
  badge_text: "Our Process", title: "কিভাবে তৈরি হয়?",
  subtitle: "আমরা শুধু চকোলেট বানাই না, আমরা তৈরি করি একটি অভিজ্ঞতা।",
  steps: [
    { num: "01", icon: "Wheat", title: "Authentic Kataifi", title_bn: "আসল কাতাইফি", desc: "", image_url: "" },
    { num: "02", icon: "Leaf", title: "Premium Pistachio", title_bn: "প্রিমিয়াম পেস্তা", desc: "", image_url: "" },
    { num: "03", icon: "Coffee", title: "Artisan Chocolate", title_bn: "আর্টিজান চকোলেট", desc: "", image_url: "" },
    { num: "04", icon: "FlameKindling", title: "Small Batch Production", title_bn: "স্মল ব্যাচ প্রোডাকশন", desc: "", image_url: "" },
  ],
};

const defaultCommunity: CommunitySettings = {
  badge_text: "Community", title: "#FlaromaMoments",
  subtitle: "আমাদের কমিউনিটির চকোলেট প্রেমীদের কিছু মুহূর্ত",
  images: [],
};

const AdminWebsite = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hero, setHero] = useState<HeroSettings>(defaultHero);
  const [products, setProducts] = useState<ProductsSectionSettings>(defaultProducts);
  const [process, setProcess] = useState<ProcessSettings>(defaultProcess);
  const [community, setCommunity] = useState<CommunitySettings>(defaultCommunity);
  const [uploading, setUploading] = useState<string | null>(null);
  const [communityDeleteIdx, setCommunityDeleteIdx] = useState<number | null>(null);
  const deliveryRef = useRef<DeliverySettingsTabRef>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/admin");
    };
    checkAuth();
  }, [navigate]);

  const { isLoading } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: adminApi.getSiteSettings,
    refetchOnWindowFocus: false,
    // @ts-ignore
    onSuccess: (data: any) => {
      if (data.hero) setHero({ ...defaultHero, ...data.hero });
      if (data.products_section) setProducts({ ...defaultProducts, ...data.products_section });
      if (data.process) setProcess({ ...defaultProcess, ...data.process });
      if (data.community) setCommunity({ ...defaultCommunity, ...data.community });
    },
  });

  // Fetch on mount using effect as fallback
  const { data: settingsData } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: adminApi.getSiteSettings,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (settingsData) {
      if (settingsData.hero) setHero({ ...defaultHero, ...settingsData.hero });
      if (settingsData.products_section) setProducts({ ...defaultProducts, ...settingsData.products_section });
      if (settingsData.process) setProcess({ ...defaultProcess, ...settingsData.process });
      if (settingsData.community) setCommunity({ ...defaultCommunity, ...settingsData.community });
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await adminApi.saveSiteSettings({ hero, products_section: products, process, community });
      // Also save delivery settings
      if (deliveryRef.current) {
        await deliveryRef.current.save();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-site-settings"] });
      toast({ title: "Settings saved!", description: "Homepage content updated successfully." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const uploadImage = async (file: File, onUrl: (url: string) => void, key: string) => {
    setUploading(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.secure_url) { onUrl(data.secure_url); toast({ title: "Image uploaded!" }); }
      else throw new Error(data.error?.message || "Upload failed");
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally { setUploading(null); }
  };

  const updateStep = (i: number, field: keyof ProcessStep, value: string) => {
    setProcess(p => ({
      ...p,
      steps: p.steps.map((s, idx) => idx === i ? { ...s, [field]: value } : s),
    }));
  };

  const addCommunityImage = (url: string) => {
    setCommunity(c => ({ ...c, images: [...c.images, { url, alt: "Community photo" }] }));
  };

  const removeCommunityImage = (i: number) => {
    setCommunity(c => ({ ...c, images: c.images.filter((_, idx) => idx !== i) }));
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar activePage="website" />

      {/* Main */}
      <main className="ml-64 p-8">
        <AdminAnalyticsHeader />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Website Content</h2>
            <p className="text-sm text-muted-foreground">Manage your homepage sections</p>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            <Save size={16} /> {saveMutation.isPending ? "Saving..." : "Save All Changes"}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading settings...</p>
        ) : (
          <Tabs defaultValue="hero" className="space-y-6">
             <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="hero">Hero</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="process">Process</TabsTrigger>
              <TabsTrigger value="community">Community</TabsTrigger>
              <TabsTrigger value="build-flow">Build Flow</TabsTrigger>
              <TabsTrigger value="delivery" className="gap-1.5"><Truck size={14} /> Delivery</TabsTrigger>
              <TabsTrigger value="media" className="gap-1.5"><FolderOpen size={14} /> Media</TabsTrigger>
            </TabsList>

            {/* ===== HERO ===== */}
            <TabsContent value="hero" className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <h3 className="font-serif text-lg font-bold text-foreground">Hero Section</h3>
                <Separator />

                <div className="space-y-2">
                  <Label>Badge Text</Label>
                  <Input value={hero.badge_text} onChange={e => setHero(h => ({ ...h, badge_text: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title (Main Line)</Label>
                    <Input value={hero.title} onChange={e => setHero(h => ({ ...h, title: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Title Highlight (Gold Text)</Label>
                    <Input value={hero.title_highlight} onChange={e => setHero(h => ({ ...h, title_highlight: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input value={hero.subtitle} onChange={e => setHero(h => ({ ...h, subtitle: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={hero.description} onChange={e => setHero(h => ({ ...h, description: e.target.value }))} rows={3} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CTA Button Text</Label>
                    <Input value={hero.cta_text} onChange={e => setHero(h => ({ ...h, cta_text: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary CTA Text</Label>
                    <Input value={hero.secondary_cta_text} onChange={e => setHero(h => ({ ...h, secondary_cta_text: e.target.value }))} />
                  </div>
                </div>

                {/* Hero Media Manager */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Hero Media Manager</Label>
                  <p className="text-xs text-muted-foreground">Upload up to 3 images for an auto-fading slider, or a video for autoplay. Video takes priority when active.</p>

                  {/* Video Upload */}
                  <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Hero Video</Label>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Active</Label>
                        <input
                          type="checkbox"
                          checked={hero.video_active ?? false}
                          onChange={e => setHero(h => ({ ...h, video_active: e.target.checked }))}
                          className="rounded"
                          disabled={!hero.video_url}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {hero.video_url && (
                        <video src={hero.video_url} className="w-32 h-20 rounded-lg object-cover border border-border" muted />
                      )}
                      <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                        <Upload size={16} />
                        {uploading === "hero-video" ? "Uploading..." : "Upload Video"}
                        <input type="file" accept="video/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) uploadImage(file, url => setHero(h => ({ ...h, video_url: url, video_active: true })), "hero-video");
                        }} disabled={uploading === "hero-video"} />
                      </label>
                      {hero.video_url && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setHero(h => ({ ...h, video_url: "", video_active: false }))}>
                          <Trash2 size={14} className="mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Multi-Image Upload */}
                  <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                    <Label className="text-sm font-medium">Hero Images (up to 3)</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[0, 1, 2].map(idx => {
                        const images = hero.image_urls ?? [];
                        const url = images[idx];
                        return (
                          <div key={idx} className="relative aspect-[3/4] rounded-xl border-2 border-dashed border-border bg-background overflow-hidden group">
                            {url ? (
                              <>
                                <img src={url} alt={`Hero ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                  onClick={() => {
                                    const newUrls = [...images];
                                    newUrls.splice(idx, 1);
                                    setHero(h => ({ ...h, image_urls: newUrls, image_url: newUrls[0] || h.image_url }));
                                  }}
                                  className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <span className="absolute bottom-1.5 left-1.5 bg-background/70 backdrop-blur-sm text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-foreground">
                                  {idx + 1}
                                </span>
                              </>
                            ) : (
                              <label className="flex flex-col items-center justify-center h-full cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                                <ImageIcon size={20} className="mb-1" />
                                <span className="text-[10px]">{uploading === `hero-img-${idx}` ? "Uploading..." : `Image ${idx + 1}`}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) uploadImage(file, newUrl => {
                                    setHero(h => {
                                      const imgs = [...(h.image_urls ?? [])];
                                      imgs[idx] = newUrl;
                                      // Fill gaps
                                      const cleaned = imgs.filter(Boolean);
                                      return { ...h, image_urls: cleaned, image_url: cleaned[0] || h.image_url };
                                    });
                                  }, `hero-img-${idx}`);
                                }} disabled={!!uploading} />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Legacy single image fallback display */}
                    {hero.image_url && (!hero.image_urls || hero.image_urls.length === 0) && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border">
                        <img src={hero.image_url} alt="Legacy hero" className="w-12 h-16 rounded object-cover" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Legacy single image (will be replaced when you upload above)</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />
                <h4 className="font-semibold text-sm text-foreground">Statistics</h4>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Stat 1 Value</Label>
                    <Input value={hero.stat_1_value} onChange={e => setHero(h => ({ ...h, stat_1_value: e.target.value }))} />
                    <Input value={hero.stat_1_label} onChange={e => setHero(h => ({ ...h, stat_1_label: e.target.value }))} placeholder="Label" className="mt-1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Stat 2 Value</Label>
                    <Input value={hero.stat_2_value} onChange={e => setHero(h => ({ ...h, stat_2_value: e.target.value }))} />
                    <Input value={hero.stat_2_label} onChange={e => setHero(h => ({ ...h, stat_2_label: e.target.value }))} placeholder="Label" className="mt-1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Stat 3 Value</Label>
                    <Input value={hero.stat_3_value} onChange={e => setHero(h => ({ ...h, stat_3_value: e.target.value }))} />
                    <Input value={hero.stat_3_label} onChange={e => setHero(h => ({ ...h, stat_3_label: e.target.value }))} placeholder="Label" className="mt-1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Starting Price Text</Label>
                  <Input value={hero.starting_price} onChange={e => setHero(h => ({ ...h, starting_price: e.target.value }))} className="max-w-xs" />
                </div>
              </div>
            </TabsContent>

            {/* ===== PRODUCTS SECTION ===== */}
            <TabsContent value="products" className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <h3 className="font-serif text-lg font-bold text-foreground">Products Section Header</h3>
                <Separator />
                <div className="space-y-2">
                  <Label>Badge Text</Label>
                  <Input value={products.badge_text} onChange={e => setProducts(p => ({ ...p, badge_text: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Section Title</Label>
                  <Input value={products.title} onChange={e => setProducts(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Sub-headline</Label>
                  <Textarea value={products.subtitle} onChange={e => setProducts(p => ({ ...p, subtitle: e.target.value }))} rows={2} />
                </div>
              </div>
            </TabsContent>

            {/* ===== PROCESS ===== */}
            <TabsContent value="process" className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <h3 className="font-serif text-lg font-bold text-foreground">Our Process Section</h3>
                <Separator />
                <div className="space-y-2">
                  <Label>Badge Text</Label>
                  <Input value={process.badge_text} onChange={e => setProcess(p => ({ ...p, badge_text: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Section Title</Label>
                    <Input value={process.title} onChange={e => setProcess(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtitle</Label>
                    <Input value={process.subtitle} onChange={e => setProcess(p => ({ ...p, subtitle: e.target.value }))} />
                  </div>
                </div>

                <Separator />
                <h4 className="font-semibold text-sm text-foreground">Process Steps</h4>

                <div className="space-y-4">
                  {process.steps.map((step, i) => (
                    <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground tracking-widest">{step.num}</span>
                        <span className="text-sm font-semibold text-foreground">{step.title || "Step"}</span>
                      </div>

                      {/* Step Image */}
                      <div className="space-y-1">
                        <Label className="text-xs">Step Image (Cloudinary)</Label>
                        <div className="flex items-center gap-3">
                          {step.image_url && (
                            <img src={step.image_url} alt={step.title} className="w-16 h-16 rounded-full object-cover border-2 border-gold/40" />
                          )}
                          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors text-xs text-muted-foreground">
                            <Upload size={14} />
                            {uploading === `step-${i}` ? "Uploading..." : step.image_url ? "Change Image" : "Upload Image"}
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) uploadImage(file, url => updateStep(i, "image_url", url), `step-${i}`);
                            }} disabled={uploading === `step-${i}`} />
                          </label>
                          {step.image_url && (
                            <button onClick={() => updateStep(i, "image_url", "")} className="text-xs text-destructive hover:underline">Remove</button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Icon (fallback)</Label>
                          <select
                            value={step.icon}
                            onChange={e => updateStep(i, "icon", e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {ICON_OPTIONS.map(ic => (
                              <option key={ic} value={ic}>{ic}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Title (English)</Label>
                          <Input value={step.title} onChange={e => updateStep(i, "title", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Title (Bangla)</Label>
                          <Input value={step.title_bn} onChange={e => updateStep(i, "title_bn", e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description (Bangla)</Label>
                        <Textarea value={step.desc} onChange={e => updateStep(i, "desc", e.target.value)} rows={2} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ===== COMMUNITY ===== */}
            <TabsContent value="community" className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <h3 className="font-serif text-lg font-bold text-foreground">Community (#FlaromaMoments)</h3>
                <Separator />
                <div className="space-y-2">
                  <Label>Badge Text</Label>
                  <Input value={community.badge_text} onChange={e => setCommunity(c => ({ ...c, badge_text: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Section Title</Label>
                    <Input value={community.title} onChange={e => setCommunity(c => ({ ...c, title: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtitle</Label>
                    <Textarea value={community.subtitle} onChange={e => setCommunity(c => ({ ...c, subtitle: e.target.value }))} rows={2} />
                  </div>
                </div>

                <Separator />
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-foreground">Gallery Images</h4>
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                    <Plus size={16} />
                    {uploading === "community" ? "Uploading..." : "Add Image"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(file, url => addCommunityImage(url), "community");
                    }} disabled={uploading === "community"} />
                  </label>
                </div>

                {community.images.length === 0 ? (
                  <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                    <ImageIcon size={32} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No gallery images yet. Upload images to populate the #FlaromaMoments section.</p>
                    <p className="text-xs text-muted-foreground mt-1">Static fallback images will be used until you add custom ones.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {community.images.map((img, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-border">
                        <img src={img.url} alt={img.alt} className="w-full aspect-square object-cover" />
                        <button
                          onClick={() => setCommunityDeleteIdx(i)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                        <Input
                          value={img.alt}
                          onChange={e => {
                            setCommunity(c => ({
                              ...c,
                              images: c.images.map((im, idx) => idx === i ? { ...im, alt: e.target.value } : im),
                            }));
                          }}
                          placeholder="Alt text"
                          className="text-xs mt-1"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Community Image Delete Confirmation */}
            <DeleteConfirmDialog
              open={communityDeleteIdx !== null}
              onClose={() => setCommunityDeleteIdx(null)}
              onConfirm={() => {
                if (communityDeleteIdx !== null) {
                  removeCommunityImage(communityDeleteIdx);
                  setCommunityDeleteIdx(null);
                }
              }}
              title="Remove this image?"
              description="This image will be removed from the community gallery. You can re-upload it later."
              confirmLabel="Remove"
            />

            {/* ===== BUILD FLOW ===== */}
            <TabsContent value="build-flow">
              <BuildFlowManager />
            </TabsContent>

            {/* ===== DELIVERY SETTINGS ===== */}
            <TabsContent value="delivery">
              <DeliverySettingsTab ref={deliveryRef} />
            </TabsContent>

            {/* ===== MEDIA LIBRARY ===== */}
            <TabsContent value="media">
              <MediaLibrary />
            </TabsContent>
          </Tabs>
        )}

        {/* Bottom save bar */}
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border py-4 mt-8 -mx-8 px-8 flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg" className="gap-2">
            <Save size={18} /> {saveMutation.isPending ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AdminWebsite;
