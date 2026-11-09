import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Save, Send, Eye, Code, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAnalyticsHeader from "@/components/admin/AdminAnalyticsHeader";

const SUPABASE_URL = "https://ptxenyhuztiaexwdcecl.supabase.co";
const FN_URL = `${SUPABASE_URL}/functions/v1/send-email`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token || ""}`,
  };
}

interface EmailTemplate {
  id: string;
  template_key: string;
  subject: string;
  html_body: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const SAMPLE_VARS: Record<string, Record<string, string>> = {
  new_order: {
    customer_name: "Rahim Uddin",
    customer_phone: "01712345678",
    product_title: "Signature Dark Chocolate Box",
    variant: " (500g)",
    total_amount: "৳1,250",
    invoice_link: "https://flaroma.bd/i/abc12345",
  },
  cart_abandonment: {
    customer_name: "Karim Ahmed",
    customer_phone: "01898765432",
    items_list: "Dark Chocolate Box × 2, White Chocolate × 1",
    total_value: "৳2,400",
  },
  new_review: {
    customer_name: "Fatima Rahman",
    rating_stars: "⭐⭐⭐⭐⭐",
    comment: "Absolutely loved the dark chocolate collection! The flavors are rich and authentic. Will definitely order again.",
  },
};

const AdminEmail = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editHtml, setEditHtml] = useState("");
  const [viewMode, setViewMode] = useState<"code" | "preview">("preview");

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const res = await fetch(`${FN_URL}?action=templates`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const selected = templates.find((t) => t.id === selectedId) || templates[0];

  const selectTemplate = (tpl: EmailTemplate) => {
    setSelectedId(tpl.id);
    setEditSubject(tpl.subject);
    setEditHtml(tpl.html_body);
  };

  // Auto-select first template
  if (templates.length > 0 && !selectedId) {
    const first = templates[0];
    setTimeout(() => selectTemplate(first), 0);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FN_URL}?action=update-template`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: selected?.id, subject: editSubject, html_body: editHtml }),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Template saved!" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      // Replace vars for test
      let html = editHtml;
      let subject = editSubject;
      const vars = selected ? SAMPLE_VARS[selected.template_key] || {} : {};
      for (const [key, val] of Object.entries(vars)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        html = html.replace(regex, val);
        subject = subject.replace(regex, val);
      }
      const res = await fetch(`${FN_URL}?action=test`, {
        method: "POST",
        headers,
        body: JSON.stringify({ subject, html }),
      });
      if (!res.ok) throw new Error("Test send failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Test email sent to ${data.sent_to}` });
    },
    onError: () => toast({ title: "Test send failed", variant: "destructive" }),
  });

  const getPreviewHtml = () => {
    if (!selected) return "";
    let html = editHtml;
    const vars = SAMPLE_VARS[selected.template_key] || {};
    for (const [key, val] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      html = html.replace(regex, val);
    }
    return html;
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar activePage="email" />
      <main className="ml-64 p-8">
        <AdminAnalyticsHeader />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Mail size={24} /> Email Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Edit notification emails sent to all approved admins via Resend
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Template selector */}
            <div className="w-56 space-y-2 shrink-0">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => selectTemplate(tpl)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selected?.id === tpl.id
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium text-sm">
                    {tpl.template_key === "new_order" ? "🛒 New Order" : tpl.template_key === "new_review" ? "⭐ New Review" : "🛒 Cart Alert"}
                  </p>
                  <p className="text-xs mt-0.5 opacity-70">{tpl.description}</p>
                </button>
              ))}
            </div>

            {/* Editor area */}
            {selected && (
              <div className="flex-1 space-y-4">
                {/* Subject */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject</label>
                  <Input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Mode toggle + actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode("preview")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      <Eye size={14} /> Preview
                    </button>
                    <button
                      onClick={() => setViewMode("code")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        viewMode === "code" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      <Code size={14} /> HTML
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testMutation.mutate()}
                      disabled={testMutation.isPending}
                    >
                      {testMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
                      Send Test
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
                      Save
                    </Button>
                  </div>
                </div>

                {/* Content */}
                {viewMode === "code" ? (
                  <Textarea
                    value={editHtml}
                    onChange={(e) => setEditHtml(e.target.value)}
                    className="font-mono text-xs min-h-[500px]"
                    spellCheck={false}
                  />
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden bg-white">
                    <iframe
                      srcDoc={getPreviewHtml()}
                      className="w-full border-0"
                      style={{ height: "550px" }}
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}

                {/* Variable reference */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Available Variables</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(SAMPLE_VARS[selected.template_key] || {}).map((v) => (
                      <Badge key={v} variant="secondary" className="text-xs font-mono">
                        {"{{" + v + "}}"}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminEmail;
