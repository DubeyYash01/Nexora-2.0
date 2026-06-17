import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import { getAuthClient } from "../lib/supabaseAdmin";
import { callGroq, parseGroqJSON } from "../lib/groq";

const router = Router();

const SYSTEM_PROMPT = `You are Nexora's IoT project analysis AI. 
Your job is to analyze an IoT project idea and return a structured JSON response.

Analyze the given idea and return ONLY a valid JSON object with NO markdown, NO explanation, NO code fences. Just raw JSON.

Return this exact structure:
{
  "projectTitle": "smart concise project name",
  "projectSummary": "2-3 sentence summary of what this project does",
  "howItWorks": "simple explanation of the working principle in 3-4 sentences",
  "estimatedComplexity": "Beginner|Intermediate|Advanced",
  "estimatedCost": {
    "min": 0,
    "max": 0,
    "currency": "INR"
  },
  "estimatedTime": "e.g. 1-2 weeks",
  "components": [
    {
      "id": "unique_id",
      "name": "component name",
      "type": "microcontroller|sensor|actuator|display|communication|power|other",
      "purpose": "why this component is needed in one sentence",
      "estimatedCost": 0,
      "isEssential": true,
      "alternatives": ["alternative 1", "alternative 2"]
    }
  ],
  "feasibility": {
    "costFeasibility": { "status": "good|moderate|high", "note": "one line explanation" },
    "complexityFeasibility": { "status": "good|moderate|high", "note": "one line explanation" },
    "availabilityFeasibility": { "status": "good|moderate|high", "note": "one line explanation" },
    "timelineFeasibility": { "status": "good|moderate|high", "note": "one line explanation" }
  },
  "risks": ["risk 1 in one sentence", "risk 2 in one sentence"],
  "tips": ["helpful tip 1 for this skill level", "helpful tip 2"]
}`;

async function analyzeWithGroq(idea: string, skillLevel: string): Promise<object> {
  const userPrompt = `Analyze this IoT project idea for a ${skillLevel} level user: ${idea}`;
  const raw = await callGroq(userPrompt, SYSTEM_PROMPT, 2000);
  try {
    return parseGroqJSON(raw) as object;
  } catch {
    throw new Error("Invalid JSON from AI");
  }
}

router.post("/projects/analyze", verifyToken, async (req: AuthRequest, res) => {
  const { idea, skillLevel } = req.body;

  if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
    res.status(400).json({ error: "Idea must be at least 10 characters" });
    return;
  }

  let analysis: object;
  try {
    analysis = await analyzeWithGroq(idea.trim(), skillLevel ?? "Beginner");
  } catch (firstErr) {
    logger.warn({ err: firstErr }, "Groq analysis first attempt failed, retrying...");
    try {
      analysis = await analyzeWithGroq(idea.trim(), skillLevel ?? "Beginner");
    } catch (retryErr) {
      logger.error({ err: retryErr }, "Groq analysis retry also failed");
      res.status(500).json({ error: "AI analysis failed. Please try again." });
      return;
    }
  }

  const analysisObj = analysis as Record<string, unknown>;
  const projectTitle = (typeof analysisObj.projectTitle === "string" ? analysisObj.projectTitle : null) ?? "Untitled Project";

  const db = getAuthClient(req.token!);
  const { data: project, error } = await db
    .from("projects")
    .insert({
      user_id: req.userId!,
      title: projectTitle,
      description: (analysisObj.projectSummary as string) ?? "",
      idea_input: idea.trim(),
      status: "draft",
      current_step: 1,
      ai_analysis: analysis,
    })
    .select()
    .single();

  if (error || !project) {
    logger.error({ error }, "Failed to create project after analysis");
    res.status(500).json({ error: "Failed to save project" });
    return;
  }

  res.json({ projectId: project.id, analysis });
});

router.post("/projects/save-components", verifyToken, async (req: AuthRequest, res) => {
  const { projectId, components } = req.body;

  if (!projectId || !Array.isArray(components)) {
    res.status(400).json({ error: "projectId and components array required" });
    return;
  }

  const db = getAuthClient(req.token!);
  await db
    .from("projects")
    .update({ components: { list: components }, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("user_id", req.userId!);

  res.json({ success: true });
});

export default router;
