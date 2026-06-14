import { authFetch } from "@/lib/supabase";

interface UseCodePushParams {
  buildPlan: {
    steps: Array<{
      stepNumber: number;
      code: { content: string; highlightLines?: number[]; filename?: string };
      libraries?: Array<{ name: string; installName: string; purpose: string; isNew: boolean }>;
    }>;
  } | null;
  setIdeCode: (code: string) => void;
  setNewHighlightLines: (lines: number[]) => void;
  setLibraries: React.Dispatch<React.SetStateAction<Array<{ name: string; installName: string; purpose: string; isNew: boolean }>>>;
  setCompletedSteps: React.Dispatch<React.SetStateAction<Set<number>>>;
  setCurrentStepIndex: (index: number) => void;
  projectId: string;
}

export function useCodePush({
  buildPlan,
  setIdeCode,
  setNewHighlightLines,
  setLibraries,
  setCompletedSteps,
  setCurrentStepIndex,
  projectId,
}: UseCodePushParams) {
  async function completeStep(stepNumber: number, instructionChecks: Record<string, boolean[]>) {
    if (!buildPlan) return null;

    const step = buildPlan.steps.find((s) => s.stepNumber === stepNumber);
    if (!step) return null;

    const newCode = step.code.content;
    const highlightLines = step.code.highlightLines ?? [];

    setIdeCode(newCode);
    setNewHighlightLines(highlightLines);

    setTimeout(() => setNewHighlightLines([]), 2500);

    const newLibraries = (step.libraries ?? []).filter((lib) => lib.isNew);
    setLibraries((prev) => {
      const existingNames = prev.map((l) => l.name);
      const toAdd = newLibraries.filter((l) => !existingNames.includes(l.name));
      const updated = prev.map((l) =>
        newLibraries.find((n) => n.name === l.name) ? { ...l, isNew: true } : { ...l, isNew: false }
      );
      return [...updated, ...toAdd];
    });

    setCompletedSteps((prev) => new Set([...prev, stepNumber]));
    setCurrentStepIndex(stepNumber);

    await saveProgress({ projectId, stepNumber, code: newCode, instructionChecks });

    return {
      success: true,
      newCode,
      highlightLines,
      newLibraries,
    };
  }

  async function saveProgress({
    projectId,
    stepNumber,
    code,
    instructionChecks,
  }: {
    projectId: string;
    stepNumber: number;
    code: string;
    instructionChecks: Record<string, boolean[]>;
  }) {
    try {
      await authFetch("/api/projects/complete-step", {
        method: "POST",
        body: JSON.stringify({ projectId, stepNumber, ideCode: code, instructionChecks }),
      });
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  }

  return { completeStep };
}
