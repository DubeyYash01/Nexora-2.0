import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Shield } from "lucide-react";

interface AdminState {
  checked: boolean;
  isAdmin: boolean;
  role: string | null;
}

export default function AdminRoute({ children }: { children: React.ReactNode | ((role: string | null) => React.ReactNode) }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [admin, setAdmin] = useState<AdminState>({ checked: false, isAdmin: false, role: null });

  useEffect(() => {
    if (loading) return;
    if (!user) { setLocation("/login"); return; }

    fetch(`/api/admin/check/${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setAdmin({ checked: true, isAdmin: data.isAdmin, role: data.role });
        if (!data.isAdmin) {
          fetch("/api/admin/log-access-attempt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, path: window.location.pathname }),
          }).catch(() => {});
        }
      })
      .catch(() => setAdmin({ checked: true, isAdmin: false, role: null }));
  }, [user, loading]);

  if (loading || !admin.checked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0F" }}>
        <div className="animate-pulse w-8 h-8 rounded-full" style={{ background: "#FFB84D33" }} />
      </div>
    );
  }

  if (!admin.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "#0A0A0F" }}>
        <Shield className="w-16 h-16" style={{ color: "#FF5A5A" }} />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#F0F0FF" }}>Access Denied</h1>
          <p className="text-sm" style={{ color: "#6A6A8A" }}>
            This area is restricted to Nexora administrators.
          </p>
        </div>
        <button
          onClick={() => setLocation("/dashboard")}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "#6C63FF", color: "#fff" }}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return <>{typeof children === "function" ? (children as any)(admin.role) : children}</>;
}

export function AdminRouteWithRole({ component: Component }: { component: React.ComponentType<{ adminRole: string | null }> }) {
  return (
    <AdminRoute>
      {(role: string | null) => <Component adminRole={role} />}
    </AdminRoute>
  );
}
