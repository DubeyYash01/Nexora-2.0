import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";

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
  const { data, error } = await supabaseAdmin
    .from("user_components")
    .select("*")
    .eq("user_id", req.userId!)
    .order("added_at", { ascending: false });

  if (error) {
    logger.error({ err: error }, "Failed to fetch components");
    res.status(500).json({ error: "Failed to fetch components" });
    return;
  }

  res.json({ components: data ?? [] });
});

// GET /api/components/count
router.get("/components/count", verifyToken, async (req: AuthRequest, res) => {
  const { count, error } = await supabaseAdmin
    .from("user_components")
    .select("*", { count: "exact", head: true })
    .eq("user_id", req.userId!);

  if (error) {
    res.status(500).json({ error: "Failed to count components" });
    return;
  }

  res.json({ count: count ?? 0 });
});

// POST /api/components
router.post("/components", verifyToken, async (req: AuthRequest, res) => {
  const { name, category, quantity, condition, purchasePrice, notes } = req.body;

  if (!name || !category || !condition) {
    res.status(400).json({ error: "name, category, and condition are required" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("user_components")
    .insert({
      user_id: req.userId!,
      name,
      category,
      quantity: quantity ?? 1,
      condition,
      purchase_price: purchasePrice ?? null,
      notes: notes ?? null,
      added_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    logger.error({ err: error }, "Failed to add component");
    res.status(500).json({ error: "Failed to add component" });
    return;
  }

  res.json({ component: data });
});

// PUT /api/components/:id
router.put("/components/:id", verifyToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, category, quantity, condition, purchasePrice, notes } = req.body;

  const { data, error } = await supabaseAdmin
    .from("user_components")
    .update({
      name,
      category,
      quantity,
      condition,
      purchase_price: purchasePrice ?? null,
      notes: notes ?? null,
    })
    .eq("id", id)
    .eq("user_id", req.userId!)
    .select()
    .single();

  if (error || !data) {
    logger.error({ err: error }, "Failed to update component");
    res.status(500).json({ error: "Failed to update component" });
    return;
  }

  res.json({ component: data });
});

// DELETE /api/components/:id
router.delete("/components/:id", verifyToken, async (req: AuthRequest, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from("user_components")
    .delete()
    .eq("id", id)
    .eq("user_id", req.userId!);

  if (error) {
    logger.error({ err: error }, "Failed to delete component");
    res.status(500).json({ error: "Failed to delete component" });
    return;
  }

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
        {
          "name": "component name",
          "estimatedCost": number in INR,
          "optional": boolean,
          "reason": "why needed"
        }
      ],
      "totalExtraCost": number in INR,
      "estimatedTime": "e.g. 1-2 days",
      "learningValue": "what skill this project teaches"
    }
  ]
}

Sort by matchScore descending. Return exactly 6 suggestions. Prioritize projects where missingComponents is empty or has only optional items.`;

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

Given a list of components to purchase, provide shopping guidance optimized for India (online stores: Robu.in, Electronicscomp.com, Amazon.in, Flipkart, Robocraze, Fabtolab).

Return ONLY valid JSON:
{
  "shoppingList": [
    {
      "componentName": "name",
      "quantity": number,
      "estimatedPrice": number in INR,
      "priceRange": { "min": number, "max": number },
      "recommendedStore": "store name",
      "searchTerm": "exact search term to use on that store",
      "buyingTip": "one tip for buying this component in India",
      "commonMistake": "most common wrong purchase to avoid",
      "alternatives": [
        {
          "name": "alternative name",
          "price": number,
          "tradeoff": "what you gain/lose"
        }
      ]
    }
  ],
  "totalEstimate": number,
  "bulkTip": "money saving tip for buying all these together",
  "priorityOrder": ["component names in order to buy first if on tight budget"]
}`;

  const userMessage = `Generate shopping list for these components:\n${componentList}\nStudent budget context: trying to minimize cost.\nLocation: India.`;

  try {
    const result = await callGeminiJSON(`${systemPrompt}\n\n${userMessage}`);
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
User's available components: ${inventoryList || "none specified"}.
${projectContext ? `Project context: ${projectContext}` : ""}

Return JSON only:
{
  "substitutes": [
    {
      "name": "substitute name",
      "compatibility": "Drop-in replacement|Minor code changes|Significant changes",
      "codeChanges": "what changes needed",
      "tradeoffs": "what you gain or lose",
      "available": boolean
    }
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
