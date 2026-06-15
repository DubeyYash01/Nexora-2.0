import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRoute from "@/components/admin/AdminRoute";
import { Settings, Settings2, Wrench } from "lucide-react";

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      className="relative inline-flex items-center rounded-full transition-colors shrink-0"
      style={{
        width: 40, height: 22,
        background: enabled ? "#6C63FF" : "#2A2A3E",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div className="absolute rounded-full transition-all"
        style={{ width: 16, height: 16, background: "#fff", left: enabled ? 20 : 4 }} />
    </button>
  );
}

function AdminSettingsContent({ adminRole }: { adminRole: string | null }) {
  const { user } = useAuth();
  const [flags, setFlags] = useState<any[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [rawConfig, setRawConfig] = useState<any[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingFlag, setSavingFlag] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/feature-flags").then((r) => r.json()),
      fetch("/api/admin/platform-config").then((r) => r.json()),
    ]).then(([flagData, configData]) => {
      setFlags(flagData.raw ?? []);
      setConfig(configData.config ?? {});
      setRawConfig(configData.raw ?? []);
      setMaintenanceMode(configData.config?.maintenance_mode === "true");
      setMaintenanceMsg(configData.config?.maintenance_message ?? "");
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleFlag = async (flagName: string, current: boolean) => {
    setSavingFlag(flagName);
    try {
      await authFetch(`/api/admin/feature-flags/${flagName}`, {
        method: "PUT",
        body: JSON.stringify({ isEnabled: !current, userId: user?.id }),
      });
      setFlags((f) => f.map((flag) => flag.flag_name === flagName ? { ...flag, is_enabled: !current } : flag));
    } finally { setSavingFlag(null); }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await Promise.all(
        Object.entries(config).filter(([k]) => ["free_ai_daily_limit", "student_pro_ai_daily_limit", "maker_pro_ai_daily_limit"].includes(k))
          .map(([key, value]) =>
            authFetch("/api/admin/platform-config", {
              method: "PUT",
              body: JSON.stringify({ key, value, userId: user?.id }),
            })
          )
      );
    } finally { setSavingConfig(false); }
  };

  const saveMaintenance = async () => {
    setSavingMaintenance(true);
    try {
      await authFetch("/api/admin/maintenance", {
        method: "POST",
        body: JSON.stringify({ enabled: maintenanceMode, message: maintenanceMsg, userId: user?.id }),
      });
    } finally { setSavingMaintenance(false); }
  };

  if (loading) return (
    <AdminLayout adminRole={adminRole}>
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse w-8 h-8 rounded-full" style={{ background: "#6C63FF33" }} />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout adminRole={adminRole}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#F0F0FF" }}>Platform Settings</h1>
        <p className="text-sm" style={{ color: "#6A6A8A" }}>Global platform configuration and feature flags</p>
      </div>

      {/* Feature Flags */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4" style={{ color: "#FFB84D" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>Feature Flags</h3>
        </div>
        <p className="text-xs mb-4" style={{ color: "#6A6A8A" }}>
          Toggle features on/off platform-wide. Changes take effect immediately for all users.
        </p>
        <div className="space-y-3">
          {flags.length === 0 ? (
            <p className="text-sm" style={{ color: "#4A4A6A" }}>No feature flags configured. Run the SQL setup in Supabase.</p>
          ) : flags.map((flag: any) => (
            <div key={flag.flag_name} className="flex items-center justify-between py-2 border-b last:border-0"
              style={{ borderColor: "#1A1A2E" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>
                  {flag.flag_name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </p>
                {flag.description && (
                  <p className="text-xs" style={{ color: "#6A6A8A" }}>{flag.description}</p>
                )}
              </div>
              <Toggle
                enabled={flag.is_enabled}
                onChange={() => toggleFlag(flag.flag_name, flag.is_enabled)}
                disabled={savingFlag === flag.flag_name}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rate Limits */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4" style={{ color: "#00D4FF" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>Rate Limits Configuration</h3>
        </div>
        <p className="text-xs mb-4" style={{ color: "#6A6A8A" }}>
          Adjust AI message limits per plan. -1 = unlimited.
        </p>
        <div className="space-y-3">
          {[
            { key: "free_ai_daily_limit", label: "Free Plan AI Messages/Day" },
            { key: "student_pro_ai_daily_limit", label: "Student Pro AI Messages/Day" },
            { key: "maker_pro_ai_daily_limit", label: "Maker Pro AI Messages/Day (-1 = unlimited)" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <p className="text-sm flex-1" style={{ color: "#B0B0D0" }}>{label}</p>
              <input
                type="number"
                value={config[key] ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                className="w-24 px-3 py-1.5 rounded-lg text-sm border outline-none text-right"
                style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }}
              />
            </div>
          ))}
          <button onClick={saveConfig} disabled={savingConfig}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "#6C63FF", color: "#fff" }}>
            {savingConfig ? "Saving…" : "Save Rate Limits"}
          </button>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="rounded-xl p-5" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-4 h-4" style={{ color: "#FF5A5A" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>Maintenance Mode</h3>
        </div>
        <p className="text-xs mb-4" style={{ color: "#6A6A8A" }}>
          When enabled, all non-admin users see a maintenance page. Admins can still access everything.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: maintenanceMode ? "#FF5A5A" : "#F0F0FF" }}>
                {maintenanceMode ? "⚠ Maintenance Mode is ON" : "Maintenance Mode"}
              </p>
              <p className="text-xs" style={{ color: "#6A6A8A" }}>Users will see a maintenance page</p>
            </div>
            <Toggle enabled={maintenanceMode} onChange={setMaintenanceMode} />
          </div>
          {maintenanceMode && (
            <textarea
              value={maintenanceMsg}
              onChange={(e) => setMaintenanceMsg(e.target.value)}
              placeholder="Optional maintenance message for users…"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
              style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }}
            />
          )}
          <button onClick={saveMaintenance} disabled={savingMaintenance}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{
              background: maintenanceMode ? "#FF5A5A" : "#6C63FF",
              color: "#fff",
            }}>
            {savingMaintenance ? "Saving…" : maintenanceMode ? "Apply Maintenance Mode" : "Save Settings"}
          </button>
        </div>

        {/* Maintenance preview */}
        {maintenanceMode && (
          <div className="mt-4 rounded-xl p-6 text-center" style={{ background: "#0A0A0F", border: "1px solid #2A2A3E" }}>
            <Settings className="w-10 h-10 mx-auto mb-3 animate-spin" style={{ color: "#6C63FF" }} />
            <h3 className="text-lg font-bold mb-1" style={{ color: "#F0F0FF" }}>Nexora is under maintenance</h3>
            <p className="text-sm mb-1" style={{ color: "#6A6A8A" }}>
              {maintenanceMsg || "We're making improvements. Be back shortly!"}
            </p>
            <a href="#" className="text-xs" style={{ color: "#6C63FF" }}>Check our status →</a>
            <p className="text-xs mt-3" style={{ color: "#3A3A5A" }}>(This is what non-admin users see)</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminSettings() {
  return (
    <AdminRoute>
      {(role: string | null) => <AdminSettingsContent adminRole={role} />}
    </AdminRoute>
  );
}
