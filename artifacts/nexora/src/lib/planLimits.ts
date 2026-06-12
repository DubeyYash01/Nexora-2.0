export type PlanId = "free" | "student_pro" | "maker_pro" | "college_lab";

export interface PlanLimits {
  id: PlanId;
  name: string;
  price: {
    monthly: number;
    semester?: number;
    annual?: number;
    display: string;
  };
  aiMessagesPerDay: number | "unlimited";
  projectsAllowed: number | "unlimited";
  blueprintsAllowed: number | "unlimited";
  features: string[];
  highlight?: string;
  badge?: string;
  color: string;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    name: "Free",
    price: { monthly: 0, display: "₹0/month" },
    aiMessagesPerDay: 3,
    projectsAllowed: 3,
    blueprintsAllowed: 2,
    color: "gray",
    features: [
      "3 AI messages per day",
      "Up to 3 projects",
      "Blueprint library access (read only)",
      "Component inventory (10 items)",
      "Basic IDE",
    ],
  },
  student_pro: {
    id: "student_pro",
    name: "Student Pro",
    price: { monthly: 299, semester: 999, display: "₹299/month" },
    aiMessagesPerDay: 50,
    projectsAllowed: "unlimited",
    blueprintsAllowed: "unlimited",
    color: "primary",
    badge: "Most Popular",
    highlight: "Best for students",
    features: [
      "50 AI messages per day",
      "Unlimited projects",
      "Publish & fork blueprints",
      "Unlimited component inventory",
      "AI assistant full access",
      "Assignment submission",
      "Priority Gemini responses",
      "Export & share projects",
    ],
  },
  maker_pro: {
    id: "maker_pro",
    name: "Maker Pro",
    price: { monthly: 499, display: "₹499/month" },
    aiMessagesPerDay: "unlimited",
    projectsAllowed: "unlimited",
    blueprintsAllowed: "unlimited",
    color: "accent",
    highlight: "For serious makers",
    features: [
      "Unlimited AI messages",
      "Unlimited projects",
      "Early access to new features",
      "All Student Pro features",
      "AI code review & optimization",
      "Advanced component analytics",
      "Priority support",
    ],
  },
  college_lab: {
    id: "college_lab",
    name: "College Lab",
    price: { monthly: 0, display: "Contact us" },
    aiMessagesPerDay: "unlimited",
    projectsAllowed: "unlimited",
    blueprintsAllowed: "unlimited",
    color: "purple",
    highlight: "For institutions",
    features: [
      "Everything in Maker Pro",
      "Professor dashboard",
      "Assignment management",
      "Student progress analytics",
      "Bulk student onboarding",
      "Custom branding",
      "Dedicated support",
      "SLA guarantees",
    ],
  },
};

export function canSendAIMessage(plan: PlanId, usedToday: number): boolean {
  const limits = PLANS[plan];
  if (limits.aiMessagesPerDay === "unlimited") return true;
  return usedToday < limits.aiMessagesPerDay;
}

export function canCreateProject(plan: PlanId, existingCount: number): boolean {
  const limits = PLANS[plan];
  if (limits.projectsAllowed === "unlimited") return true;
  return existingCount < limits.projectsAllowed;
}

export function isProPlan(plan: PlanId | string | undefined): boolean {
  return plan === "student_pro" || plan === "maker_pro" || plan === "college_lab";
}

export function getPlanName(plan: PlanId | string | undefined): string {
  return PLANS[plan as PlanId]?.name ?? "Free";
}

export function getAILimit(plan: PlanId | string | undefined): number {
  const limits = PLANS[plan as PlanId] ?? PLANS.free;
  if (limits.aiMessagesPerDay === "unlimited") return -1;
  return limits.aiMessagesPerDay as number;
}
