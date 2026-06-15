import { useState } from "react";
import { Flag, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  contentType: "blueprint" | "profile";
  contentId: string;
  contentTitle?: string;
}

const REASONS: Record<string, string[]> = {
  blueprint: [
    "Spam or advertisement",
    "Plagiarized / stolen content",
    "Misleading information",
    "Inappropriate content",
    "Does not work as described",
    "Other",
  ],
  profile: [
    "Fake or impersonation",
    "Spam or bot",
    "Inappropriate profile content",
    "Harassment",
    "Other",
  ],
};

export default function ReportModal({ open, onClose, contentType, contentId, contentTitle }: Props) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!reason || !user) return;
    setSubmitting(true);
    try {
      await authFetch("/api/admin/reports/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_type: contentType, content_id: contentId, reason, details }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5" style={{ color: "#FF5A5A" }} />
            <h2 className="text-base font-semibold" style={{ color: "#F0F0FF" }}>Report {contentType === "blueprint" ? "Blueprint" : "Profile"}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5" style={{ color: "#5A5A7A" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#00D4FF" }} />
            <h3 className="font-semibold mb-1" style={{ color: "#F0F0FF" }}>Report Submitted</h3>
            <p className="text-sm" style={{ color: "#6A6A8A" }}>Our moderation team will review this shortly.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#6C63FF", color: "#fff" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            {contentTitle && (
              <p className="text-xs mb-4 px-3 py-2 rounded-lg truncate" style={{ background: "rgba(255,90,90,0.08)", color: "#9090B0" }}>
                <AlertTriangle className="w-3 h-3 inline mr-1" style={{ color: "#FF5A5A" }} />
                {contentTitle}
              </p>
            )}

            <p className="text-xs mb-3 font-medium" style={{ color: "#9090B0" }}>Reason for reporting:</p>
            <div className="space-y-2 mb-4">
              {REASONS[contentType].map((r) => (
                <label key={r} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{ background: reason === r ? "rgba(108,99,255,0.12)" : "transparent", border: `1px solid ${reason === r ? "rgba(108,99,255,0.3)" : "#2A2A3E"}` }}>
                  <input type="radio" className="sr-only" value={r} checked={reason === r} onChange={() => setReason(r)} />
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: reason === r ? "#6C63FF" : "#3A3A5E" }}>
                    {reason === r && <div className="w-2 h-2 rounded-full" style={{ background: "#6C63FF" }} />}
                  </div>
                  <span className="text-sm" style={{ color: "#C0C0D8" }}>{r}</span>
                </label>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)"
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border px-3 py-2.5 text-sm resize-none mb-4"
              style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}
            />

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#2A2A3E", color: "#9090B0" }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting || !user}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "#FF5A5A", color: "#fff" }}
              >
                {submitting ? "Submitting…" : "Submit Report"}
              </button>
            </div>
            {!user && <p className="text-xs text-center mt-2" style={{ color: "#5A5A7A" }}>Sign in to submit a report.</p>}
          </>
        )}
      </div>
    </div>
  );
}
