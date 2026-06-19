import { Link } from "wouter";
import { useState } from "react";
import {
  ArrowRight, Brain, Code2, Shield, Monitor, BookOpen,
  GraduationCap, Lightbulb, Sparkles, Wrench, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AVATARS = [
  { initials: "RK", color: "#6C63FF", bg: "rgba(108,99,255,0.2)" },
  { initials: "PS", color: "#00D4FF", bg: "rgba(0,212,255,0.2)" },
  { initials: "AM", color: "#00C896", bg: "rgba(0,200,150,0.2)" },
  { initials: "VT", color: "#FFB84D", bg: "rgba(255,184,77,0.2)" },
  { initials: "SR", color: "#FF6B9D", bg: "rgba(255,107,157,0.2)" },
];

const TESTIMONIALS = [
  {
    quote:
      "Nexora helped me complete my BTech final year IoT project in half the time. The AI guided me through every step.",
    author: "Rahul K.",
    college: "VIT Pune",
  },
  {
    quote:
      "Finally a tool that understands IoT from idea to deployment. No more switching between 5 different apps.",
    author: "Priya S.",
    college: "MIT College",
  },
  {
    quote:
      "The wiring validator saved my ESP32 from getting fried. Detected my mistake before I powered it on.",
    author: "Arjun M.",
    college: "BITS Pilani",
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    icon: Lightbulb,
    color: "#6C63FF",
    title: "Describe Your Idea",
    desc: "Type your IoT idea in plain English. No technical knowledge needed to start.",
  },
  {
    num: "02",
    icon: Sparkles,
    color: "#00D4FF",
    title: "AI Plans Everything",
    desc: "Nexora AI analyzes your idea, selects components, checks feasibility, and creates a step-by-step build plan.",
  },
  {
    num: "03",
    icon: Wrench,
    color: "#00C896",
    title: "Build with Guidance",
    desc: "Follow guided steps with wiring diagrams, safety checks, and AI assistance at every point.",
  },
  {
    num: "04",
    icon: Code2,
    color: "#6C63FF",
    title: "Code Appears Automatically",
    desc: "As you complete each step, code is pushed to your Nexora IDE automatically. Just copy and upload.",
  },
];

const FEATURES = [
  {
    icon: Brain,
    color: "#6C63FF",
    title: "AI Project Analysis",
    desc: "Describe any idea. AI identifies components, estimates cost, and checks feasibility instantly.",
  },
  {
    icon: Code2,
    color: "#00D4FF",
    title: "Built-in IDE",
    desc: "Code appears automatically as you complete each build step. No copy-pasting between tools.",
  },
  {
    icon: Shield,
    color: "#00C896",
    title: "Wiring Validator",
    desc: "AI detects dangerous connections before they damage your hardware. Real-time safety checks.",
  },
  {
    icon: Monitor,
    color: "#FFB84D",
    title: "Serial Monitor",
    desc: "Connect your device via USB and see live sensor readings directly in Nexora. No Arduino IDE needed.",
  },
  {
    icon: BookOpen,
    color: "#6C63FF",
    title: "Blueprint Library",
    desc: "Start from proven templates. Fork, customize, and build faster with community blueprints.",
  },
  {
    icon: GraduationCap,
    color: "#00D4FF",
    title: "For Colleges",
    desc: "Professors create assignments. Students submit full project plans. A complete academic IoT workflow.",
  },
];

const FREE_FEATURES = ["3 projects", "AI analysis", "Blueprint library"];
const PRO_FEATURES = [
  "Unlimited projects",
  "AI assistant",
  "Wiring validator",
  "Serial monitor",
  "Priority support",
];

export default function Landing() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: "#0A0A0F", overflowX: "hidden" }}
    >
      {/* Navbar */}
      <nav
        className="fixed top-0 w-full z-50 backdrop-blur-md border-b"
        style={{ background: "rgba(10,10,15,0.85)", borderColor: "#2A2A3E" }}
      >
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div
            className="text-xl font-bold bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #6C63FF, #00D4FF)" }}
          >
            Nexora
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: "#9090B0" }}>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" data-testid="nav-login">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button data-testid="nav-signup">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full animate-pulse"
            style={{ background: "rgba(108,99,255,0.15)", filter: "blur(120px)" }}
          />
          <div
            className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full animate-pulse"
            style={{ background: "rgba(0,212,255,0.12)", filter: "blur(120px)", animationDelay: "1s" }}
          />
        </div>

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <div
            className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm mb-8"
            style={{ borderColor: "rgba(108,99,255,0.3)", background: "rgba(108,99,255,0.08)", color: "#6C63FF" }}
            data-testid="hero-badge"
          >
            <span className="mr-2">✦</span> AI-Powered IoT Platform
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ color: "#F0F0FF" }}>
            Turn any IoT idea into a
            <br className="hidden md:block" />
            <span className="gradient-text"> working project.</span>
          </h1>

          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: "#9090B0" }}>
            From idea to code — guided by AI, step by step. No more jumping between tools.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base" data-testid="hero-cta-primary">
                Start Building Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/blueprints">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base" data-testid="hero-cta-secondary">
                Browse Blueprints
              </Button>
            </Link>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
            {["🎓 Built for students", "⚡ Powered by AI", "🔧 ESP32 + Arduino"].map((pill) => (
              <span
                key={pill}
                className="rounded-full border px-4 py-1.5 text-[13px]"
                style={{ background: "rgba(108,99,255,0.08)", borderColor: "#2A2A3E", color: "#9090B0" }}
              >
                {pill}
              </span>
            ))}
          </div>

          {/* Social proof avatars */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center">
              {AVATARS.map((a, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    marginLeft: i === 0 ? 0 : -10,
                    background: a.bg,
                    borderColor: "#0A0A0F",
                    color: a.color,
                    zIndex: 5 - i,
                    position: "relative",
                  }}
                >
                  {a.initials}
                </div>
              ))}
            </div>
            <span className="text-sm font-medium" style={{ color: "#9090B0" }}>
              <span style={{ color: "#F0F0FF" }}>+2,000 makers</span> already building
            </span>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-5xl">
          <p className="text-center text-sm font-medium mb-10" style={{ color: "#6A6A8A" }}>
            Trusted by students and makers across India
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.author}
                className="rounded-xl border p-6 flex flex-col gap-4"
                style={{ background: "#12121A", borderColor: "#2A2A3E" }}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ color: "#FFB84D" }}>★</span>
                  ))}
                </div>
                <p className="text-sm italic leading-relaxed flex-1" style={{ color: "#F0F0FF" }}>
                  "{t.quote}"
                </p>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#F0F0FF" }}>— {t.author}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6A6A8A" }}>{t.college}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 px-6" style={{ background: "rgba(18,18,26,0.5)" }}>
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#F0F0FF" }}>
              How Nexora Works
            </h2>
            <p style={{ color: "#9090B0" }}>From idea to working IoT project in minutes</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div
                    className="hidden md:block absolute top-8 left-[60%] w-full h-px"
                    style={{ background: "linear-gradient(90deg, #2A2A3E, transparent)" }}
                  />
                )}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-4 relative z-10"
                  style={{ background: "rgba(108,99,255,0.15)", border: "1px solid #6C63FF", color: "#6C63FF" }}
                >
                  {step.num}
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
                >
                  <step.icon className="w-6 h-6" style={{ color: step.color }} />
                </div>
                <h3 className="font-bold mb-2 text-sm" style={{ color: "#F0F0FF" }}>{step.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#9090B0" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#F0F0FF" }}>
              Everything you need to build IoT
            </h2>
            <p style={{ color: "#9090B0" }}>One platform. All the tools. Zero switching.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="rounded-xl border p-6 cursor-default"
                style={{
                  background: "#12121A",
                  borderColor: hoveredFeature === i ? f.color : "#2A2A3E",
                  transform: hoveredFeature === i ? "translateY(-4px)" : "translateY(0)",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}15` }}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="font-bold mb-2" style={{ color: "#F0F0FF" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#9090B0" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ── */}
      <section id="pricing" className="py-20 px-6" style={{ background: "rgba(18,18,26,0.5)" }}>
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#F0F0FF" }}>
              Simple Pricing
            </h2>
            <p style={{ color: "#9090B0" }}>Start free. Upgrade when you need more.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mb-8">
            {/* Free */}
            <div
              className="rounded-xl border p-7 flex flex-col"
              style={{ background: "#12121A", borderColor: "#2A2A3E" }}
            >
              <div className="mb-1 text-sm font-semibold" style={{ color: "#9090B0" }}>Free</div>
              <div className="text-4xl font-bold mb-5" style={{ color: "#F0F0FF" }}>₹0<span className="text-base font-normal" style={{ color: "#6A6A8A" }}> forever</span></div>
              <ul className="space-y-3 mb-7 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#9090B0" }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#00C896" }} /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button variant="outline" className="w-full">Get Started Free</Button>
              </Link>
            </div>

            {/* Student Pro */}
            <div
              className="rounded-xl border p-7 flex flex-col relative overflow-hidden"
              style={{ background: "#12121A", borderColor: "#6C63FF" }}
            >
              <div
                className="absolute top-4 right-4 text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF", border: "1px solid #6C63FF" }}
              >
                Most Popular
              </div>
              <div className="mb-1 text-sm font-semibold" style={{ color: "#6C63FF" }}>Student Pro</div>
              <div className="text-4xl font-bold mb-5" style={{ color: "#F0F0FF" }}>₹299<span className="text-base font-normal" style={{ color: "#6A6A8A" }}>/month</span></div>
              <ul className="space-y-3 mb-7 flex-1">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#9090B0" }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#6C63FF" }} /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button className="w-full">Start Free Trial</Button>
              </Link>
            </div>
          </div>

          <div className="text-center">
            <Link href="/pricing">
              <span className="text-sm transition-colors cursor-pointer" style={{ color: "#6C63FF" }}>
                View full pricing →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="py-20 px-6 border-t"
        style={{
          background: "linear-gradient(135deg, rgba(108,99,255,0.1) 0%, rgba(0,212,255,0.05) 100%)",
          borderColor: "#2A2A3E",
        }}
      >
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#F0F0FF" }}>
            Ready to build your first IoT project?
          </h2>
          <p className="mb-10" style={{ color: "#9090B0" }}>
            Join thousands of students and makers already building with Nexora.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto h-12 px-10 text-base">
                Start Building Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/blueprints">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-10 text-base">
                Browse Blueprints
              </Button>
            </Link>
          </div>
          <p className="text-xs" style={{ color: "#5A5A7A" }}>
            No credit card required · Free forever plan available
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t py-10 px-6" style={{ borderColor: "#2A2A3E" }}>
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div
            className="text-xl font-bold bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #6C63FF, #00D4FF)" }}
          >
            Nexora
          </div>
          <div className="flex gap-6 text-sm" style={{ color: "#6A6A8A" }}>
            <Link href="/pricing"><span className="hover:text-white transition-colors cursor-pointer">Pricing</span></Link>
            <Link href="/blueprints"><span className="hover:text-white transition-colors cursor-pointer">Blueprints</span></Link>
            <Link href="/signup"><span className="hover:text-white transition-colors cursor-pointer">Sign Up</span></Link>
          </div>
          <p className="text-sm" style={{ color: "#5A5A7A" }}>© 2025 Nexora. Made for makers.</p>
        </div>
      </footer>

      <style>{`
        .gradient-text {
          background: linear-gradient(135deg, #6C63FF 0%, #00D4FF 50%, #6C63FF 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s linear infinite;
        }
        @keyframes gradientShift {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}
