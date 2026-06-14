import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const TOUR_KEY = "nexora_tour_completed";

const steps = [
  {
    target: "[data-tour='stats-row']",
    title: "Your Dashboard",
    description: "This is your home base. Track your projects, components, and activity here.",
    position: "below" as const,
  },
  {
    target: "aside",
    title: "Navigate Nexora",
    description: "Access your projects, IDE, blueprints, and AI assistant from here anytime.",
    position: "right" as const,
  },
  {
    target: "[data-testid='btn-new-project']",
    title: "Start Building",
    description: "Describe any IoT idea and our AI will analyze it, suggest components, and create a step-by-step build plan.",
    position: "below" as const,
  },
  {
    target: "[data-testid='nav-ide']",
    title: "Your Built-in IDE",
    description: "As you complete each build step, code automatically appears here. No copy-pasting.",
    position: "right" as const,
  },
  {
    target: "[data-tour='floating-ai']",
    title: "AI Always Available",
    description: "Ask anything about your project. The AI knows your components, your code, and your current step.",
    position: "above" as const,
  },
];

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      const timer = setTimeout(() => setActive(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const sel = steps[step]?.target;
    if (!sel) return;
    const el = document.querySelector(sel);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [active, step]);

  const completeTour = () => {
    localStorage.setItem(TOUR_KEY, "true");
    setActive(false);
    toast({ description: "You're all set! Start by creating your first project. 🚀" });
  };

  if (!active) return null;

  const current = steps[step];
  const spotStyle = rect
    ? {
        position: "fixed" as const,
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        borderRadius: 10,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
        zIndex: 9998,
        pointerEvents: "none" as const,
        border: "2px solid rgba(108,99,255,0.6)",
      }
    : { display: "none" };

  const tooltipLeft = rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 324) : 0;
  let tooltipTop = 0;
  if (rect) {
    if (current.position === "below") tooltipTop = rect.bottom + 20;
    else if (current.position === "above") tooltipTop = rect.top - 220;
    else tooltipTop = rect.top;
  }

  return (
    <>
      <div style={spotStyle} />
      <div
        style={{
          position: "fixed",
          top: tooltipTop,
          left: tooltipLeft,
          width: 300,
          zIndex: 9999,
          background: "#12121A",
          border: "1px solid #6C63FF",
          borderRadius: 12,
          padding: "20px 24px",
          boxShadow: "0 8px 32px rgba(108,99,255,0.3)",
        }}
      >
        <div className="flex gap-1.5 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: 4,
                background: i === step ? "#6C63FF" : "#2A2A3E",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>
        <p className="font-bold text-sm mb-1" style={{ color: "#F0F0FF" }}>{current.title}</p>
        <p className="text-sm" style={{ color: "#9090B0" }}>{current.description}</p>
        <div className="flex items-center justify-between mt-5">
          <button onClick={completeTour} className="text-xs" style={{ color: "#5A5A7A" }}>
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-xs px-3 py-1.5 rounded-lg border"
                style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={() => {
                if (step < steps.length - 1) setStep((s) => s + 1);
                else completeTour();
              }}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: "#6C63FF", color: "white" }}
            >
              {step < steps.length - 1 ? "Next →" : "Get Started!"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
