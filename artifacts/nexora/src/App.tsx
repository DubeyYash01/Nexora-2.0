import { useEffect, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import FloatingAI from "@/components/ai/FloatingAI";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import RoleSelect from "@/pages/role-select";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import NewProject from "@/pages/new-project";
import Workspace from "@/pages/workspace";
import ComponentsPage from "@/pages/components-page";
import BlueprintsPage from "@/pages/blueprints";
import BlueprintDetailPage from "@/pages/blueprint-detail";
import PublicProjectPage from "@/pages/public-project";
import StudentAssignments from "@/pages/assignments";
import PricingPage from "@/pages/pricing";
import BillingPage from "@/pages/billing";

import ProfessorOverview from "@/pages/professor/index";
import ProfessorClasses from "@/pages/professor/classes";
import ProfessorAssignments from "@/pages/professor/assignments";
import ProfessorSubmissions from "@/pages/professor/submissions";
import ProfessorReview from "@/pages/professor/review";
import ProfessorAnalytics from "@/pages/professor/analytics";
import ProfessorStudents from "@/pages/professor/students";
import { ProtectedProfessorRoute } from "@/components/professor/ProfessorLayout";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: () => ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-pulse w-8 h-8 rounded-full bg-primary/50" />
      </div>
    );
  }

  if (!user) return null;

  return <Component />;
}

function FloatingAIWrapper() {
  const [location] = useLocation();
  const isProfessor = location.startsWith("/professor");
  const isWorkspace = location.startsWith("/workspace/");
  const isPricing = location === "/pricing";
  if (isWorkspace || isProfessor || isPricing) return null;
  return <FloatingAI />;
}

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/role-select">
          <ProtectedRoute component={RoleSelect} />
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/projects">
          <ProtectedRoute component={Projects} />
        </Route>
        <Route path="/projects/new">
          <ProtectedRoute component={NewProject} />
        </Route>
        <Route path="/workspace/:projectId">
          <ProtectedRoute component={Workspace} />
        </Route>
        <Route path="/components">
          <ProtectedRoute component={ComponentsPage} />
        </Route>
        <Route path="/blueprints">
          <ProtectedRoute component={BlueprintsPage} />
        </Route>
        <Route path="/blueprints/:id">
          <ProtectedRoute component={BlueprintDetailPage} />
        </Route>
        <Route path="/assignments">
          <ProtectedRoute component={StudentAssignments} />
        </Route>
        <Route path="/settings/billing">
          <ProtectedRoute component={BillingPage} />
        </Route>
        <Route path="/p/:shareToken" component={PublicProjectPage} />

        {/* Professor routes */}
        <Route path="/professor">
          <ProtectedRoute component={() => <ProtectedProfessorRoute component={ProfessorOverview} />} />
        </Route>
        <Route path="/professor/classes">
          <ProtectedRoute component={() => <ProtectedProfessorRoute component={ProfessorClasses} />} />
        </Route>
        <Route path="/professor/assignments">
          <ProtectedRoute component={() => <ProtectedProfessorRoute component={ProfessorAssignments} />} />
        </Route>
        <Route path="/professor/submissions/:assignmentId">
          <ProtectedRoute component={() => <ProtectedProfessorRoute component={ProfessorSubmissions} />} />
        </Route>
        <Route path="/professor/submissions">
          <ProtectedRoute component={() => <ProtectedProfessorRoute component={ProfessorAssignments} />} />
        </Route>
        <Route path="/professor/review/:submissionId">
          <ProtectedRoute component={() => <ProtectedProfessorRoute component={ProfessorReview} />} />
        </Route>
        <Route path="/professor/analytics">
          <ProtectedRoute component={() => <ProtectedProfessorRoute component={ProfessorAnalytics} />} />
        </Route>
        <Route path="/professor/students">
          <ProtectedRoute component={() => <ProtectedProfessorRoute component={ProfessorStudents} />} />
        </Route>

        <Route component={NotFound} />
      </Switch>
      <FloatingAIWrapper />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
