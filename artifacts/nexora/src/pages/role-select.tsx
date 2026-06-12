import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLES = [
  { id: "student", icon: "🎓", title: "Student", desc: "Working on college or university projects" },
  { id: "maker", icon: "🔧", title: "Maker", desc: "Building smart things for fun or learning" },
  { id: "professor", icon: "👨‍🏫", title: "Professor", desc: "Teaching IoT and managing assignments" },
  { id: "professional", icon: "💼", title: "Professional", desc: "Building real-world IoT solutions" }
];

export default function RoleSelect() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [collegeName, setCollegeName] = useState("");
  const [course, setCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useAuth();
  const [, setLocation] = useLocation();

  const handleContinue = async () => {
    if (!selectedRole) return;
    setLoading(true);
    
    const updateData: any = { role: selectedRole };
    if (selectedRole === "student") {
      if (collegeName) updateData.college_name = collegeName;
      if (course) updateData.course = course;
    }

    await updateProfile(updateData);
    setLocation(selectedRole === "professor" ? "/professor" : "/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3">How are you using Nexora?</h1>
          <p className="text-muted-foreground">This helps us personalize your experience.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {ROLES.map((role) => (
            <div 
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                selectedRole === role.id 
                  ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(108,99,255,0.15)]" 
                  : "border-border bg-card hover:border-primary/50"
              }`}
              data-testid={`role-card-${role.id}`}
            >
              <div className="text-4xl mb-4">{role.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{role.title}</h3>
              <p className="text-sm text-muted-foreground">{role.desc}</p>
            </div>
          ))}
        </div>

        {selectedRole === "student" && (
          <div className="space-y-4 mb-8 p-6 rounded-xl bg-card border border-border animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="space-y-2">
              <Label htmlFor="collegeName">College / University Name (Optional)</Label>
              <Input 
                id="collegeName" 
                value={collegeName} 
                onChange={e => setCollegeName(e.target.value)} 
                placeholder="e.g. Indian Institute of Technology"
                data-testid="input-college"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course">Course / Subject (Optional)</Label>
              <Input 
                id="course" 
                value={course} 
                onChange={e => setCourse(e.target.value)} 
                placeholder="e.g. B.Tech Computer Science"
                data-testid="input-course"
              />
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="w-full sm:w-auto min-w-[240px]" 
            disabled={!selectedRole || loading}
            onClick={handleContinue}
            data-testid="button-continue"
          >
            {loading ? "Saving..." : "Continue to Dashboard"}
          </Button>
        </div>
      </div>
    </div>
  );
}
