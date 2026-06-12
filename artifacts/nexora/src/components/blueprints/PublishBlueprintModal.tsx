import { useState, useEffect } from "react";
import { X, Globe, Lock, ChevronRight, ChevronLeft, Loader2, Check, Twitter, Share2 } from "lucide-react";
import { authFetch } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import BlueprintCard from "./BlueprintCard";
import type { Blueprint } from "./BlueprintCard";

const CATEGORIES = ["Home Automation","Agriculture","Security","Smart City","Environment","Tracking","Health","Education","Other"];

function Confetti() {
  const colors = ["#6C63FF","#00D4FF","#FF5A5A","#FFB84D","#00C896","#B0A0FF"];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[100]">
      {Array.from({ length: 40 }).map((_, i) => {
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const size = 6 + Math.random() * 8;
        const duration = 2.5 + Math.random() * 2;
        return (
          <div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: `${left}%`,
              top: "-20px",
              width: size,
              height: size,
              background: color,
              animation: `confettiFall ${duration}s ${delay}s ease-in forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

interface PublishData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: string;
  isPublic: boolean;
  showAuthor: boolean;
}

export default function PublishBlueprintModal({
  projectId,
  projectTitle,
  projectDescription,
  projectDifficulty,
  projectComponents,
  onClose,
  onPublished,
}: {
  projectId: string;
  projectTitle: string;
  projectDescription?: string;
  projectDifficulty?: string;
  projectComponents?: Blueprint["components"];
  onClose: () => void;
  onPublished: (blueprintId: string) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [blueprintId, setBlueprintId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState<PublishData>({
    title: projectTitle,
    description: projectDescription ?? "",
    category: "Other",
    tags: [],
    difficulty: projectDifficulty ?? "Beginner",
    isPublic: true,
    showAuthor: true,
  });

  const addTag = () => {
    const t = tagInput.trim();
    if (t && form.tags.length < 5 && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (t: string) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await authFetch("/api/blueprints/publish", {
        method: "POST",
        body: JSON.stringify({ projectId, ...form }),
      });
      const data = await res.json() as { blueprintId?: string; error?: string };
      if (!data.blueprintId) throw new Error(data.error ?? "Failed");
      setBlueprintId(data.blueprintId);
      setPublished(true);
      setShowConfetti(true);
      onPublished(data.blueprintId);
      setTimeout(() => setShowConfetti(false), 5000);
    } catch {
      toast({ title: "Failed to publish blueprint", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const blueprintUrl = blueprintId ? `${window.location.origin}/blueprints/${blueprintId}` : "";

  const previewBlueprint: Blueprint = {
    id: "preview",
    title: form.title,
    description: form.description,
    difficulty: form.difficulty as Blueprint["difficulty"],
    category: form.category,
    tags: form.tags,
    platform: "ESP32",
    estimated_cost_min: 0,
    estimated_cost_max: 0,
    estimated_time: "—",
    fork_count: 0,
    like_count: 0,
    view_count: 0,
    is_featured: false,
    author_id: form.showAuthor ? "self" : null,
    components: projectComponents ?? { list: [] },
    build_plan: null,
    userLiked: false,
  };

  return (
    <>
      {showConfetti && <Confetti />}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        onClick={(e) => e.target === e.currentTarget && !published && onClose()}
      >
        <div className="w-full max-w-lg rounded-2xl border overflow-hidden flex flex-col max-h-[90vh]"
          style={{ background: "#0D0D14", borderColor: "#2A2A3E" }}>

          {/* Header */}
          {!published && (
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#2A2A3E" }}>
              <div className="flex items-center gap-3">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        background: step >= s ? "#6C63FF" : "#1A1A2E",
                        color: step >= s ? "#fff" : "#5A5A7A",
                        border: `1px solid ${step >= s ? "#6C63FF" : "#2A2A3E"}`,
                      }}
                    >
                      {step > s ? <Check className="w-3 h-3" /> : s}
                    </div>
                    {s < 3 && <div className="w-8 h-px" style={{ background: step > s ? "#6C63FF" : "#2A2A3E" }} />}
                  </div>
                ))}
                <span className="text-sm font-medium ml-2" style={{ color: "#C0C0D0" }}>
                  {step === 1 ? "Details" : step === 2 ? "Visibility" : "Preview"}
                </span>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: "#9090B0" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(90,90,122,0.2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {published ? (
              /* Success state */
              <div className="px-6 py-8 text-center space-y-6">
                <div className="text-5xl">🎉</div>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: "#F0F0FF" }}>Blueprint Published!</h2>
                  <p className="text-sm mt-1" style={{ color: "#9090B0" }}>Your blueprint is now live in the Nexora community</p>
                </div>

                <div className="p-4 rounded-xl border space-y-3" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                  <p className="text-sm font-medium" style={{ color: "#C0C0D0" }}>Share your blueprint:</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={blueprintUrl}
                      className="flex-1 text-xs px-3 py-2 rounded-lg border outline-none"
                      style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#9090B0" }} />
                    <button
                      onClick={() => { navigator.clipboard.writeText(blueprintUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                      style={{ background: copied ? "#00C896" : "#6C63FF", color: "#fff" }}>
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  <p className="text-xs italic" style={{ color: "#5A5A7A" }}>
                    "I just published an IoT blueprint on Nexora — {form.title}. Build it yourself: {blueprintUrl}"
                  </p>

                  <div className="flex gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`I just published an IoT blueprint on Nexora — ${form.title}. Build it yourself: ${blueprintUrl}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 py-2 rounded-lg text-xs font-medium text-center transition-all"
                      style={{ background: "rgba(37,211,102,0.1)", color: "#25D366", border: "1px solid rgba(37,211,102,0.3)" }}>
                      WhatsApp
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just published an IoT blueprint on Nexora — ${form.title}. Build it yourself:`)}&url=${encodeURIComponent(blueprintUrl)}&hashtags=IoT,MadeWithNexora`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 py-2 rounded-lg text-xs font-medium text-center transition-all"
                      style={{ background: "rgba(29,161,242,0.1)", color: "#1DA1F2", border: "1px solid rgba(29,161,242,0.3)" }}>
                      Twitter/X
                    </a>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.href = `/blueprints/${blueprintId}`}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
                    style={{ borderColor: "#6C63FF", color: "#6C63FF" }}>
                    View in Library
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: "#6C63FF", color: "#fff" }}>
                    Back to Project
                  </button>
                </div>
              </div>
            ) : step === 1 ? (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#C0C0D0" }}>Title</label>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all"
                    style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}
                    onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
                    onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: "#C0C0D0" }}>Description</label>
                    <span className="text-xs" style={{ color: form.description.length > 280 ? "#FF5A5A" : "#5A5A7A" }}>
                      {form.description.length}/300
                    </span>
                  </div>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 300) }))}
                    rows={3} className="w-full rounded-xl px-4 py-3 text-sm border outline-none resize-none transition-all"
                    style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}
                    onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
                    onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#C0C0D0" }}>Category</label>
                    <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none"
                      style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#C0C0D0" }}>Difficulty</label>
                    <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none"
                      style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}>
                      {["Beginner","Intermediate","Advanced"].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#C0C0D0" }}>
                    Tags <span style={{ color: "#5A5A7A", fontWeight: 400 }}>(max 5, press Enter)</span>
                  </label>
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="e.g. ESP32, sensors, automation..."
                    className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none transition-all"
                    style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}
                    onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
                    onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")} />
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.tags.map((t) => (
                        <span key={t} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF" }}>
                          {t}
                          <button onClick={() => removeTag(t)} className="text-current opacity-60 hover:opacity-100">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : step === 2 ? (
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm font-semibold" style={{ color: "#C0C0D0" }}>Who can see this blueprint?</p>
                {[
                  { value: true, icon: Globe, title: "Public", sub: "Anyone can find and fork this", note: "Helps the community grow" },
                  { value: false, icon: Lock, title: "Private", sub: "Only people with the link", note: "Good for sharing with your class" },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = form.isPublic === opt.value;
                  return (
                    <div
                      key={String(opt.value)}
                      onClick={() => setForm((f) => ({ ...f, isPublic: opt.value }))}
                      className="p-4 rounded-xl border cursor-pointer transition-all"
                      style={{ borderColor: active ? "#6C63FF" : "#2A2A3E", background: active ? "rgba(108,99,255,0.06)" : "#0A0A0F" }}>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: active ? "rgba(108,99,255,0.15)" : "rgba(90,90,122,0.1)" }}>
                          <Icon className="w-4.5 h-4.5" style={{ color: active ? "#6C63FF" : "#9090B0" }} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "#F0F0FF" }}>{opt.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#9090B0" }}>{opt.sub}</p>
                          <p className="text-[11px] mt-1 font-medium" style={{ color: "#5A5A7A" }}>{opt.note}</p>
                        </div>
                        {active && <Check className="w-4 h-4 ml-auto flex-shrink-0 mt-0.5" style={{ color: "#6C63FF" }} />}
                      </div>
                    </div>
                  );
                })}
                <div
                  onClick={() => setForm((f) => ({ ...f, showAuthor: !f.showAuthor }))}
                  className="p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all"
                  style={{ borderColor: form.showAuthor ? "#6C63FF" : "#2A2A3E", background: "#0A0A0F" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>Show my name as author</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9090B0" }}>Your name will appear on the blueprint card</p>
                  </div>
                  <div className="w-10 h-6 rounded-full transition-all" style={{ background: form.showAuthor ? "#6C63FF" : "#2A2A3E", position: "relative" }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full transition-all"
                      style={{ background: "#fff", left: form.showAuthor ? "calc(100% - 20px)" : "4px" }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm font-semibold" style={{ color: "#C0C0D0" }}>Preview your blueprint card:</p>
                <div className="pointer-events-none">
                  <BlueprintCard blueprint={previewBlueprint} onFork={() => {}} onClick={() => {}} />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!published && (
            <div className="px-6 py-4 border-t flex-shrink-0 flex gap-3" style={{ borderColor: "#2A2A3E" }}>
              {step > 1 && (
                <button onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
                  style={{ borderColor: "#2A2A3E", color: "#9090B0" }}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
              {step < 3 ? (
                <button onClick={() => setStep((s) => s + 1)}
                  disabled={step === 1 && !form.title}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "#6C63FF", color: "#fff" }}>
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handlePublish} disabled={publishing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "#6C63FF", color: "#fff", opacity: publishing ? 0.7 : 1 }}>
                  {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</> : "Looks good! Publish"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
