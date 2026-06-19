import React, { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { FeatureFlagProvider, useFeatureFlags } from "@/context/FeatureFlagContext";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import FloatingAI from "@/components/ai/FloatingAI";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import GlobalSearch from "@/components/search/GlobalSearch";
import AnnouncementBanner from "@/components/admin/AnnouncementBanner";
import FeedbackWidget from "@/components/ui/FeedbackWidget";
import { Settings } from "lucide-react";

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
const SearchPage = lazy(() => import("@/pages/search"));
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

const AdminOverview = lazy(() => import("@/pages/admin/index"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminBlueprints = lazy(() => import("@/pages/admin/blueprints"));
const AdminRevenue = lazy(() => import("@/pages/admin/revenue"));
const AdminAIUsage = lazy(() => import("@/pages/admin/ai-usage"));
const AdminReports = lazy(() => import("@/pages/admin/reports"));
const AdminAnnouncements = lazy(() => import("@/pages/admin/announcements"));
const AdminCollege = lazy(() => import("@/pages/admin/college"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const AdminLaunchCheck = lazy(() => import("@/pages/admin/launch-check"));

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

function MaintenanceScreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "#0A0A0F" }}>
      <Settings className="w-16 h-16 animate-spin" style={{ color: "#6C63FF" }} />
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#F0F0FF" }}>Nexora is under maintenance</h1>
        <p className="text-sm mb-4" style={{ color: "#6A6A8A" }}>
          {message || "We're making improvements. Be back shortly!"}
        </p>
        <a href="#" className="text-sm" style={{ color: "#6C63FF" }}>Check our status →</a>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      const path = window.location.pathname;
      if (path !== "/" && path !== "/login" && path !== "/signup") {
        localStorage.setItem("nexora_redirect", path);
      }
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#0A0A0F" }}>
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4"
            style={{
              border: "2px solid #6C63FF",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p className="text-sm" style={{ color: "#5A5A7A" }}>Loading Nexora...</p>
        </div>
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
  const isAdmin = location.startsWith("/admin");
  const isLanding = location === "/";
  if (isWorkspace || isProfessor || isPricing || isAdmin || isLanding) return null;
  return <FloatingAI />;
}

function FeedbackWrapper() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isWorkspace = location.startsWith("/workspace/");
  const isLanding = location === "/";
  const isAuth = location === "/login" || location === "/signup";
  if (!user || isWorkspace || isLanding || isAuth) return null;
  return <FeedbackWidget />;
}

function KeyboardShortcutsProvider() {
  useKeyboardShortcuts();
  return null;
}

function GlobalSearchWrapper() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener("nexora:open-search", handler);
    return () => document.removeEventListener("nexora:open-search", handler);
  }, []);
  return <GlobalSearch open={open} onClose={() => setOpen(false)} />;
}

function AnnouncementBannerWrapper() {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");
  const isLanding = location === "/";
  if (isAdmin || isLanding) return null;
  return <AnnouncementBanner />;
}

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { maintenanceMode, maintenanceMessage, loading } = useFeatureFlags();
  const { isAdmin, loading: authLoading } = useAuth();

  if (loading || authLoading) return null;
  if (maintenanceMode && !isAdmin) {
    return <MaintenanceScreen message={maintenanceMessage} />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <>
      <KeyboardShortcutsProvider />
      <GlobalSearchWrapper />
      <AnnouncementBannerWrapper />
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
          <Route path="/search">
            <ProtectedRoute component={SearchPage} />
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

          {/* Admin routes */}
          <Route path="/admin" component={AdminOverview} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/blueprints" component={AdminBlueprints} />
          <Route path="/admin/revenue" component={AdminRevenue} />
          <Route path="/admin/ai-usage" component={AdminAIUsage} />
          <Route path="/admin/reports" component={AdminReports} />
          <Route path="/admin/announcements" component={AdminAnnouncements} />
          <Route path="/admin/college" component={AdminCollege} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/launch-check" component={AdminLaunchCheck} />

          <Route component={NotFound} />
        </Switch>
      </Suspense>
      <FloatingAIWrapper />
      <FeedbackWrapper />
      <InstallPrompt />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FeatureFlagProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "")}>
                <MaintenanceGate>
                  <Router />
                </MaintenanceGate>
              </WouterRouter>
            </ErrorBoundary>
            <Toaster />
          </TooltipProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
