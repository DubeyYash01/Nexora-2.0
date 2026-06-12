import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import { db } from "@workspace/db";
import { userComponents } from "@workspace/db/schema";
import { and, eq, desc, count } from "drizzle-orm";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

async function callGeminiJSON(prompt: string): Promise<unknown> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Invalid JSON from Gemini");
  }
}

// GET /api/components/me
router.get("/components/me", verifyToken, async (req: AuthRequest, res) => {
  const data = await db
    .select()
    .from(userComponents)
    .where(eq(userComponents.userId, req.userId!))
    .orderBy(desc(userComponents.addedAt));
  res.json({ components: data });
});

// GET /api/components/count
router.get("/components/count", verifyToken, async (req: AuthRequest, res) => {
  const [result] = await db
    .select({ count: count() })
    .from(userComponents)
    .where(eq(userComponents.userId, req.userId!));
  res.json({ count: result?.count ?? 0 });
});

// POST /api/components
router.post("/components", verifyToken, async (req: AuthRequest, res) => {
  const { name, category, quantity, condition, purchasePrice, notes } = req.body;

  if (!name || !category || !condition) {
    res.status(400).json({ error: "name, category, and condition are required" });
    return;
  }

  const [data] = await db
    .insert(userComponents)
    .values({ id: crypto.randomUUID(), userId: req.userId!, name, category, quantity: quantity ?? 1, condition, purchasePrice: purchasePrice ?? null, notes: notes ?? null })
    .returning();

  if (!data) {
    res.status(500).json({ error: "Failed to add component" });
    return;
  }

  res.json({ component: data });
});

// PUT /api/components/:id
router.put("/components/:id", verifyToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, category, quantity, condition, purchasePrice, notes } = req.body;

  const [data] = await db
    .update(userComponents)
    .set({ name, category, quantity, condition, purchasePrice: purchasePrice ?? null, notes: notes ?? null })
    .where(and(eq(userComponents.id, id), eq(userComponents.userId, req.userId!)))
    .returning();

  if (!data) {
    res.status(404).json({ error: "Component not found" });
    return;
  }

  res.json({ component: data });
});

// DELETE /api/components/:id
router.delete("/components/:id", verifyToken, async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db
    .delete(userComponents)
    .where(and(eq(userComponents.id, id), eq(userComponents.userId, req.userId!)));

  res.json({ success: true });
});

// POST /api/components/suggest-projects
router.post("/components/suggest-projects", verifyToken, async (req: AuthRequest, res) => {
  const { components, skillLevel } = req.body;

  if (!Array.isArray(components) || components.length === 0) {
    res.status(400).json({ error: "components array required" });
    return;
  }

  const inventoryList = components
    .map((c: { name: string; quantity: number }) => `- ${c.name} (x${c.quantity})`)
    .join("\n");

  const systemPrompt = `You are Nexora's project suggestion AI.
Given a user's component inventory, suggest IoT projects they can build.

Return ONLY valid JSON. No markdown. No explanation. No code fences.

{
  "suggestions": [
    {
      "title": "project name",
      "description": "what it does in 2 sentences",
      "difficulty": "Beginner|Intermediate|Advanced",
      "matchScore": number from 0 to 100,
      "matchReason": "why these components work for this project",
      "requiredComponents": ["component names from user inventory"],
      "missingComponents": [
        { "name": "component name", "estimatedCost": number, "optional": boolean, "reason": "why needed" }
      ],
      "totalExtraCost": number,
      "estimatedTime": "e.g. 1-2 days",
      "learningValue": "what skill this project teaches"
    }
  ]
}

Sort by matchScore descending. Return exactly 6 suggestions.`;

  const userMessage = `Suggest IoT projects for this inventory:\n${inventoryList}\nUser skill level: ${skillLevel ?? "Beginner"}`;

  try {
    const result = await callGeminiJSON(`${systemPrompt}\n\n${userMessage}`);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get project suggestions");
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

// POST /api/components/shopping-list
router.post("/components/shopping-list", verifyToken, async (req: AuthRequest, res) => {
  const { components } = req.body;

  if (!Array.isArray(components) || components.length === 0) {
    res.status(400).json({ error: "components array required" });
    return;
  }

  const componentList = components
    .map((c: { name: string; quantity: number }) => `- ${c.name} (qty: ${c.quantity})`)
    .join("\n");

  const systemPrompt = `You are a helpful IoT shopping assistant for Indian students and makers.
Given components to purchase, provide shopping guidance for India (Robu.in, Amazon.in, Flipkart, Robocraze).

Return ONLY valid JSON:
{
  "shoppingList": [
    { "componentName": "name", "quantity": number, "estimatedPrice": number, "priceRange": { "min": number, "max": number }, "recommendedStore": "store", "searchTerm": "search term", "buyingTip": "tip", "commonMistake": "mistake", "alternatives": [{ "name": "name", "price": number, "tradeoff": "tradeoff" }] }
  ],
  "totalEstimate": number,
  "bulkTip": "saving tip",
  "priorityOrder": ["component names"]
}`;

  try {
    const result = await callGeminiJSON(`${systemPrompt}\n\nGenerate shopping list for:\n${componentList}`);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to generate shopping list");
    res.status(500).json({ error: "Failed to generate shopping list" });
  }
});

// POST /api/components/substitutions
router.post("/components/substitutions", verifyToken, async (req: AuthRequest, res) => {
  const { componentName, platform, userInventory, projectContext } = req.body;

  if (!componentName) {
    res.status(400).json({ error: "componentName required" });
    return;
  }

  const inventoryList = Array.isArray(userInventory)
    ? userInventory.map((c: { name: string }) => c.name).join(", ")
    : "";

  const prompt = `For an IoT project using ${platform ?? "ESP32"}, suggest 2-3 substitutes for ${componentName}.
User's available components: ${inventoryList || "none"}.
${projectContext ? `Project context: ${projectContext}` : ""}

Return JSON only:
{
  "substitutes": [
    { "name": "name", "compatibility": "Drop-in replacement|Minor code changes|Significant changes", "codeChanges": "what changes", "tradeoffs": "gain/lose", "available": boolean }
  ]
}`;

  try {
    const result = await callGeminiJSON(prompt);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get substitutions");
    res.status(500).json({ error: "Failed to get substitutions" });
  }
});

export default router;
