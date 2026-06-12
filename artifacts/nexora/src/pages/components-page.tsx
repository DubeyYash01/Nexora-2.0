import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import { DashboardLayout } from "./dashboard";
import { useLocation } from "wouter";
import {
  Plus, Sparkles, Cpu, Search, Package,
  Loader2, DollarSign, FolderOpen, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ComponentCard, { type UserComponent } from "@/components/ui/ComponentCard";
import AddComponentModal from "@/components/ui/AddComponentModal";
import SuggestProjectsPanel from "@/components/components/SuggestProjectsPanel";

const CATEGORIES = ["All", "microcontroller", "sensor", "actuator", "display", "communication", "power", "passive", "module"];
const CATEGORY_LABELS: Record<string, string> = {
  All: "All",
  microcontroller: "Microcontrollers",
  sensor: "Sensors",
  actuator: "Actuators",
  display: "Displays",
  communication: "Communication",
  power: "Power",
  passive: "Passive",
  module: "Modules",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Recently Added" },
  { value: "name", label: "Name A-Z" },
  { value: "category", label: "Category" },
];

export default function ComponentsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [components, setComponents] = useState<UserComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [modalOpen, setModalOpen] = useState(false);
  const [editComponent, setEditComponent] = useState<UserComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserComponent | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadComponents = useCallback(async () => {
    try {
      const res = await authFetch("/api/components/me");
      if (!res.ok) return;
      const data = await res.json() as { components: UserComponent[] };
      setComponents(data.components ?? []);
    } catch {
      toast({ title: "Failed to load components", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadComponents(); }, [loadComponents]);

  const handleSave = async (form: {
    name: string; category: string; quantity: number; condition: "new" | "working" | "untested" | "faulty";
    purchasePrice: number | null; notes: string;
  }) => {
    if (editComponent) {
      const res = await authFetch(`/api/components/${editComponent.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name, category: form.category, quantity: form.quantity,
          condition: form.condition, purchasePrice: form.purchasePrice, notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { component: UserComponent };
      setComponents((prev) => prev.map((c) => c.id === editComponent.id ? data.component : c));
      toast({ title: `✓ ${form.name} updated` });
      setEditComponent(null);
    } else {
      const res = await authFetch("/api/components", {
        method: "POST",
        body: JSON.stringify({
          name: form.name, category: form.category, quantity: form.quantity,
          condition: form.condition, purchasePrice: form.purchasePrice, notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { component: UserComponent };
      setComponents((prev) => [data.component, ...prev]);
      toast({ title: `✓ ${form.name} added to your inventory` });
    }
  };

  const handleDuplicate = async (c: UserComponent) => {
    const res = await authFetch("/api/components", {
      method: "POST",
      body: JSON.stringify({
        name: c.name, category: c.category, quantity: c.quantity,
        condition: c.condition, purchasePrice: c.purchase_price, notes: c.notes,
      }),
    });
    if (res.ok) {
      const data = await res.json() as { component: UserComponent };
      setComponents((prev) => [data.component, ...prev]);
      toast({ title: `✓ ${c.name} duplicated` });
    }
  };

  const handleDelete = async (c: UserComponent) => {
    setDeletingId(c.id);
    try {
      const res = await authFetch(`/api/components/${c.id}`, { method: "DELETE" });
      if (res.ok) {
        setComponents((prev) => prev.filter((comp) => comp.id !== c.id));
        toast({ title: `${c.name} removed from inventory` });
      }
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  // Filtered + sorted list
  const filtered = components
    .filter((c) => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.notes ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || c.category === category;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "category") return a.category.localeCompare(b.category);
      return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
    });

  const totalValue = components.reduce((s, c) => s + (c.purchase_price ?? 0) * c.quantity, 0);

  return (
    <DashboardLayout title="My Components">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">My Components</h2>
            <p className="text-muted-foreground mt-0.5">Your personal hardware inventory</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSuggestOpen(true)}
              disabled={components.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-40"
              style={{ borderColor: "#6C63FF", color: "#6C63FF", background: "rgba(108,99,255,0.06)" }}
              onMouseEnter={(e) => { if (components.length > 0) e.currentTarget.style.background = "rgba(108,99,255,0.12)"; }}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(108,99,255,0.06)")}
            >
              <Sparkles className="w-4 h-4" /> Scan & Suggest Projects
            </button>
            <button
              onClick={() => { setEditComponent(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "#6C63FF", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#5854E0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#6C63FF")}
            >
              <Plus className="w-4 h-4" /> Add Component
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Cpu, label: "Total Components", value: components.length.toString() },
            {
              icon: DollarSign,
              label: "Total Value",
              value: `~₹${totalValue.toLocaleString("en-IN")}`,
              sub: "Estimated inventory value",
            },
            {
              icon: FolderOpen,
              label: "Used in Projects",
              value: components.filter((c) => (c.usedInProjects ?? 0) > 0).length.toString(),
            },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="p-4 rounded-xl border" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
              <Icon className="w-4 h-4 mb-2" style={{ color: "#6C63FF" }} />
              <div className="text-2xl font-bold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{sub ?? label}</div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#5A5A7A" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search components..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
                style={{ background: "#12121A", borderColor: "#2A2A3E", color: "#F0F0FF" }}
                onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
                onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")}
              />
            </div>
            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ background: "#12121A", borderColor: "#2A2A3E", color: "#C0C0D0" }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                style={{
                  background: category === cat ? "#6C63FF" : "#12121A",
                  borderColor: category === cat ? "#6C63FF" : "#2A2A3E",
                  color: category === cat ? "#fff" : "#9090B0",
                }}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#6C63FF" }} />
          </div>
        ) : components.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-dashed flex flex-col items-center py-20 text-center"
            style={{ borderColor: "#2A2A3E", background: "#12121A" }}>
            <Cpu className="w-16 h-16 mb-5" style={{ color: "#6C63FF", opacity: 0.4 }} />
            <h3 className="text-xl font-semibold text-foreground mb-2">No components added yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Add your hardware inventory and Nexora will suggest projects you can build today.
            </p>
            <button
              onClick={() => { setEditComponent(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "#6C63FF", color: "#fff" }}
            >
              <Plus className="w-4 h-4" /> Add Your First Component
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Package className="w-12 h-12 mb-4" style={{ color: "#3A3A5A" }} />
            <p className="text-muted-foreground">No components match your search</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((c) => (
              <ComponentCard
                key={c.id}
                component={c}
                onEdit={(comp) => { setEditComponent(comp); setModalOpen(true); }}
                onDuplicate={handleDuplicate}
                onDelete={setDeleteTarget}
                onFindProjects={() => setSuggestOpen(true)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AddComponentModal
        open={modalOpen}
        editComponent={editComponent}
        onClose={() => { setModalOpen(false); setEditComponent(null); }}
        onSave={handleSave}
      />

      {/* Suggest Projects Panel */}
      <SuggestProjectsPanel
        open={suggestOpen}
        components={components}
        skillLevel={profile?.role === "student" ? "Beginner" : "Intermediate"}
        onClose={() => setSuggestOpen(false)}
      />

      {/* Delete Confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div className="rounded-2xl border p-6 max-w-sm w-full" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
            <h3 className="font-bold text-foreground mb-1">Remove component?</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Remove <span className="text-foreground font-medium">{deleteTarget.name}</span> from inventory?
            </p>
            <p className="text-xs mb-5" style={{ color: "#5A5A7A" }}>This won't affect existing projects.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={deletingId === deleteTarget.id}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: "rgba(255,90,90,0.15)", color: "#FF5A5A", border: "1px solid rgba(255,90,90,0.3)" }}
              >
                {deletingId === deleteTarget.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
