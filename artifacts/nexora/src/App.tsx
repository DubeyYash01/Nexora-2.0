import React, { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import FloatingAI from "@/components/ai/FloatingAI";
import { InstallPrompt } from "@/components/ui/InstallPrompt";

const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/login"));
const Signup = lazy(() => import("@/pages/signup"));
const RoleSelect = lazy(() => import("@/pages/role-select"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Projects = lazy(() => import("@/pages/projects"));
const NewProject = lazy(() => import("@/pages/new-project"));
const Workspace = lazy(() => import("@/pages/workspace"));
const ComponentsPage = lazy(() => import("@/pages/components-page"));
const BlueprintsPage = lazy(() => import("@/pages/blueprints"));
const BlueprintDetailPage = lazy(() => import("@/pages/blueprint-detail"));
const PublicProjectPage = lazy(() => import("@/pages/public-project"));
const StudentAssignments = lazy(() => import("@/pages/assignments"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const BillingPage = lazy(() => import("@/pages/billing"));
const IDEPage = lazy(() => import("@/pages/ide"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const ProfilePage = lazy(() => import("@/pages/profile"));

const ProfessorOverview = lazy(() => import("@/pages/professor/index"));
const ProfessorClasses = lazy(() => import("@/pages/professor/classes"));
const ProfessorAssignments = lazy(() => import("@/pages/professor/assignments"));
const ProfessorSubmissions = lazy(() => import("@/pages/professor/submissions"));
const ProfessorReview = lazy(() => import("@/pages/professor/review"));
const ProfessorAnalytics = lazy(() => import("@/pages/professor/analytics"));
const ProfessorStudents = lazy(() => import("@/pages/professor/students"));
import { ProtectedProfessorRoute } from "@/components/professor/ProfessorLayout";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const PageLoader = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#6C63FF" }}>
        <span className="text-white font-bold text-lg">N</span>
      </div>
      <div className="animate-pulse w-6 h-1 rounded-full bg-primary/50" />
    </div>
  </div>
);

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
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

function KeyboardShortcutsProvider() {
  useKeyboardShortcuts();
  return null;
}

function Router() {
  return (
    <>
      <KeyboardShortcutsProvider />
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/profile/:username" component={ProfilePage} />

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
            <ErrorBoundary>
              <ProtectedRoute component={Workspace} />
            </ErrorBoundary>
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
          <Route path="/ide">
            <ProtectedRoute component={IDEPage} />
          </Route>
          <Route path="/settings/billing">
            <ProtectedRoute component={BillingPage} />
          </Route>
          <Route path="/settings">
            <ProtectedRoute component={SettingsPage} />
          </Route>
          <Route path="/p/:shareToken" component={PublicProjectPage} />

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
      </Suspense>
      <FloatingAIWrapper />
      <InstallPrompt />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
