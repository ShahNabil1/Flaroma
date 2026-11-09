import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Package, Upload, X, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import AdminSidebar from "@/components/admin/AdminSidebar";
import DesktopOnlyOverlay from "@/components/admin/DesktopOnlyOverlay";
import AdminMobileDashboard from "@/pages/AdminMobileDashboard";
import AdminAnalyticsHeader from "@/components/admin/AdminAnalyticsHeader";
import { useIsMobile } from "@/hooks/use-mobile";

interface Variant {
  variant_type: string;
  variant_value: string;
  price_modifier: number;
}

interface GroupedAttribute {
  type: string;
  options: { value: string; price: number }[];
}

interface Product {
  id: string;
  title: string;
  title_bn: string | null;
  description: string | null;
  base_price: number;
  image_url: string | null;
  tag: string | null;
  status: string;
  sort_order: number;
  slug: string;
  delivery_policy: string | null;
  storage_instructions: string | null;
  show_trust_badges: boolean;
  product_variants: Variant[];
}

const CLOUD_NAME = "dvfb58wu4";
const UPLOAD_PRESET = "flaroma_upload";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const emptyForm = {
  title: "",
  title_bn: "",
  description: "",
  base_price: 0,
  image_url: "",
  tag: "",
  status: "in_stock",
  sort_order: 0,
  slug: "",
  delivery_policy: "",
  storage_instructions: "",
  show_trust_badges: true,
  variants: [] as Variant[],
};

const AdminDashboard = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [newAttributeType, setNewAttributeType] = useState("");
  const [showAttributeInput, setShowAttributeInput] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin");
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: adminApi.getProducts,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editingId
        ? adminApi.updateProduct({ id: editingId, ...data })
        : adminApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: editingId ? "Product updated" : "Product created" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Product deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setActiveTab("general");
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      title_bn: p.title_bn || "",
      description: p.description || "",
      base_price: p.base_price,
      image_url: p.image_url || "",
      tag: p.tag || "",
      status: p.status,
      sort_order: p.sort_order,
      slug: p.slug || "",
      delivery_policy: p.delivery_policy || "",
      storage_instructions: p.storage_instructions || "",
      show_trust_badges: p.show_trust_badges ?? true,
      variants: (p.product_variants || []).map((v) => ({
        variant_type: v.variant_type,
        variant_value: v.variant_value,
        price_modifier: v.price_modifier,
      })),
    });
    setActiveTab("general");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.secure_url) {
        setForm((f) => ({ ...f, image_url: data.secure_url }));
        toast({ title: "Image uploaded!" });
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const addVariant = () => {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { variant_type: "", variant_value: "", price_modifier: 0 }],
    }));
  };

  const updateVariant = (i: number, key: keyof Variant, value: string | number) => {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], [key]: value };
      return { ...f, variants };
    });
  };

  const removeVariant = (i: number) => {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  };

  // Group variants by type for the new UI
  const groupedAttributes: GroupedAttribute[] = (() => {
    const map = new Map<string, { value: string; price: number }[]>();
    form.variants.forEach((v) => {
      if (!v.variant_type) return;
      if (!map.has(v.variant_type)) map.set(v.variant_type, []);
      map.get(v.variant_type)!.push({ value: v.variant_value, price: v.price_modifier });
    });
    return Array.from(map.entries()).map(([type, options]) => ({ type, options }));
  })();

  const addAttributeType = () => {
    const typeName = newAttributeType.trim();
    if (!typeName) return;
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { variant_type: typeName, variant_value: "", price_modifier: 0 }],
    }));
    setNewAttributeType("");
    setShowAttributeInput(false);
  };

  const addOptionToType = (type: string) => {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { variant_type: type, variant_value: "", price_modifier: 0 }],
    }));
  };

  const removeAttributeType = (type: string) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((v) => v.variant_type !== type),
    }));
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const slug = form.slug.trim() || generateSlug(form.title);
    if (!slug) {
      toast({ title: "Slug is required", variant: "destructive" });
      return;
    }
    const { variants, ...rest } = form;
    saveMutation.mutate({
      ...rest,
      slug,
      base_price: Number(rest.base_price),
      sort_order: Number(rest.sort_order),
      tag: rest.tag || null,
      image_url: rest.image_url || null,
      title_bn: rest.title_bn || null,
      description: rest.description || null,
      delivery_policy: rest.delivery_policy || null,
      storage_instructions: rest.storage_instructions || null,
      show_trust_badges: rest.show_trust_badges,
      variants: variants.filter((v) => v.variant_type && v.variant_value),
    });
  };

  if (isMobile) return <AdminMobileDashboard />;

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar activePage="products" />

      {/* Main Content */}
      <main className="ml-64 p-8">
        <AdminAnalyticsHeader />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Products</h2>
            <p className="text-sm text-muted-foreground">{products.length} products</p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-2" /> Add Product
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Image</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Price</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Tag</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.title} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package size={18} className="text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-foreground">{p.title}</p>
                      {p.title_bn && <p className="text-xs text-muted-foreground">{p.title_bn}</p>}
                    </td>
                    <td className="p-4 text-foreground">৳{p.base_price}</td>
                    <td className="p-4">
                      {p.tag && (
                        <span className="px-2 py-1 text-xs rounded-full bg-accent/20 text-accent-foreground">{p.tag}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${p.status === "in_stock" ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"}`}>
                        {p.status === "in_stock" ? "In Stock" : "Out of Stock"}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteProductId(p.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Delete Product Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteProductId}
        onClose={() => setDeleteProductId(null)}
        onConfirm={() => {
          if (deleteProductId) {
            deleteMutation.mutate(deleteProductId);
            setDeleteProductId(null);
          }
        }}
        title="Delete this product?"
        description="This product will be permanently removed from your store. This action cannot be undone."
        confirmLabel="Delete Product"
        loading={deleteMutation.isPending}
      />

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingId ? "Edit Product" : "New Product"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
              <TabsTrigger value="preview"><Eye size={14} className="mr-1.5" /> Live Preview</TabsTrigger>
            </TabsList>

            {/* ===== GENERAL TAB ===== */}
            <TabsContent value="general" className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({
                      ...f,
                      title,
                      // Auto-generate slug only if slug hasn't been manually edited or is empty
                      slug: !f.slug || f.slug === generateSlug(f.title) ? generateSlug(title) : f.slug,
                    }));
                  }} />
                </div>
                <div className="space-y-2">
                  <Label>Title (Bangla)</Label>
                  <Input value={form.title_bn} onChange={(e) => setForm((f) => ({ ...f, title_bn: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">/product/</span>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    placeholder="auto-generated-from-title"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Auto-generated from title. Edit to customize.</p>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Base Price (৳)</Label>
                  <Input type="number" value={form.base_price} onChange={(e) => setForm((f) => ({ ...f, base_price: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tag</Label>
                  <Input value={form.tag} placeholder="e.g. Best Seller" onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="flex items-center gap-4">
                  {form.image_url && (
                    <img src={form.image_url} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-border" />
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                    <Upload size={16} />
                    {uploading ? "Uploading..." : "Upload to Cloudinary"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.status === "in_stock"}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, status: checked ? "in_stock" : "out_of_stock" }))}
                  />
                  <Label>{form.status === "in_stock" ? "In Stock" : "Out of Stock"}</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.show_trust_badges}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, show_trust_badges: checked }))}
                  />
                  <Label>Show Trust Badges</Label>
                </div>
              </div>

              {/* Product Options & Attributes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Product Options & Attributes</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Add multiple attribute types with individual pricing for each option.</p>
                  </div>
                  {!showAttributeInput ? (
                    <Button variant="outline" size="sm" onClick={() => setShowAttributeInput(true)}>
                      <Plus size={14} className="mr-1" /> Add Attribute Type
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="e.g. Size, Filling"
                        value={newAttributeType}
                        onChange={(e) => setNewAttributeType(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addAttributeType();
                          if (e.key === "Escape") { setShowAttributeInput(false); setNewAttributeType(""); }
                        }}
                        className="h-8 w-44 text-sm"
                        autoFocus
                      />
                      <Button size="sm" className="h-8" onClick={addAttributeType} disabled={!newAttributeType.trim()}>
                        Add
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => { setShowAttributeInput(false); setNewAttributeType(""); }}>
                        <X size={14} />
                      </Button>
                    </div>
                  )}
                </div>

                {groupedAttributes.length === 0 && (
                  <div className="text-center py-8 bg-muted/20 rounded-xl border border-dashed border-border">
                    <p className="text-sm text-muted-foreground">No attributes yet. Add types like "Size", "Filling", or "Chocolate Type".</p>
                  </div>
                )}

                {groupedAttributes.map((group) => {
                  const typeVariants = form.variants
                    .map((v, i) => ({ ...v, originalIndex: i }))
                    .filter((v) => v.variant_type === group.type);

                  return (
                    <div key={group.type} className="rounded-xl border border-border bg-muted/10 overflow-hidden">
                      {/* Type Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{group.type}</span>
                          <span className="text-xs text-muted-foreground">({group.options.length} options)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => addOptionToType(group.type)}>
                            <Plus size={12} /> Add Option
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removeAttributeType(group.type)}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="p-3 space-y-2">
                        {typeVariants.map((v) => (
                          <div key={v.originalIndex} className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border">
                            <Input
                              placeholder="Option (e.g. Large, Pistachio)"
                              value={v.variant_value}
                              onChange={(e) => updateVariant(v.originalIndex, "variant_value", e.target.value)}
                              className="flex-1 h-8 text-sm"
                            />
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">+৳</span>
                              <Input
                                type="number"
                                placeholder="0"
                                value={v.price_modifier}
                                onChange={(e) => updateVariant(v.originalIndex, "price_modifier", Number(e.target.value))}
                                className="w-20 h-8 text-sm"
                              />
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeVariant(v.originalIndex)}>
                              <X size={12} />
                            </Button>
                          </div>
                        ))}
                        {typeVariants.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">No options yet. Click "Add Option" above.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ===== POLICIES TAB ===== */}
            <TabsContent value="policies" className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Delivery Policy</Label>
                <p className="text-xs text-muted-foreground">Use line breaks to format paragraphs. This will appear in the "Delivery Policy" tab on the product page.</p>
                <Textarea
                  value={form.delivery_policy}
                  onChange={(e) => setForm((f) => ({ ...f, delivery_policy: e.target.value }))}
                  rows={8}
                  placeholder={"🚚 ঢাকার ভেতরে: অর্ডারের ২৪-৪৮ ঘণ্টার মধ্যে ডেলিভারি।\n📦 ঢাকার বাইরে: কুরিয়ারের মাধ্যমে ২-৩ কার্যদিবসের মধ্যে।"}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-base font-semibold">Storage Instructions</Label>
                <p className="text-xs text-muted-foreground">Use line breaks to format paragraphs. This will appear in the "Storage Instructions" tab on the product page.</p>
                <Textarea
                  value={form.storage_instructions}
                  onChange={(e) => setForm((f) => ({ ...f, storage_instructions: e.target.value }))}
                  rows={8}
                  placeholder={"❄️ রেফ্রিজারেটরে সংরক্ষণ করুন: ৪-৮°C তাপমাত্রায়।\n📅 ফ্রিজে রাখলে ৫-৭ দিনের মধ্যে সেবন করুন।"}
                />
              </div>
            </TabsContent>

            {/* ===== LIVE PREVIEW TAB ===== */}
            <TabsContent value="preview" className="pt-2">
              <div className="rounded-xl border border-border bg-background overflow-hidden">
                {/* Hero section mimicking actual product page */}
                <div className="grid grid-cols-2 gap-0">
                  {/* Image */}
                  <div className="aspect-square bg-card border-r border-border overflow-hidden">
                    {form.image_url ? (
                      <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Package size={40} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Product info - matching actual frontend layout */}
                  <div className="p-5 flex flex-col">
                    {form.title_bn && <p className="text-xs text-muted-foreground mb-0.5 font-bengali">{form.title_bn}</p>}
                    <h3 className="text-lg font-serif font-bold text-foreground mb-2">{form.title || "Product Title"}</h3>
                    <p className="text-xl font-serif font-bold text-foreground mb-4">৳{form.base_price}</p>

                    {/* Variant buttons preview - grouped by type */}
                    {groupedAttributes.length > 0 && (
                      <div className="mb-4 space-y-3">
                        {groupedAttributes.map((group) => (
                          <div key={group.type}>
                            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide mb-2">{group.type}</p>
                            <div className="flex flex-wrap gap-2">
                              {group.options.filter(o => o.value).map((o, i) => (
                                <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 ${i === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>
                                  {o.value}
                                  {o.price !== 0 && <span className="ml-1 opacity-75">{o.price > 0 ? "+" : ""}৳{o.price}</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Buy Now preview */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center border border-border rounded-lg text-xs">
                        <span className="px-2 py-1.5">−</span>
                        <span className="px-3 py-1.5 font-semibold border-x border-border">1</span>
                        <span className="px-2 py-1.5">+</span>
                      </div>
                      <div className="flex-1 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-lg text-center">
                        Buy Now — ৳{form.base_price}
                      </div>
                    </div>

                    {/* WhatsApp preview */}
                    <div className="text-white text-xs font-semibold py-2 rounded-lg text-center mb-3" style={{ backgroundColor: "#25D366" }}>
                      Order On WhatsApp
                    </div>

                    {/* Trust badges preview */}
                    {form.show_trust_badges && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: "Free Delivery", sub: "Inside Dhaka" },
                          { label: "Made Fresh", sub: "Upon Order" },
                          { label: "Cool Packed", sub: "Guaranteed" },
                        ].map(({ label, sub }) => (
                          <div key={label} className="flex flex-col items-center p-1.5 rounded-lg bg-card border border-border text-center">
                            <span className="text-[9px] font-semibold text-foreground">{label}</span>
                            <span className="text-[8px] text-muted-foreground">{sub}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabs section - mimicking actual product page tabs */}
                <div className="border-t border-border">
                  <div className="flex border-b border-border">
                    {["Description", "Delivery Policy", "Storage Instructions"].map((tab, i) => (
                      <div key={tab} className={`px-4 py-2.5 text-xs font-medium ${i === 0 ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"}`}>
                        {tab}
                      </div>
                    ))}
                  </div>
                  <div className="p-5 space-y-5">
                    {form.description && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{form.description}</p>
                      </div>
                    )}
                    {form.delivery_policy && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Delivery Policy</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{form.delivery_policy}</p>
                      </div>
                    )}
                    {form.storage_instructions && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Storage Instructions</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{form.storage_instructions}</p>
                      </div>
                    )}
                    {!form.description && !form.delivery_policy && !form.storage_instructions && (
                      <p className="text-sm text-muted-foreground italic">No content yet. Add a description in General tab, or policies in the Policies tab.</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
