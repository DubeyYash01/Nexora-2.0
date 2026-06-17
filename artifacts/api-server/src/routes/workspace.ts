import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import { getAuthClient } from "../lib/supabaseAdmin";
import { callGroq, parseGroqJSON } from "../lib/groq";

const router = Router();

const BUILD_PLAN_SYSTEM_PROMPT = `You are Nexora's IoT build plan generator.
Your job is to create a detailed, step-by-step build plan for an IoT project.

CRITICAL RULES FOR CODE GENERATION:
1. Generate code for Arduino/ESP32 platform using C++ (Arduino framework)
2. Each step must have its own code block
3. Code must be ADDITIVE — each step's code builds on top of all previous steps
4. Step 1 code is always the foundation (includes all includes, defines, setup() and loop() skeleton)
5. Each subsequent step ADDS to the codebase — never removes or contradicts previous steps
6. By the final step, all code combined forms a complete working program
7. Write code as if it will be copy-pasted into Arduino IDE and uploaded directly
8. Include helpful inline comments in code
9. Libraries must be real, installable Arduino libraries

Return ONLY a valid JSON object.
NO markdown. NO explanation. NO code fences.
Just raw JSON.

Return this exact structure:
{
  "buildPlan": {
    "totalSteps": 5,
    "estimatedTotalTime": "2-3 hours",
    "platform": "ESP32",
    "programmingLanguage": "C++ (Arduino)",
    "steps": [
      {
        "stepNumber": 1,
        "title": "step title",
        "objective": "what the user achieves in this step",
        "description": "detailed explanation of what to do and why",
        "duration": "20 minutes",
        "phase": "Setup",
        "whatYouLearn": "key concept this step teaches",
        "instructions": ["instruction 1", "instruction 2", "instruction 3"],
        "wiringNotes": "important wiring notes or null",
        "safetyWarnings": [],
        "code": {
          "filename": "main.ino",
          "language": "cpp",
          "content": "full cumulative code up to and including this step. Use \\n for newlines.",
          "newLinesAdded": "description of what code was added in this step",
          "highlightLines": [1, 2, 3]
        },
        "libraries": [
          {
            "name": "Library Name",
            "installName": "exact name for Arduino Library Manager",
            "purpose": "what this library does in one sentence",
            "isNew": true
          }
        ],
        "verificationCheck": "how user knows this step worked correctly"
      }
    ]
  }
}`;

async function callGroqForPlan(
  projectTitle: string,
  projectSummary: string,
  components: string[],
  skillLevel: string
): Promise<object> {
  const userPrompt = `Generate a complete build plan for this IoT project.
Project: ${projectTitle}
Description: ${projectSummary}
Components: ${components.join(", ")}
Skill Level: ${skillLevel}
Platform: Choose the most appropriate platform based on the components (ESP32 preferred for WiFi/BT projects, Arduino Uno for simpler projects).

Remember: code must be cumulative — each step contains ALL code up to that point.`;

  const raw = await callGroq(userPrompt, BUILD_PLAN_SYSTEM_PROMPT, 4000);
  try {
    return parseGroqJSON(raw) as object;
  } catch {
    throw new Error("Invalid JSON from AI for build plan");
  }
}

router.post("/projects/generate-plan", verifyToken, async (req: AuthRequest, res) => {
  const { projectId, projectTitle, projectSummary, components, skillLevel } = req.body as {
    projectId: string;
    projectTitle: string;
    projectSummary: string;
    components: string[];
    skillLevel: string;
  };

  if (!projectId || !projectTitle) {
    res.status(400).json({ error: "projectId and projectTitle required" });
    return;
  }

  let planData: object;
  try {
    planData = await callGroqForPlan(
      projectTitle,
      projectSummary ?? "",
      components ?? [],
      skillLevel ?? "Beginner"
    );
  } catch (firstErr) {
    logger.warn({ err: firstErr }, "Groq build plan first attempt failed, retrying...");
    try {
      planData = await callGroqForPlan(
        projectTitle,
        projectSummary ?? "",
        components ?? [],
        skillLevel ?? "Beginner"
      );
    } catch (retryErr) {
      logger.error({ err: retryErr }, "Groq build plan retry failed");
      res.status(500).json({ error: "Failed to generate build plan. Please try again." });
      return;
    }
  }

  const db = getAuthClient(req.token!);
  await db
    .from("projects")
    .update({ build_plan: planData, status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("user_id", req.userId!);

  res.json({ buildPlan: (planData as Record<string, unknown>).buildPlan });
});

router.get("/projects/workspace/:projectId", verifyToken, async (req: AuthRequest, res) => {
  const { projectId } = req.params;

  const db = getAuthClient(req.token!);
  const { data: project, error } = await db
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", req.userId!)
    .single();

  if (error || !project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({ project });
});

router.post("/projects/complete-step", verifyToken, async (req: AuthRequest, res) => {
  const { projectId, stepNumber, instructionChecks } = req.body as {
    projectId: string;
    stepNumber: number;
    instructionChecks: Record<string, boolean[]>;
  };

  if (!projectId || stepNumber == null) {
    res.status(400).json({ error: "projectId and stepNumber required" });
    return;
  }

  const db = getAuthClient(req.token!);
  const { data: project, error } = await db
    .from("projects")
    .select("completed_steps, build_plan")
    .eq("id", projectId)
    .eq("user_id", req.userId!)
    .single();

  if (error || !project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const existing: number[] = (project.completed_steps as number[]) ?? [];
  const completedSteps = Array.from(new Set([...existing, stepNumber]));

  await db
    .from("projects")
    .update({
      current_step: stepNumber + 1,
      completed_steps: completedSteps,
      instruction_checks: instructionChecks,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", req.userId!);

  const buildPlan = project.build_plan as { buildPlan?: { totalSteps?: number } } | null;
  const totalSteps = buildPlan?.buildPlan?.totalSteps ?? 0;
  const nextStep = stepNumber < totalSteps ? stepNumber + 1 : null;

  res.json({ success: true, nextStep });
});

router.post("/projects/save-ide-code", verifyToken, async (req: AuthRequest, res) => {
  const { projectId, code } = req.body as { projectId: string; code: string };

  if (!projectId) {
    res.status(400).json({ error: "projectId required" });
    return;
  }

  const db = getAuthClient(req.token!);
  await db
    .from("projects")
    .update({ ide_code: code, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("user_id", req.userId!);

  res.json({ success: true });
});

export default router;
