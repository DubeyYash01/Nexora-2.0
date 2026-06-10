import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    const { error: signInError } = await signIn(email, password);
    
    if (signInError) {
      setError(signInError.message || "Failed to sign in");
      setLoading(false);
    } else {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-card shadow-lg">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">Nexora</div>
          <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background"
              data-testid="input-email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-background"
              data-testid="input-password"
            />
          </div>

          {error && <div className="text-sm text-destructive text-center" data-testid="error-message">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline" data-testid="link-signup">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
