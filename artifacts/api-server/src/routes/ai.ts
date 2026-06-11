import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const AI_SYSTEM_PROMPT = `You are Nexora AI — an expert IoT engineering assistant embedded inside the Nexora platform.

YOUR PERSONALITY:
- Encouraging and patient with beginners
- Technical and precise with advanced users
- Adapt your language to the user's skill level
- Never condescending, always supportive
- Concise but complete — no unnecessary padding

YOUR CAPABILITIES:
- Deep knowledge of ESP32, Arduino, sensors, actuators, IoT protocols
- Arduino C++ programming expert
- Circuit design and wiring guidance
- Debugging and error diagnosis
- Component substitution suggestions
- Library recommendations

CRITICAL RULES:
1. You ALWAYS have full project context. Never ask the user to re-explain their project.
2. When suggesting code: always use the SAME platform and libraries already in the project.
3. When explaining: match the user's skill level. Beginner = simple analogies, no jargon. Advanced = technical depth welcome.
4. Keep responses focused and actionable.
5. If suggesting code changes: show the specific lines to change, not the whole file.
6. For wiring questions: describe connections clearly (e.g. "Connect GPIO 4 on ESP32 to the DATA pin of the DHT22")
7. Never suggest components not in the user's component list unless explicitly asked.

FORMATTING RULES:
- Use **bold** for important terms
- Use \`inline code\` for variable names, pin names, function names
- Use code blocks with \`\`\`cpp for Arduino/C++ code
- Keep code blocks short and targeted — show only what changed
- Use numbered lists for step-by-step instructions
- Use bullet points for lists of options

When responding to ERROR DIAGNOSIS requests, always structure your response as:
🔍 **What went wrong:**
[simple explanation]

🛠️ **How to fix it:**
[numbered steps]

✅ **Corrected code:** (if applicable)
\`\`\`cpp
[corrected code]
\`\`\`

💡 **Pro tip:**
[one helpful tip to avoid this in future]`;

// In-memory rate limit store (per user, per hour)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const limit = 30;

  let entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + hourMs };
    rateLimitMap.set(userId, entry);
  }

  const remaining = Math.max(0, limit - entry.count);
  const resetIn = Math.ceil((entry.resetAt - now) / 60000);

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetIn };
  }
  entry.count++;
  return { allowed: true, remaining: remaining - 1, resetIn };
}

// POST /api/ai/chat
router.post("/ai/chat", verifyToken, async (req: AuthRequest, res) => {
  const { projectId, message, conversationHistory, projectContext, messageType } = req.body as {
    projectId: string;
    message: string;
    conversationHistory: Array<{ role: string; content: string }>;
    projectContext: string;
    messageType: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  // Rate limit check
  const rl = checkRateLimit(req.userId!);
  if (!rl.allowed) {
    res.status(429).json({
      error: `You've sent a lot of messages! Take a 5-minute break and come back. Free plan allows 30 messages/hour. Resets in ${rl.resetIn} minute(s).`,
      rateLimited: true,
    });
    return;
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const systemWithContext = projectContext
    ? `${AI_SYSTEM_PROMPT}\n\n${projectContext}`
    : AI_SYSTEM_PROMPT;

  // Build conversation parts for Gemini
  const historyParts = (conversationHistory ?? []).slice(-10).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let responseText: string;
  try {
    const chat = model.startChat({
      history: historyParts,
      systemInstruction: { role: "system", parts: [{ text: systemWithContext }] },
    });
    const result = await chat.sendMessage(message);
    responseText = result.response.text();
  } catch (err) {
    logger.error({ err }, "Gemini AI chat failed");
    res.status(500).json({ error: "AI failed to respond. Please try again." });
    return;
  }

  // Save to ai_conversations
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (projectId) {
    const userMsg = {
      id: `${msgId}_u`,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
      context: { messageType: messageType ?? "general" },
    };
    const asstMsg = {
      id: msgId,
      role: "assistant",
      content: responseText,
      timestamp: new Date().toISOString(),
      context: { messageType: messageType ?? "general" },
    };

    // Upsert conversation
    const { data: existing } = await supabaseAdmin
      .from("ai_conversations")
      .select("id, messages")
      .eq("project_id", projectId)
      .eq("user_id", req.userId!)
      .single();

    if (existing) {
      const msgs = (existing.messages as object[]) ?? [];
      await supabaseAdmin
        .from("ai_conversations")
        .update({
          messages: [...msgs, userMsg, asstMsg],
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("ai_conversations").insert({
        project_id: projectId,
        user_id: req.userId!,
        messages: [userMsg, asstMsg],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  res.json({ response: responseText, messageId: msgId, remaining: rl.remaining });
});

// POST /api/ai/rate-check
router.post("/ai/rate-check", verifyToken, async (req: AuthRequest, res) => {
  const rl = checkRateLimit(req.userId!);
  // undo the increment
  const entry = rateLimitMap.get(req.userId!);
  if (entry) entry.count = Math.max(0, entry.count - 1);
  res.json({ allowed: rl.allowed, remaining: rl.remaining, resetIn: rl.resetIn });
});

// GET /api/ai/conversation/:projectId
router.get("/ai/conversation/:projectId", verifyToken, async (req: AuthRequest, res) => {
  const { projectId } = req.params;

  const { data, error } = await supabaseAdmin
    .from("ai_conversations")
    .select("messages")
    .eq("project_id", projectId)
    .eq("user_id", req.userId!)
    .single();

  if (error || !data) {
    res.json({ messages: [] });
    return;
  }

  res.json({ messages: data.messages ?? [] });
});

// DELETE /api/ai/conversation/:projectId
router.delete("/ai/conversation/:projectId", verifyToken, async (req: AuthRequest, res) => {
  const { projectId } = req.params;

  await supabaseAdmin
    .from("ai_conversations")
    .update({ messages: [], updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("user_id", req.userId!);

  res.json({ success: true });
});

// POST /api/ai/feedback
router.post("/ai/feedback", verifyToken, async (req: AuthRequest, res) => {
  const { messageId, projectId, feedback } = req.body as {
    messageId: string;
    projectId: string;
    feedback: "helpful" | "not_helpful";
  };

  await supabaseAdmin.from("ai_feedback").insert({
    message_id: messageId,
    project_id: projectId,
    user_id: req.userId!,
    feedback,
    created_at: new Date().toISOString(),
  });

  res.json({ success: true });
});

export default router;
