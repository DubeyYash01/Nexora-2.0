import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    
    const { error: signUpError } = await signUp(email, password, fullName);
    
    if (signUpError) {
      setError(signUpError.message || "Failed to create account");
      setLoading(false);
    } else {
      setLocation("/role-select");
    }
  };

  const getPasswordStrength = () => {
    if (!password) return { label: "", color: "bg-muted" };
    if (password.length < 6) return { label: "Weak", color: "bg-destructive", width: "33%" };
    if (password.length < 10) return { label: "Good", color: "bg-warning", width: "66%" };
    return { label: "Strong", color: "bg-success", width: "100%" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-card shadow-lg">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">Nexora</div>
          <h2 className="text-2xl font-semibold text-foreground">Create an account</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input 
              id="fullName" 
              placeholder="John Doe" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="bg-background"
              data-testid="input-fullname"
            />
          </div>

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
            {password && (
              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Strength:</span>
                  <span className={`font-medium ${strength.label === 'Weak' ? 'text-destructive' : strength.label === 'Good' ? 'text-warning' : 'text-success'}`}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-background"
              data-testid="input-confirm-password"
            />
          </div>

          {error && <div className="text-sm text-destructive text-center" data-testid="error-message">{error}</div>}

          <Button type="submit" className="w-full mt-2" disabled={loading} data-testid="button-submit">
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
