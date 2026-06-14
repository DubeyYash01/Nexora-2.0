import { useLocation } from "wouter";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: "#0A0A0F" }}
    >
      <Compass className="w-16 h-16 mb-6" style={{ color: "#2A2A3E" }} />

      <div
        className="font-black leading-none mb-4 select-none"
        style={{
          fontSize: "clamp(80px,16vw,140px)",
          background: "linear-gradient(135deg, #6C63FF, #00D4FF)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        404
      </div>

      <h1 className="text-2xl font-semibold mb-2" style={{ color: "#F0F0FF" }}>
        Page not found
      </h1>
      <p className="mb-8 max-w-sm" style={{ color: "#9090B0" }}>
        The page you're looking for doesn't exist or was moved.
      </p>

      <div className="flex gap-3 flex-wrap justify-center mb-10">
        <Button onClick={() => setLocation("/dashboard")} className="bg-primary text-white hover:bg-primary/90">
          Go to Dashboard
        </Button>
        <Button variant="outline" onClick={() => setLocation("/blueprints")} className="border-border text-foreground">
          Browse Blueprints
        </Button>
      </div>

      <div>
        <p className="text-xs mb-3" style={{ color: "#5A5A7A" }}>
          Looking for something?
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          {[
            { label: "My Projects", href: "/projects" },
            { label: "IDE", href: "/ide" },
            { label: "Blueprints", href: "/blueprints" },
            { label: "Settings", href: "/settings" },
          ].map((l) => (
            <button
              key={l.href}
              onClick={() => setLocation(l.href)}
              className="text-sm transition-colors"
              style={{ color: "#6C63FF" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#00D4FF")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#6C63FF")}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
