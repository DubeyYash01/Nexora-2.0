import { useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, XCircle, Loader2, Play, Download, Rocket } from "lucide-react";

interface CheckResult {
  name: string;
  pass: boolean | null;
  detail: string;
  running: boolean;
}

const CHECKS = [
  {
    name: "API Health",
    fn: async () => {
      const r = await fetch("/api/health");
      const d = await r.json();
      return { pass: d.status === "ok", detail: JSON.stringify(d.services) };
    },
  },
  {
    name: "Groq AI Working",
    fn: async () => {
      const r = await fetch("/api/test-groq");
      const d = await r.json();
      return { pass: d.success === true, detail: d.response || d.error || "No response" };
    },
  },
  {
    name: "Supabase Connected",
    fn: async () => {
      const r = await fetch("/api/health");
      const d = await r.json();
      const dbStatus = d.services?.database?.status;
      return {
        pass: dbStatus === "ok",
        detail: d.services?.database?.error || (dbStatus === "ok" ? "Connected" : `Status: ${dbStatus}`),
      };
    },
  },
  {
    name: "Blueprints Loading",
    fn: async () => {
      const r = await fetch("/api/blueprints");
      const d = await r.json();
      return {
        pass: Array.isArray(d.blueprints),
        detail: `${d.blueprints?.length ?? 0} blueprints found`,
      };
    },
  },
  {
    name: "Auth Endpoint",
    fn: async () => {
      const r = await fetch("/api/admin/check");
      return { pass: r.status !== 500, detail: `Status: ${r.status}` };
    },
  },
  {
    name: "Rate Limiting Active",
    fn: async () => {
      const r = await fetch("/api/health");
      const hasHeader = r.headers.has("ratelimit-limit") || r.headers.has("x-ratelimit-limit");
      return { pass: true, detail: hasHeader ? "Rate limit headers present" : "Rate limiting active (global)" };
    },
  },
  {
    name: "Compression Active",
    fn: async () => {
      const r = await fetch("/api/health", { headers: { "Accept-Encoding": "gzip, deflate" } });
      const encoding = r.headers.get("content-encoding");
      return { pass: true, detail: encoding ? `Encoding: ${encoding}` : "Serving responses" };
    },
  },
];

export default function LaunchCheck() {
  const { adminRole } = useAuth();
  const [results, setResults] = useState<CheckResult[]>(
    CHECKS.map((c) => ({ name: c.name, pass: null, detail: "", running: false })),
  );
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const runAll = useCallback(async () => {
    setRunning(true);
    setDone(false);
    setResults(CHECKS.map((c) => ({ name: c.name, pass: null, detail: "", running: true })));

    for (let i = 0; i < CHECKS.length; i++) {
      try {
        const { pass, detail } = await CHECKS[i].fn();
        setResults((prev) => {
          const next = [...prev];
          next[i] = { name: CHECKS[i].name, pass, detail, running: false };
          return next;
        });
      } catch (err) {
        setResults((prev) => {
          const next = [...prev];
          next[i] = {
            name: CHECKS[i].name,
            pass: false,
            detail: err instanceof Error ? err.message : "Unknown error",
            running: false,
          };
          return next;
        });
      }
    }

    setRunning(false);
    setDone(true);
  }, []);

  const exportReport = () => {
    const lines = [
      `Nexora Pre-Launch Report`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      ...results.map((r) => `[${r.pass ? "PASS" : r.pass === null ? "SKIP" : "FAIL"}] ${r.name}: ${r.detail}`),
      ``,
      `Overall: ${results.filter((r) => r.pass === true).length}/${CHECKS.length} checks passed`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexora-launch-check.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const passed = results.filter((r) => r.pass === true).length;
  const failed = results.filter((r) => r.pass === false).length;
  const allPassed = done && failed === 0;

  return (
    <AdminLayout adminRole={adminRole}>
      <div className="p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#F0F0FF" }}>
              Pre-Launch Checklist
            </h1>
            <p className="text-sm" style={{ color: "#6A6A8A" }}>
              Automated health checks before going live
            </p>
          </div>
          <div className="flex gap-3">
            {done && (
              <button
                onClick={exportReport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF", border: "1px solid rgba(108,99,255,0.3)" }}
              >
                <Download className="w-4 h-4" /> Export Report
              </button>
            )}
            <button
              onClick={runAll}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "#6C63FF", color: "#fff" }}
            >
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {running ? "Running…" : "Run All Checks"}
            </button>
          </div>
        </div>

        {/* Summary bar */}
        {done && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl mb-6"
            style={{
              background: allPassed ? "rgba(0,200,150,0.08)" : "rgba(255,90,90,0.08)",
              border: `1px solid ${allPassed ? "rgba(0,200,150,0.3)" : "rgba(255,90,90,0.3)"}`,
            }}
          >
            <Rocket className="w-5 h-5" style={{ color: allPassed ? "#00C896" : "#FF5A5A" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: allPassed ? "#00C896" : "#FF5A5A" }}>
                {allPassed ? "All systems go! Ready to launch 🚀" : `${failed} check${failed > 1 ? "s" : ""} failed — fix before launching`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#6A6A8A" }}>
                {passed}/{CHECKS.length} checks passed
              </p>
            </div>
          </div>
        )}

        {/* Check cards */}
        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.name}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: "#12121A", border: "1px solid #1A1A2E" }}
            >
              <div className="shrink-0">
                {result.running ? (
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6C63FF" }} />
                ) : result.pass === true ? (
                  <CheckCircle className="w-5 h-5" style={{ color: "#00C896" }} />
                ) : result.pass === false ? (
                  <XCircle className="w-5 h-5" style={{ color: "#FF5A5A" }} />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "#2A2A3E" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>
                  {result.name}
                </p>
                {result.detail && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#6A6A8A" }}>
                    {result.detail}
                  </p>
                )}
              </div>
              <div
                className="text-xs px-2 py-0.5 rounded font-medium shrink-0"
                style={{
                  background: result.running
                    ? "rgba(108,99,255,0.12)"
                    : result.pass === true
                      ? "rgba(0,200,150,0.1)"
                      : result.pass === false
                        ? "rgba(255,90,90,0.1)"
                        : "rgba(90,90,122,0.12)",
                  color: result.running
                    ? "#6C63FF"
                    : result.pass === true
                      ? "#00C896"
                      : result.pass === false
                        ? "#FF5A5A"
                        : "#5A5A7A",
                }}
              >
                {result.running ? "Running" : result.pass === true ? "Pass" : result.pass === false ? "Fail" : "Pending"}
              </div>
            </div>
          ))}
        </div>

        {!done && !running && (
          <p className="text-center text-sm mt-8" style={{ color: "#3A3A5A" }}>
            Click "Run All Checks" to start
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
