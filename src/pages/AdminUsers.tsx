import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Check, X, Settings, Trash2, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import AdminAnalyticsHeader from "@/components/admin/AdminAnalyticsHeader";
import PinPrompt from "@/components/admin/PinPrompt";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import { PAGE_KEYS } from "@/hooks/use-admin-permissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const SUPABASE_URL = "https://ptxenyhuztiaexwdcecl.supabase.co";
const USERS_URL = `${SUPABASE_URL}/functions/v1/admin-users`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
  };
}

interface UserRequest {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  permissions: { page_key: string; allowed: boolean }[];
}

const AdminUsers = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pinAction, setPinAction] = useState<null | { type: string; data: any }>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [permDialog, setPermDialog] = useState<AdminUser | null>(null);
  const [permState, setPermState] = useState<Record<string, boolean>>({});
  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changePinLoading, setChangePinLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/admin");
    };
    check();
  }, [navigate]);

  const { data: requests = [], isLoading: reqLoading } = useQuery<UserRequest[]>({
    queryKey: ["admin-user-requests"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${USERS_URL}?action=pending-requests`, { headers });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: admins = [], isLoading: adminsLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-approved-users"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${USERS_URL}?action=approved-admins`, { headers });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const handlePinConfirm = async (pin: string) => {
    if (!pinAction) return;
    setPinLoading(true);

    try {
      const headers = await getAuthHeaders();
      let body: any = { pin };

      if (pinAction.type === "approve") {
        body.request_id = pinAction.data.id;
        const res = await fetch(`${USERS_URL}?action=approve-request`, {
          method: "POST", headers, body: JSON.stringify(body),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed");
        toast({ title: "Request approved" });
      } else if (pinAction.type === "permissions") {
        body.target_user_id = pinAction.data.user_id;
        body.permissions = pinAction.data.permissions;
        const res = await fetch(`${USERS_URL}?action=update-permissions`, {
          method: "POST", headers, body: JSON.stringify(body),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed");
        toast({ title: "Permissions updated" });
        setPermDialog(null);
      } else if (pinAction.type === "remove") {
        body.target_user_id = pinAction.data.user_id;
        const res = await fetch(`${USERS_URL}?action=remove-admin`, {
          method: "POST", headers, body: JSON.stringify(body),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed");
        toast({ title: "Admin removed" });
        setRemoveTarget(null);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-user-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-approved-users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPinLoading(false);
      setPinAction(null);
    }
  };

  const rejectRequest = async (id: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${USERS_URL}?action=reject-request`, {
      method: "POST", headers, body: JSON.stringify({ request_id: id }),
    });
    if (res.ok) {
      toast({ title: "Request rejected" });
      queryClient.invalidateQueries({ queryKey: ["admin-user-requests"] });
    }
  };

  const openPermissions = (admin: AdminUser) => {
    const state: Record<string, boolean> = {};
    Object.keys(PAGE_KEYS).forEach((k) => { state[k] = false; });
    admin.permissions.forEach((p) => { state[p.page_key] = p.allowed; });
    setPermState(state);
    setPermDialog(admin);
  };

  const handleChangePin = async () => {
    if (newPin.length < 4) {
      toast({ title: "PIN must be at least 4 digits", variant: "destructive" });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: "PINs do not match", variant: "destructive" });
      return;
    }
    setChangePinLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${USERS_URL}?action=change-pin`, {
        method: "POST", headers,
        body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      toast({ title: "PIN changed successfully" });
      setChangePinOpen(false);
      setCurrentPin(""); setNewPin(""); setConfirmPin("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setChangePinLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <AdminSidebar activePage="users" />
      </div>

      <main className={cn("p-4 md:p-8 pb-20 md:pb-8", !isMobile && "ml-64")}>
        <AdminAnalyticsHeader />
        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage admin access and permissions</p>
        </div>

        {/* Pending Requests */}
        <div className="mb-10">
          <h3 className="text-lg font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield size={18} className="text-amber-600" /> Pending Requests
          </h3>
          {reqLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No pending requests</p>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Requested</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {(r.display_name || r.email)?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-foreground">{r.display_name || r.email}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{r.email}</td>
                      <td className="p-4 text-muted-foreground font-num text-xs">
                        {new Date(r.created_at).toLocaleDateString("en-BD", { dateStyle: "medium" })}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button size="sm" className="gap-1" onClick={() => setPinAction({ type: "approve", data: r })}>
                          <Check size={14} /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => rejectRequest(r.id)}>
                          <X size={14} /> Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Approved Admins */}
        <div>
          <h3 className="text-lg font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield size={18} className="text-green-600" /> Approved Admins
          </h3>
          {adminsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No admins configured</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-medium text-muted-foreground">Admin</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Permissions</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a) => {
                      const activePerms = a.permissions.filter((p) => p.allowed).map((p) => PAGE_KEYS[p.page_key]).filter(Boolean);
                      return (
                        <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {a.avatar_url ? (
                                <img src={a.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                  {(a.display_name || a.email)?.[0]?.toUpperCase()}
                                </div>
                              )}
                              <span className="font-medium text-foreground">{a.display_name || a.email}</span>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">{a.email}</td>
                          <td className="p-4">
                            <Badge className={`text-xs border ${
                              a.role === "owner"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            }`}>
                              {a.role === "owner" ? "Owner" : "Admin"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {a.role === "owner" ? (
                              <span className="text-xs text-muted-foreground">All Access</span>
                            ) : activePerms.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {activePerms.map((p) => (
                                  <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No permissions</span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-1">
                            {a.role !== "owner" && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openPermissions(a)} title="Set Permissions">
                                  <Settings size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setRemoveTarget(a)}
                                  title="Remove Admin"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card layout */}
              <div className="md:hidden space-y-3">
                {admins.map((a) => {
                  const activePerms = a.permissions.filter((p) => p.allowed).map((p) => PAGE_KEYS[p.page_key]).filter(Boolean);
                  return (
                    <div key={a.id} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        {a.avatar_url ? (
                          <img src={a.avatar_url} alt="" className="w-10 h-10 rounded-full shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                            {(a.display_name || a.email)?.[0]?.toUpperCase()}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-serif font-semibold text-sm text-foreground truncate">
                              {a.display_name || a.email.split("@")[0]}
                            </p>
                            <Badge className={`text-[10px] border shrink-0 ${
                              a.role === "owner"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            }`}>
                              {a.role === "owner" ? "Owner" : "Admin"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{a.email}</p>
                        </div>
                      </div>

                      {/* Permissions */}
                      <div className="mt-3">
                        {a.role === "owner" ? (
                          <span className="text-[11px] text-muted-foreground">All Access</span>
                        ) : activePerms.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {activePerms.map((p) => (
                              <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No permissions</span>
                        )}
                      </div>

                      {/* Actions */}
                      {a.role !== "owner" && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 gap-1 flex-1"
                            onClick={() => openPermissions(a)}
                          >
                            <Settings size={14} /> Permissions
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 gap-1 text-destructive border-destructive/30"
                            onClick={() => setRemoveTarget(a)}
                          >
                            <Trash2 size={14} /> Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Change PIN */}
        <div className="mt-10">
          <h3 className="text-lg font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
            <KeyRound size={18} className="text-primary" /> Security PIN
          </h3>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-sm text-muted-foreground mb-4">
              The security PIN is required for sensitive actions like approving admins, changing permissions, or removing users.
            </p>
            <Button variant="outline" onClick={() => setChangePinOpen(true)}>
              <KeyRound size={14} className="mr-2" /> Change PIN
            </Button>
          </div>
        </div>
      </main>

      {/* PIN Prompt */}
      <PinPrompt
        open={!!pinAction}
        onClose={() => setPinAction(null)}
        onConfirm={handlePinConfirm}
        loading={pinLoading}
        title={
          pinAction?.type === "approve" ? "Approve Admin Request"
          : pinAction?.type === "permissions" ? "Update Permissions"
          : pinAction?.type === "remove" ? "Remove Admin"
          : "Enter PIN"
        }
        description="Enter the security PIN to confirm this action."
      />

      {/* Change PIN Dialog */}
      <Dialog open={changePinOpen} onOpenChange={(o) => { if (!o) { setChangePinOpen(false); setCurrentPin(""); setNewPin(""); setConfirmPin(""); } }}>
        <DialogContent className="max-w-[340px] p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
          {/* Gradient header */}
          <div className="relative bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(25,60%,25%)] to-[hsl(30,40%,15%)] px-6 pt-8 pb-6 text-center">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,200,100,0.2) 0%, transparent 50%)"
            }} />
            <div className="relative">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-4 shadow-lg">
                <KeyRound size={28} className="text-amber-200" />
              </div>
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg font-serif text-white tracking-wide">Change Security PIN</DialogTitle>
              </DialogHeader>
              <p className="text-amber-100/70 text-xs mt-1">Update your security PIN for admin actions</p>
            </div>
          </div>

          {/* Form area */}
          <div className="bg-card px-6 py-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Current PIN</label>
              <Input
                type="password" inputMode="numeric" placeholder="••••"
                value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                maxLength={8}
                className="text-center text-lg tracking-[0.5em] font-num h-12 rounded-xl border-2 focus:border-primary focus:shadow-[0_0_16px_hsl(var(--primary)/0.2)] transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">New PIN</label>
              <Input
                type="password" inputMode="numeric" placeholder="••••"
                value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                maxLength={8}
                className="text-center text-lg tracking-[0.5em] font-num h-12 rounded-xl border-2 focus:border-primary focus:shadow-[0_0_16px_hsl(var(--primary)/0.2)] transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Confirm New PIN</label>
              <Input
                type="password" inputMode="numeric" placeholder="••••"
                value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                maxLength={8}
                className="text-center text-lg tracking-[0.5em] font-num h-12 rounded-xl border-2 focus:border-primary focus:shadow-[0_0_16px_hsl(var(--primary)/0.2)] transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl text-sm"
                onClick={() => { setChangePinOpen(false); setCurrentPin(""); setNewPin(""); setConfirmPin(""); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl text-sm bg-gradient-to-r from-primary to-[hsl(25,60%,30%)] hover:opacity-90 transition-opacity"
                onClick={handleChangePin}
                disabled={changePinLoading || currentPin.length < 4 || newPin.length < 4}
              >
                {changePinLoading ? "Saving..." : "Update PIN"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={!!permDialog} onOpenChange={(o) => { if (!o) setPermDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Set Permissions</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            {permDialog?.display_name || permDialog?.email}
          </p>
          <div className="space-y-3">
            {Object.entries(PAGE_KEYS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={permState[key] || false}
                  onCheckedChange={(checked) => setPermState((s) => ({ ...s, [key]: !!checked }))}
                />
                <span className="text-sm text-foreground">{label}</span>
              </label>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPermDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              if (permDialog) {
                setPinAction({
                  type: "permissions",
                  data: { user_id: permDialog.user_id, permissions: permState },
                });
                setPermDialog(null);
              }
            }}>
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Admin Confirm */}
      <DeleteConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) {
            setPinAction({ type: "remove", data: { user_id: removeTarget.user_id } });
            setRemoveTarget(null);
          }
        }}
        title="Remove this admin?"
        description={`${removeTarget?.display_name || removeTarget?.email} will lose all admin access.`}
        confirmLabel="Remove Admin"
      />
      {isMobile && <AdminBottomNav />}
    </div>
  );
};

export default AdminUsers;
