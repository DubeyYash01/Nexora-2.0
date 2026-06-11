interface AiContextProject {
  id: string;
  title: string;
  ai_analysis: {
    projectSummary?: string;
    skillLevel?: string;
    components?: Array<{ name: string; purpose: string }>;
  } | null;
  build_plan: {
    buildPlan: {
      platform: string;
      programmingLanguage: string;
      totalSteps: number;
      steps: Array<{
        stepNumber: number;
        title: string;
        phase: string;
        objective: string;
        instructions: string[];
      }>;
    };
  } | null;
  components: { list?: Array<{ name: string; purpose: string }> } | null;
}

interface AiContextStep {
  stepNumber: number;
  title: string;
  phase: string;
  objective: string;
  instructions: string[];
}

export function buildProjectContext(
  project: AiContextProject,
  currentStep: number,
  ideCode: string,
  libraryNames: string[],
  completedSteps: number[]
): string {
  const analysis = project.ai_analysis;
  const bp = project.build_plan?.buildPlan;
  const allSteps = bp?.steps ?? [];

  const activeStep: AiContextStep | undefined = allSteps.find(
    (s) => s.stepNumber === currentStep
  );

  const componentsList = (
    project.components?.list ??
    analysis?.components ??
    []
  ) as Array<{ name: string; purpose: string }>;

  const remainingSteps = allSteps
    .filter((s) => !completedSteps.includes(s.stepNumber))
    .map((s) => `Step ${s.stepNumber}: ${s.title}`)
    .join(", ");

  const completedList = completedSteps.length
    ? completedSteps.map((n) => `Step ${n}`).join(", ")
    : "None yet";

  const codeSection = ideCode
    ? `\nCURRENT IDE CODE:\n\`\`\`cpp\n${ideCode}\n\`\`\``
    : "\nCURRENT IDE CODE: (no code written yet)";

  return `=== NEXORA PROJECT CONTEXT ===

PROJECT: ${project.title}
DESCRIPTION: ${analysis?.projectSummary ?? "No description"}
PLATFORM: ${bp?.platform ?? "ESP32"}
LANGUAGE: ${bp?.programmingLanguage ?? "C++ (Arduino)"}
SKILL LEVEL: ${analysis?.skillLevel ?? "Beginner"}

COMPONENTS IN USE:
${componentsList.map((c) => `- ${c.name}: ${c.purpose}`).join("\n") || "- No components listed"}

CURRENT BUILD STEP: Step ${currentStep} of ${bp?.totalSteps ?? allSteps.length}
STEP TITLE: ${activeStep?.title ?? "Unknown"}
STEP PHASE: ${activeStep?.phase ?? "Unknown"}
STEP OBJECTIVE: ${activeStep?.objective ?? ""}

CURRENT STEP INSTRUCTIONS:
${activeStep?.instructions?.map((instr, i) => `${i + 1}. ${instr}`).join("\n") ?? "No instructions"}
${codeSection}

LIBRARIES INSTALLED SO FAR:
${libraryNames.length ? libraryNames.join(", ") : "None yet"}

COMPLETED STEPS: ${completedList}
REMAINING STEPS: ${remainingSteps || "All complete!"}
=== END CONTEXT ===`;
}

export const PHASE_CHIPS: Record<string, string[]> = {
  Setup: [
    "What do I need to prepare?",
    "Explain the project overview",
    "What tools do I need?",
  ],
  Wiring: [
    "Is this wiring safe?",
    "Explain the circuit connections",
    "What if I don't have this component?",
    "Describe the wiring for this step",
  ],
  Coding: [
    "Explain the code for this step",
    "Why do I need this library?",
    "Add comments to my code",
    "How does this function work?",
  ],
  Testing: [
    "My sensor isn't reading correctly",
    "How do I use Serial Monitor?",
    "What values should I expect?",
    "My ESP32 isn't connecting",
  ],
  Integration: [
    "How do I combine these features?",
    "Debug this integration",
    "Optimize my code",
  ],
  Deployment: [
    "How do I upload to my device?",
    "Make my device run on battery",
    "How do I make it run on startup?",
  ],
};

export const DEFAULT_CHIPS = [
  "What should I do in this step?",
  "Explain my components",
  "What could go wrong?",
];
