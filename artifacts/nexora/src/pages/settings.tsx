import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import { DashboardLayout } from "@/pages/dashboard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  User, Shield, Bell as BellIcon, Palette, CreditCard, Lock, Keyboard,
  Eye, EyeOff, CheckCircle2, XCircle, Loader2, Info,
} from "lucide-react";
import type { UserProfile } from "@/context/AuthContext";

type Section = "profile" | "account" | "notifications" | "appearance" | "billing" | "privacy" | "shortcuts";

const navItems: { id: Section; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Shield },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "privacy", label: "Privacy", icon: Lock },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
];

const notifPrefs = [
  { key: "assignment_reminders", label: "Assignment Reminders", desc: "Get reminded before assignment deadlines", default: true },
  { key: "blueprint_activity", label: "Blueprint Activity", desc: "When someone forks your blueprint", default: true },
  { key: "project_milestones", label: "Project Milestones", desc: "Celebrate completing all project steps", default: true },
  { key: "nexora_updates", label: "Nexora Updates", desc: "New features and platform announcements", default: true },
  { key: "weekly_summary", label: "Weekly Summary", desc: "Weekly digest of your Nexora activity", default: false },
  { key: "ai_usage_alerts", label: "AI Usage Alerts", desc: "When you're close to your daily AI message limit", default: true },
];

const shortcuts = [
  { group: "Navigation", items: [
    { action: "Go to Dashboard", keys: ["Ctrl", "H"] },
    { action: "Go to Projects", keys: ["Ctrl", "P"] },
    { action: "Go to IDE", keys: ["Ctrl", "I"] },
    { action: "New Project", keys: ["Ctrl", "N"] },
    { action: "Go to Blueprints", keys: ["Ctrl", "B"] },
  ]},
  { group: "IDE (Workspace)", items: [
    { action: "Copy Code", keys: ["Ctrl", "Shift", "C"] },
    { action: "Toggle AI Panel", keys: ["Ctrl", "/"] },
    { action: "Save Code", keys: ["Ctrl", "S"] },
    { action: "Complete Step", keys: ["Ctrl", "Enter"] },
    { action: "Toggle Left Panel", keys: ["Ctrl", "["] },
    { action: "Toggle Library Tab", keys: ["Ctrl", "L"] },
  ]},
  { group: "Global", items: [
    { action: "Open AI Assistant", keys: ["Ctrl", "K"] },
    { action: "Search (coming soon)", keys: ["Ctrl", "Shift", "F"] },
    { action: "Settings", keys: ["Ctrl", ","] },
  ]},
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex-shrink-0 relative rounded-full transition-colors duration-200"
      style={{ width: 44, height: 24, background: checked ? "#6C63FF" : "#2A2A3E" }}
    >
      <span
        className="absolute top-0.5 left-0.5 rounded-full transition-transform duration-200"
        style={{
          width: 20, height: 20,
          background: checked ? "white" : "#5A5A7A",
          transform: `translateX(${checked ? 20 : 0}px)`,
        }}
      />
    </button>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
    /[A-Z]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["", "#FF5A5A", "#FFB84D", "#6C63FF", "#00C896"];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{ background: i <= score ? colors[score] : "#2A2A3E" }} />
        ))}
      </div>
      <span className="text-xs" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { profile, updateProfile } = useAuth() as { profile: UserProfile | null; updateProfile: (d: Partial<UserProfile>) => Promise<{ error: Error | null }> };
  const [section, setSection] = useState<Section>("profile");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold" style={{ color: "#F0F0FF" }}>Settings</h2>
          <p className="mt-1 text-sm" style={{ color: "#9090B0" }}>Manage your account and preferences</p>
          <div className="mt-4 h-px" style={{ background: "#2A2A3E" }} />
        </div>

        {/* Mobile: horizontal scrollable tabs */}
        <div className="lg:hidden overflow-x-auto flex gap-1 mb-6 pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = section === id;
            return (
              <button
                key={id}
                onClick={() => { if (id === "billing") { setLocation("/settings/billing"); } else { setSection(id); } }}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium transition-all rounded-full px-3 py-2"
                style={{
                  background: isActive ? "#6C63FF" : "#1A1A2E",
                  color: isActive ? "#fff" : "#9090B0",
                  border: isActive ? "1px solid #6C63FF" : "1px solid #2A2A3E",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-6">
          {/* Left nav — desktop only */}
          <nav className="hidden lg:flex w-48 flex-shrink-0 flex-col gap-0.5">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = section === id;
              return (
                <button
                  key={id}
                  onClick={() => { if (id === "billing") { setLocation("/settings/billing"); } else { setSection(id); } }}
                  className="flex items-center gap-2.5 text-sm text-left transition-all"
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    color: isActive ? "#F0F0FF" : "#9090B0",
                    background: isActive ? "rgba(108,99,255,0.12)" : "transparent",
                    borderLeft: isActive ? "3px solid #6C63FF" : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "#F0F0FF"; } }}
                  onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9090B0"; } }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Right content */}
          <div className="flex-1 min-w-0">
            {section === "profile" && <ProfileSection profile={profile} updateProfile={updateProfile} toast={toast} />}
            {section === "account" && <AccountSection toast={toast} />}
            {section === "notifications" && <NotificationsSection profile={profile} toast={toast} />}
            {section === "appearance" && <AppearanceSection toast={toast} />}
            {section === "privacy" && <PrivacySection profile={profile} updateProfile={updateProfile} toast={toast} />}
            {section === "shortcuts" && <ShortcutsSection />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ─────────────────────────────────────────── PROFILE ── */
function ProfileSection({ profile, updateProfile, toast }: { profile: UserProfile | null; updateProfile: (d: Partial<UserProfile>) => Promise<{ error: Error | null }>; toast: ReturnType<typeof useToast>["toast"] }) {
  const [form, setForm] = useState({
    full_name: "", username: "", bio: "", college_name: "", course: "", location: "", website: "",
  });
  const [saving, setSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: (profile.full_name as string) ?? "",
        username: (profile.username as string) ?? "",
        bio: (profile.bio as string) ?? "",
        college_name: (profile.college_name as string) ?? "",
        course: (profile.course as string) ?? "",
        location: (profile.location as string) ?? "",
        website: (profile.website as string) ?? "",
      });
    }
  }, [profile]);

  const set = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setChanged(true); };

  const checkUsername = useCallback((val: string) => {
    if (!val || val.length < 3) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await authFetch("/api/settings/validate-username", {
          method: "POST", body: JSON.stringify({ username: val }),
        });
        const data = await res.json() as { available: boolean };
        setUsernameStatus(data.available ? "available" : "taken");
      } catch { setUsernameStatus("idle"); }
    }, 500);
  }, []);

  const initials = form.full_name
    ? form.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : (profile?.email as string)?.[0]?.toUpperCase() ?? "U";

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/settings/profile", {
        method: "PUT", body: JSON.stringify(form),
      });
      if (!res.ok) {
        const e = await res.json() as { error: string };
        toast({ variant: "destructive", description: e.error || "Failed to save. Try again." });
      } else {
        await updateProfile(form);
        toast({ description: "Profile updated ✓" });
        setChanged(false);
      }
    } catch { toast({ variant: "destructive", description: "Failed to save. Try again." }); }
    finally { setSaving(false); }
  };

  const role = profile?.role as string;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" style={{ color: "#F0F0FF" }}>Profile</h3>
        <p className="text-sm mt-0.5" style={{ color: "#9090B0" }}>This is how others see you on Nexora</p>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-start gap-3">
        <div
          className="flex items-center justify-center font-bold text-white"
          style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #00D4FF)", fontSize: 28 }}
        >
          {initials}
        </div>
        <button
          onClick={() => toast({ description: "Avatar upload coming soon" })}
          className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
        >
          Change Avatar
        </button>
      </div>

      <div className="space-y-4">
        <Field label="Full Name *">
          <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="settings-input" placeholder="Your full name" />
        </Field>

        <Field label="Display Username">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#5A5A7A" }}>@</span>
            <input
              value={form.username}
              onChange={(e) => { set("username", e.target.value); checkUsername(e.target.value); }}
              className="settings-input pl-7"
              placeholder="username"
              style={{ paddingLeft: 28 }}
            />
          </div>
          {usernameStatus === "checking" && <p className="text-xs mt-1" style={{ color: "#9090B0" }}>Checking availability…</p>}
          {usernameStatus === "available" && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#00C896" }}><CheckCircle2 className="w-3 h-3" /> Available</p>}
          {usernameStatus === "taken" && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#FF5A5A" }}><XCircle className="w-3 h-3" /> Username taken</p>}
        </Field>

        <Field label="Bio">
          <div className="relative">
            <textarea
              value={form.bio}
              onChange={(e) => { if (e.target.value.length <= 160) set("bio", e.target.value); }}
              rows={3}
              placeholder="Tell the community about yourself and your IoT interests..."
              className="settings-input resize-none"
            />
            <span className="absolute bottom-2 right-3 text-xs" style={{ color: "#5A5A7A" }}>{form.bio.length}/160</span>
          </div>
        </Field>

        <Field label="Role">
          <div className="flex items-center gap-3">
            <span className="text-sm px-3 py-1 rounded-full border capitalize" style={{ borderColor: "#2A2A3E", color: "#9090B0" }}>
              {role || "Not set"}
            </span>
            <button onClick={() => setShowRoleModal(true)} className="text-sm" style={{ color: "#6C63FF" }}>
              Change role
            </button>
          </div>
        </Field>

        {(role === "student" || role === "professor") && (
          <Field label="College / Institution">
            <input value={form.college_name} onChange={(e) => set("college_name", e.target.value)} className="settings-input" placeholder="Your institution" />
          </Field>
        )}

        {role === "student" && (
          <Field label="Course / Subject">
            <input value={form.course} onChange={(e) => set("course", e.target.value)} className="settings-input" placeholder="Your course" />
          </Field>
        )}

        <Field label="Location (optional)">
          <input value={form.location} onChange={(e) => set("location", e.target.value)} className="settings-input" placeholder="City, India" />
        </Field>

        <Field label="Website / Portfolio (optional)">
          <input value={form.website} onChange={(e) => set("website", e.target.value)} className="settings-input" placeholder="https://..." type="url" />
        </Field>
      </div>

      <Button onClick={save} disabled={saving || !changed} className="bg-primary text-white hover:bg-primary/90">
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save Profile"}
      </Button>

      {showRoleModal && <RoleModal current={role} onClose={() => setShowRoleModal(false)} updateProfile={updateProfile} toast={toast} />}

      <SettingsStyles />
    </div>
  );
}

function RoleModal({ current, onClose, updateProfile, toast }: { current: string; onClose: () => void; updateProfile: (d: Partial<UserProfile>) => Promise<{ error: Error | null }>; toast: ReturnType<typeof useToast>["toast"] }) {
  const [role, setRole] = useState(current);
  const [saving, setSaving] = useState(false);
  const roles = ["student", "maker", "professor", "professional"];

  const save = async () => {
    setSaving(true);
    const { error } = await updateProfile({ role });
    if (error) toast({ variant: "destructive", description: "Failed to update role" });
    else { toast({ description: "Role updated ✓" }); onClose(); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="rounded-xl p-6 w-full max-w-sm" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        <h3 className="font-bold mb-2" style={{ color: "#F0F0FF" }}>Change Role</h3>
        <p className="text-sm mb-4" style={{ color: "#9090B0" }}>Changing your role will update your dashboard and recommendations.</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className="py-2 rounded-lg text-sm capitalize font-medium border transition-all"
              style={{
                borderColor: role === r ? "#6C63FF" : "#2A2A3E",
                background: role === r ? "rgba(108,99,255,0.12)" : "transparent",
                color: role === r ? "#F0F0FF" : "#9090B0",
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1 bg-primary text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Role"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── ACCOUNT ── */
function AccountSection({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const { user } = useAuth();
  const [currPwd, setCurrPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const changePassword = async () => {
    if (newPwd !== confirmPwd) { toast({ variant: "destructive", description: "Passwords don't match" }); return; }
    if (newPwd.length < 8) { toast({ variant: "destructive", description: "Password must be at least 8 characters" }); return; }
    setSavingPwd(true);
    try {
      const res = await authFetch("/api/settings/change-password", { method: "POST", body: JSON.stringify({ newPassword: newPwd }) });
      if (res.ok) { toast({ description: "Password updated ✓" }); setCurrPwd(""); setNewPwd(""); setConfirmPwd(""); }
      else { const e = await res.json() as { error: string }; toast({ variant: "destructive", description: e.error }); }
    } catch { toast({ variant: "destructive", description: "Failed to update password" }); }
    finally { setSavingPwd(false); }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      await authFetch("/api/auth/delete-account", { method: "DELETE" });
      window.location.href = "/?deleted=1";
    } catch { toast({ variant: "destructive", description: "Failed to delete account. Please contact support." }); setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" style={{ color: "#F0F0FF" }}>Account</h3>
      </div>

      <Card>
        <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "#5A5A7A" }}>Email Address</p>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4" style={{ color: "#5A5A7A" }} />
          <span className="text-sm" style={{ color: "#F0F0FF" }}>{user?.email}</span>
        </div>
        <p className="text-xs mt-2" style={{ color: "#5A5A7A" }}>Contact support to change email</p>
      </Card>

      <Card>
        <p className="text-sm font-semibold mb-4" style={{ color: "#F0F0FF" }}>Change Password</p>
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={currPwd}
              onChange={(e) => setCurrPwd(e.target.value)}
              className="settings-input pr-10"
              placeholder="Current password"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPwd((s) => !s)} style={{ color: "#5A5A7A" }}>
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div>
            <input type={showPwd ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="settings-input" placeholder="New password" />
            <PasswordStrength password={newPwd} />
          </div>
          <input type={showPwd ? "text" : "password"} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="settings-input" placeholder="Confirm new password" />
        </div>
        <Button onClick={changePassword} disabled={savingPwd || !newPwd} className="mt-4 bg-primary text-white hover:bg-primary/90">
          {savingPwd ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</> : "Update Password"}
        </Button>
      </Card>

      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "rgba(255,90,90,0.04)", border: "1px solid rgba(255,90,90,0.2)" }}
      >
        <p className="font-semibold" style={{ color: "#FF5A5A" }}>Danger Zone</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>Delete Account</p>
            <p className="text-xs mt-1" style={{ color: "#9090B0" }}>Permanently delete your account and all data. This cannot be undone.</p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: "#FF5A5A", color: "#FF5A5A", background: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FF5A5A"; (e.currentTarget as HTMLElement).style.color = "white"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#FF5A5A"; }}
          >
            Delete Account
          </button>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>Download Your Data</p>
            <p className="text-xs mt-0.5" style={{ color: "#9090B0" }}>Get a copy of all your Nexora data</p>
          </div>
          <Button variant="outline" onClick={() => toast({ description: "Export requested. We'll email you when it's ready." })}>
            Request Export
          </Button>
        </div>
      </Card>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-xl p-6 w-full max-w-md" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
            <h3 className="font-bold text-lg mb-4" style={{ color: "#F0F0FF" }}>Delete Your Account</h3>
            <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(255,90,90,0.08)" }}>
              <p className="text-sm font-medium mb-2" style={{ color: "#FF5A5A" }}>This will permanently delete:</p>
              {["All your projects", "Your component inventory", "Your conversation history", "Your subscription data"].map((item) => (
                <p key={item} className="text-sm" style={{ color: "#9090B0" }}>• {item}</p>
              ))}
            </div>
            <p className="text-sm mb-2" style={{ color: "#9090B0" }}>Type <strong style={{ color: "#F0F0FF" }}>DELETE</strong> to confirm:</p>
            <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="settings-input mb-4" placeholder="DELETE" />
            <div className="flex gap-2">
              <Button onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }} className="flex-1 bg-primary text-white">Cancel</Button>
              <button
                onClick={deleteAccount}
                disabled={deleteConfirm !== "DELETE" || deleting}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-opacity"
                style={{
                  background: deleteConfirm === "DELETE" ? "#FF5A5A" : "#2A2A3E",
                  color: deleteConfirm === "DELETE" ? "white" : "#5A5A7A",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Deleting…" : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsStyles />
    </div>
  );
}

/* ──────────────────────────────────── NOTIFICATIONS ── */
function NotificationsSection({ profile, toast }: { profile: UserProfile | null; toast: ReturnType<typeof useToast>["toast"] }) {
  const stored = (profile?.notification_preferences as Record<string, boolean>) ?? {};
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(notifPrefs.map((p) => [p.key, stored[p.key] ?? p.default]))
  );

  useEffect(() => {
    if (profile?.notification_preferences) {
      const s = profile.notification_preferences as Record<string, boolean>;
      setPrefs(Object.fromEntries(notifPrefs.map((p) => [p.key, s[p.key] ?? p.default])));
    }
  }, [profile]);

  const toggle = async (key: string, val: boolean) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    try {
      await authFetch("/api/settings/notifications", { method: "PUT", body: JSON.stringify({ preferences: updated }) });
      toast({ description: "Preferences saved" });
    } catch { toast({ variant: "destructive", description: "Failed to save preferences" }); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" style={{ color: "#F0F0FF" }}>Notifications</h3>
        <p className="text-sm mt-0.5" style={{ color: "#9090B0" }}>Choose what you want to be notified about</p>
      </div>
      <Card>
        <div className="divide-y" style={{ borderColor: "#1A1A2E" }}>
          {notifPrefs.map((p) => (
            <div key={p.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>{p.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9090B0" }}>{p.desc}</p>
              </div>
              <Toggle checked={prefs[p.key] ?? p.default} onChange={(v) => toggle(p.key, v)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────── APPEARANCE ── */
function AppearanceSection({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem("nexora_ide_font_size");
    return saved ? Number(saved) : 14;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("nexora_sidebar_collapsed") === "true");
  const [showBlueprints, setShowBlueprints] = useState(() => localStorage.getItem("nexora_show_blueprints") !== "false");
  const [showQuickIDE, setShowQuickIDE] = useState(() => localStorage.getItem("nexora_show_quick_ide") !== "false");

  const saveFont = (v: number) => { setFontSize(v); localStorage.setItem("nexora_ide_font_size", String(v)); };
  const saveToggle = (key: string, setter: (v: boolean) => void) => (v: boolean) => { setter(v); localStorage.setItem(key, String(v)); };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" style={{ color: "#F0F0FF" }}>Appearance</h3>
      </div>

      <Card>
        <p className="text-sm font-semibold mb-4" style={{ color: "#F0F0FF" }}>Theme</p>
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-24 h-16 rounded-lg border-2 flex flex-col justify-end p-1.5 relative overflow-hidden"
              style={{ background: "#0A0A0F", borderColor: "#6C63FF" }}
            >
              <div className="h-2 rounded" style={{ background: "#12121A" }} />
              <span
                className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: "#6C63FF", color: "white" }}
              >
                Active
              </span>
            </div>
            <span className="text-xs" style={{ color: "#F0F0FF" }}>Dark</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-40">
            <div
              className="w-24 h-16 rounded-lg border flex flex-col justify-end p-1.5 relative overflow-hidden"
              style={{ background: "#F8F8F8", borderColor: "#2A2A3E" }}
            >
              <div className="h-2 rounded" style={{ background: "#E8E8E8" }} />
              <span
                className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: "#9090B0", color: "white" }}
              >
                Soon
              </span>
            </div>
            <span className="text-xs" style={{ color: "#9090B0" }}>Light</span>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold mb-1" style={{ color: "#F0F0FF" }}>IDE Font Size</p>
        <p className="text-xs mb-4" style={{ color: "#9090B0" }}>Adjusts the code editor font size</p>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: "#5A5A7A" }}>12px</span>
          <input
            type="range" min={12} max={18} value={fontSize}
            onChange={(e) => saveFont(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-xs" style={{ color: "#5A5A7A" }}>18px</span>
        </div>
        <p className="mt-3 font-mono" style={{ fontSize, color: "#9090B0" }}>The quick brown fox</p>
      </Card>

      <Card>
        <p className="text-sm font-semibold mb-4" style={{ color: "#F0F0FF" }}>Dashboard Layout</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#F0F0FF" }}>Show blueprint suggestions on dashboard</p>
            </div>
            <Toggle checked={showBlueprints} onChange={saveToggle("nexora_show_blueprints", setShowBlueprints)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#F0F0FF" }}>Show Quick IDE section on dashboard</p>
            </div>
            <Toggle checked={showQuickIDE} onChange={saveToggle("nexora_show_quick_ide", setShowQuickIDE)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#F0F0FF" }}>Collapse sidebar by default</p>
            </div>
            <Toggle checked={sidebarCollapsed} onChange={saveToggle("nexora_sidebar_collapsed", setSidebarCollapsed)} />
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────── PRIVACY ── */
function PrivacySection({ profile, updateProfile, toast }: { profile: UserProfile | null; updateProfile: (d: Partial<UserProfile>) => Promise<{ error: Error | null }>; toast: ReturnType<typeof useToast>["toast"] }) {
  const [isPublic, setIsPublic] = useState(profile?.is_profile_public ?? true);
  const [publicProjects, setPublicProjects] = useState(false);
  const [showName, setShowName] = useState(profile?.blueprint_attribution ?? true);

  const savePublic = async (v: boolean) => {
    setIsPublic(v);
    await updateProfile({ is_profile_public: v });
    toast({ description: "Privacy settings saved" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" style={{ color: "#F0F0FF" }}>Privacy</h3>
      </div>

      <Card>
        <p className="text-sm font-semibold mb-3" style={{ color: "#F0F0FF" }}>Profile Visibility</p>
        <div className="space-y-2">
          {[
            { value: true, label: "Public", desc: "Anyone can see your profile and public projects" },
            { value: false, label: "Private", desc: "Only you can see your profile" },
          ].map(({ value, label, desc }) => (
            <label key={String(value)} className="flex items-start gap-3 cursor-pointer">
              <input type="radio" checked={isPublic === value} onChange={() => savePublic(value)} className="mt-0.5 accent-primary" />
              <div>
                <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>{label}</p>
                <p className="text-xs" style={{ color: "#9090B0" }}>{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>New projects are public by default</p>
              <p className="text-xs mt-0.5" style={{ color: "#9090B0" }}>When ON, new projects get a shareable link automatically</p>
            </div>
            <Toggle checked={publicProjects} onChange={setPublicProjects} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>Show my name on blueprints I publish</p>
            </div>
            <Toggle checked={showName} onChange={setShowName} />
          </div>
        </div>
      </Card>

      <div
        className="rounded-lg p-4 flex gap-3"
        style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.25)" }}
      >
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00D4FF" }} />
        <p className="text-sm" style={{ color: "#9090B0" }}>
          Your AI conversations are private and never shared. They're used only to provide context to your AI assistant within your projects.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────── SHORTCUTS ── */
function ShortcutsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" style={{ color: "#F0F0FF" }}>Keyboard Shortcuts</h3>
        <p className="text-sm mt-0.5" style={{ color: "#9090B0" }}>Quick reference for all keyboard shortcuts</p>
      </div>
      {shortcuts.map(({ group, items }) => (
        <div key={group}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#5A5A7A" }}>{group}</p>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A3E" }}>
            {items.map(({ action, keys }, i) => (
              <div
                key={action}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: "#12121A",
                  borderTop: i > 0 ? "1px solid #1A1A2E" : "none",
                }}
              >
                <span className="text-sm" style={{ color: "#F0F0FF" }}>{action}</span>
                <div className="flex items-center gap-1">
                  {keys.map((k, ki) => (
                    <span key={ki}>
                      {ki > 0 && <span className="mx-0.5 text-xs" style={{ color: "#5A5A7A" }}>+</span>}
                      <kbd
                        style={{
                          background: "#1A1A2E",
                          border: "1px solid #2A2A3E",
                          borderRadius: 4,
                          padding: "2px 8px",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 12,
                          color: "#9090B0",
                        }}
                      >
                        {k}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Shared helpers ── */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "#9090B0" }}>{label}</label>
      {children}
    </div>
  );
}

function SettingsStyles() {
  return (
    <style>{`
      .settings-input {
        width: 100%;
        background: #12121A;
        border: 1px solid #2A2A3E;
        border-radius: 8px;
        padding: 10px 12px;
        color: #F0F0FF;
        font-size: 14px;
        outline: none;
        transition: border-color 0.15s;
      }
      .settings-input:focus { border-color: #6C63FF; }
      .settings-input::placeholder { color: #5A5A7A; }
    `}</style>
  );
}
