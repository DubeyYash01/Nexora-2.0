import { Link } from "wouter";
import { ArrowRight, Cpu, Code2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Nexora
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" data-testid="nav-login">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button data-testid="nav-signup">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen animate-pulse"></div>
          <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-[120px] mix-blend-screen animate-pulse delay-1000"></div>
        </div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-8" data-testid="hero-badge">
            <span className="mr-2">✦</span> AI-Powered IoT Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Turn any IoT idea into a <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">working project.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            From idea to code — guided by AI, step by step. No more jumping between tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base" data-testid="hero-cta-primary">
                Start Building Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base" data-testid="hero-cta-secondary">
              Browse Blueprints
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-secondary" />
              ))}
            </div>
            <span>Trusted by students and makers across India</span>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-card/30 border-y border-border">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-16">You're using 5 tools. You should use one.</h2>
          
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['Arduino IDE', 'Tinkercad', 'Blynk', 'ChatGPT', 'Docs'].map(tool => (
                <div key={tool} className="p-4 rounded-xl border border-border bg-card opacity-50 relative grayscale group hover:grayscale-0 hover:opacity-100 transition-all">
                  <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide shadow-sm">
                    Fragmented
                  </div>
                  <div className="text-sm font-medium">{tool}</div>
                </div>
              ))}
            </div>
            
            <div className="hidden lg:flex items-center text-muted-foreground">
              <ArrowRight className="w-8 h-8 animate-pulse text-primary" />
            </div>

            <div className="p-8 rounded-2xl border-2 border-primary bg-primary/5 relative shadow-[0_0_40px_rgba(108,99,255,0.2)]">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">Nexora</div>
              <div className="text-sm text-muted-foreground">Everything in one place</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <Zap className="text-primary w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Idea to Plan in seconds</h3>
              <p className="text-muted-foreground leading-relaxed">
                AI instantly analyzes your IoT idea and generates a complete build plan, component list, and architecture.
              </p>
            </div>
            <div className="p-8 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <Code2 className="text-primary w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">IDE that builds itself</h3>
              <p className="text-muted-foreground leading-relaxed">
                Code gets pushed step by step as you complete each stage. Focus on understanding, not copy-pasting boilerplate.
              </p>
            </div>
            <div className="p-8 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <Cpu className="text-primary w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Built for learners</h3>
              <p className="text-muted-foreground leading-relaxed">
                Guided, milestone-based flow perfect for students and makers trying to learn how hardware actually works.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-bold text-foreground">Nexora</div>
          <div className="text-sm text-muted-foreground">© 2025 Nexora. Made for makers.</div>
        </div>
      </footer>
    </div>
  );
}
