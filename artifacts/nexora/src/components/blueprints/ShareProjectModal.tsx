import { useState, useEffect } from "react";
import { X, Link2, Download, Sparkles, Copy, Check, Share2, Lock, Globe, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  title: string;
  description?: string;
  ai_analysis?: { difficultyLevel?: string; platform?: string };
  components?: { list?: Array<{ name: string }> };
  build_plan?: { steps?: Array<{ title: string }> };
  ide_code?: string;
  share_token?: string;
  is_public?: boolean;
}

const TABS = ["Share Project", "Export Code", "Made with Nexora"] as const;
type Tab = (typeof TABS)[number];

export default function ShareProjectModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("Share Project");
  const [isPublic, setIsPublic] = useState(project.is_public ?? false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState<string | null>(null);

  const appUrl = window.location.origin;
  const qrUrl = shareUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}&color=F0F0FF&bgcolor=0A0A0F` : null;

  const togglePublic = async () => {
    setToggling(true);
    const newPublic = !isPublic;
    try {
      const res = await authFetch("/api/projects/share", {
        method: "POST",
        body: JSON.stringify({ projectId: project.id, makePublic: newPublic }),
      });
      const data = await res.json() as { shareUrl: string };
      setIsPublic(newPublic);
      setShareUrl(data.shareUrl);
    } catch { toast({ title: "Failed to update sharing settings", variant: "destructive" }); }
    finally { setToggling(false); }
  };

  useEffect(() => {
    if (project.is_public && project.share_token) {
      setShareUrl(`${appUrl}/p/${project.share_token}`);
    }
  }, [project, appUrl]);

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const compNames = (project.components?.list ?? []).slice(0, 4).map((c) => c.name);
  const steps = (project.build_plan?.steps ?? []).slice(0, 5).map((s) => s.title);
  const difficulty = project.ai_analysis?.difficultyLevel ?? "Beginner";
  const platform = project.ai_analysis?.platform ?? "ESP32";

  const linkedInCaption = `Just completed my IoT project using Nexora — ${project.title}!

Built with ${compNames.slice(0, 3).join(", ")}.
The AI-guided build experience was incredible.

Try Nexora free: nexora.app
#IoT #MadeWithNexora #Engineering`;

  const instagramCaption = `New IoT project done! 🔧⚡
${project.title}
Built on Nexora — the AI IoT platform
Link in bio | nexora.app
#IoT #MadeWithNexora #ESP32 #StudentProject`;

  const whatsappMsg = `Hey! I just built ${project.title} using this AI IoT platform called Nexora. It guided me step by step. Check it out free: nexora.app`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl border overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: "#0D0D14", borderColor: "#2A2A3E" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#2A2A3E" }}>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "#F0F0FF" }}>
            <Share2 className="w-5 h-5" style={{ color: "#6C63FF" }} /> Export & Share
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: "#9090B0" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(90,90,122,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: "#2A2A3E" }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-3 text-xs font-medium transition-all"
              style={{ color: tab === t ? "#6C63FF" : "#5A5A7A", borderBottom: tab === t ? "2px solid #6C63FF" : "2px solid transparent" }}>
              {t === "Share Project" && <Link2 className="w-3.5 h-3.5 inline mr-1.5" />}
              {t === "Export Code" && <Download className="w-3.5 h-3.5 inline mr-1.5" />}
              {t === "Made with Nexora" && <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />}
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "Share Project" && (
            <div className="space-y-5">
              {/* Toggle */}
              <div
                className="p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all"
                style={{ borderColor: isPublic ? "#6C63FF" : "#2A2A3E", background: isPublic ? "rgba(108,99,255,0.06)" : "#0A0A0F" }}
                onClick={!toggling ? togglePublic : undefined}
              >
                <div className="flex items-center gap-3">
                  {isPublic ? <Globe className="w-5 h-5" style={{ color: "#6C63FF" }} /> : <Lock className="w-5 h-5" style={{ color: "#5A5A7A" }} />}
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>
                      {isPublic ? "Publicly viewable" : "Only you can see this"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#9090B0" }}>
                      {isPublic ? "Anyone with the link can see your project" : "Toggle to generate a shareable link"}
                    </p>
                  </div>
                </div>
                {toggling ? (
                  <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: "#6C63FF" }} />
                ) : (
                  <div className="w-10 h-6 rounded-full transition-all flex-shrink-0"
                    style={{ background: isPublic ? "#6C63FF" : "#2A2A3E", position: "relative" }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full transition-all"
                      style={{ background: "#fff", left: isPublic ? "calc(100% - 20px)" : "4px" }} />
                  </div>
                )}
              </div>

              {isPublic && shareUrl && (
                <>
                  {/* URL */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold" style={{ color: "#9090B0" }}>Share link:</p>
                    <div className="flex items-center gap-2">
                      <input readOnly value={shareUrl}
                        className="flex-1 text-xs px-3 py-2.5 rounded-xl border outline-none"
                        style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#C0C0D0" }} />
                      <button
                        onClick={() => copy(shareUrl, setCopied)}
                        className="px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex-shrink-0 flex items-center gap-1"
                        style={{ background: copied ? "#00C896" : "#6C63FF", color: "#fff" }}>
                        {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                      </button>
                    </div>
                  </div>

                  {/* What viewers see */}
                  <div className="p-3 rounded-xl" style={{ background: "#0A0A0F", border: "1px solid #2A2A3E" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "#5A5A7A" }}>What viewers can see:</p>
                    {[
                      { v: true, text: "Project overview and plan" },
                      { v: true, text: "Component list" },
                      { v: true, text: "Build steps (read-only)" },
                      { v: false, text: "Your AI conversations (private)" },
                      { v: false, text: "Your budget details (private)" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
                        <span style={{ color: item.v ? "#00C896" : "#FF5A5A" }}>{item.v ? "✓" : "✗"}</span>
                        <span style={{ color: item.v ? "#9090B0" : "#5A5A7A" }}>{item.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* QR */}
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs" style={{ color: "#5A5A7A" }}>QR Code</p>
                    <img src={qrUrl!} alt="QR Code" className="rounded-xl border" width={150} height={150}
                      style={{ borderColor: "#2A2A3E", background: "#0A0A0F" }} />
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "Export Code" && (
            <div className="space-y-4">
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A2A3E" }}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "#2A2A3E", background: "#12121A" }}>
                  <span className="text-xs font-medium" style={{ color: "#9090B0" }}>
                    {project.title.replace(/\s+/g, "_")}.ino
                  </span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(project.ide_code ?? ""); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                    className="text-xs flex items-center gap-1 transition-all"
                    style={{ color: codeCopied ? "#00C896" : "#9090B0" }}>
                    {codeCopied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy all</>}
                  </button>
                </div>
                <pre className="p-4 text-xs overflow-auto max-h-48 leading-relaxed"
                  style={{ fontFamily: "JetBrains Mono, monospace", color: "#9090B0", background: "#0A0A0F" }}>
                  {project.ide_code || "// No code generated yet\n// Complete your workspace steps to generate code"}
                </pre>
              </div>
              <div className="p-4 rounded-xl border flex items-center gap-3"
                style={{ background: "rgba(108,99,255,0.05)", borderColor: "rgba(108,99,255,0.2)" }}>
                <Lock className="w-4 h-4 flex-shrink-0" style={{ color: "#6C63FF" }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#6C63FF" }}>Download .ino file</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9090B0" }}>Code download is available on the Pro plan</p>
                </div>
              </div>
            </div>
          )}

          {tab === "Made with Nexora" && (
            <div className="space-y-5">
              {/* The Card */}
              <div
                className="mx-auto rounded-2xl p-8 flex flex-col gap-4"
                style={{
                  width: "100%",
                  maxWidth: 380,
                  background: "linear-gradient(160deg, #0A0A0F 0%, #1A1A2E 100%)",
                  border: "1px solid #6C63FF",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {/* Top branding */}
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "#6C63FF" }} />
                  <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: "#6C63FF" }}>
                    Made with Nexora
                  </span>
                </div>

                {/* Title + desc */}
                <div>
                  <h3 className="text-xl font-bold leading-tight" style={{ color: "#F0F0FF" }}>{project.title}</h3>
                  {project.description && (
                    <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: "#9090B0" }}>{project.description}</p>
                  )}
                </div>

                {/* Components */}
                {compNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {compNames.map((c, i) => (
                      <span key={i} className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                        style={{ background: "rgba(108,99,255,0.15)", color: "#8A80FF" }}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(0,212,255,0.1)", color: "#00D4FF" }}>{platform}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(0,200,150,0.1)", color: "#00C896" }}>{difficulty}</span>
                </div>

                <div className="h-px" style={{ background: "rgba(108,99,255,0.2)" }} />

                {/* Steps */}
                {steps.length > 0 && (
                  <div className="space-y-1">
                    {steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]" style={{ color: "#9090B0" }}>
                        <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                          style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF", fontSize: 9 }}>{i + 1}</span>
                        {s}
                      </div>
                    ))}
                  </div>
                )}

                <div className="h-px" style={{ background: "rgba(108,99,255,0.2)" }} />

                {/* Footer */}
                <div className="flex items-end justify-between">
                  <span className="text-[11px] font-bold" style={{ color: "#6C63FF" }}>nexora.app</span>
                  {shareUrl && (
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${encodeURIComponent(shareUrl)}&color=6C63FF&bgcolor=0A0A0F`}
                      alt="QR" width={40} height={40} className="rounded" />
                  )}
                </div>
              </div>

              {/* Instructions */}
              <p className="text-xs text-center" style={{ color: "#5A5A7A" }}>
                Screenshot this card and share it on LinkedIn, Instagram, or WhatsApp to show off what you built!
              </p>

              {/* Captions */}
              <div className="space-y-3">
                {[
                  { platform: "LinkedIn", caption: linkedInCaption, color: "#0A66C2", bg: "rgba(10,102,194,0.08)" },
                  { platform: "Instagram", caption: instagramCaption, color: "#E1306C", bg: "rgba(225,48,108,0.08)" },
                  { platform: "WhatsApp", caption: whatsappMsg, color: "#25D366", bg: "rgba(37,211,102,0.08)" },
                ].map(({ platform, caption, color, bg }) => (
                  <div key={platform} className="rounded-xl border p-3 space-y-2"
                    style={{ borderColor: "#2A2A3E", background: "#12121A" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: bg, color }}>{platform} caption</span>
                      <button
                        onClick={() => { copy(caption, (v) => setCaptionCopied(v ? platform : null)); }}
                        className="text-[11px] flex items-center gap-1 transition-all"
                        style={{ color: captionCopied === platform ? "#00C896" : "#9090B0" }}>
                        {captionCopied === platform ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed whitespace-pre-line" style={{ color: "#7090B0" }}>{caption}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
