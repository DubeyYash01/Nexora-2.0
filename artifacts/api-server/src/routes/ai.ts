import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import { getAuthClient } from "../lib/supabaseAdmin";
import { groq } from "../lib/groq";

const router = Router();

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
8. NEVER mention "Arduino IDE". Users are in Nexora's built-in IDE. Say "the code is already in your Nexora IDE above" or "use the Copy button to copy the code".

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

  const db = getAuthClient(req.token!);

  const { data: usageRow } = await db
    .from("usage_tracking")
    .select("ai_messages_today, ai_messages_reset_at")
    .eq("user_id", req.userId!)
    .single();

  const { data: profileRow } = await db
    .from("profiles")
    .select("plan")
    .eq("id", req.userId!)
    .single();

  const plan = profileRow?.plan ?? "free";
  const planLimits: Record<string, number> = { free: 3, student_pro: 50, maker_pro: -1, college_lab: -1 };
  const limit = planLimits[plan] ?? 3;

  if (limit !== -1 && usageRow) {
    const resetAt = usageRow.ai_messages_reset_at ? new Date(usageRow.ai_messages_reset_at) : new Date(0);
    const now = new Date();
    const isNewDay =
      now.getFullYear() !== resetAt.getFullYear() ||
      now.getMonth() !== resetAt.getMonth() ||
      now.getDate() !== resetAt.getDate();

    let todayCount = usageRow.ai_messages_today ?? 0;
    if (isNewDay) {
      todayCount = 0;
      await db
        .from("usage_tracking")
        .update({ ai_messages_today: 0, ai_messages_reset_at: now.toISOString() })
        .eq("user_id", req.userId!);
    }

    if (todayCount >= limit) {
      res.status(429).json({
        error: `Daily AI message limit reached (${limit}/day on ${plan} plan). Upgrade for more messages.`,
        rateLimited: true,
        limit,
        used: todayCount,
      });
      return;
    }

    await db
      .from("usage_tracking")
      .update({ ai_messages_today: todayCount + 1, last_updated: new Date().toISOString() })
      .eq("user_id", req.userId!);
  }

  const systemWithContext = projectContext
    ? `${AI_SYSTEM_PROMPT}\n\n${projectContext}`
    : AI_SYSTEM_PROMPT;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemWithContext },
  ];

  if (conversationHistory?.length) {
    conversationHistory.slice(-10).forEach((m) => {
      messages.push({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      });
    });
  }

  messages.push({ role: "user", content: message });

  let responseText: string;
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });
    responseText = completion.choices[0]?.message?.content || "";
  } catch (err) {
    logger.error({ err }, "Groq AI chat failed");
    res.status(500).json({ error: "AI failed to respond. Please try again." });
    return;
  }

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

    const { data: existing } = await db
      .from("ai_conversations")
      .select("id, messages")
      .eq("project_id", projectId)
      .eq("user_id", req.userId!)
      .single();

    if (existing) {
      const msgs = (existing.messages as object[]) ?? [];
      await db
        .from("ai_conversations")
        .update({ messages: [...msgs, userMsg, asstMsg], updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await db.from("ai_conversations").insert({
        project_id: projectId,
        user_id: req.userId!,
        messages: [userMsg, asstMsg],
      });
    }
  }

  const { data: updatedUsage } = await db
    .from("usage_tracking")
    .select("ai_messages_today")
    .eq("user_id", req.userId!)
    .single();

  const remaining = limit === -1 ? -1 : Math.max(0, limit - (updatedUsage?.ai_messages_today ?? 0));
  res.json({ response: responseText, messageId: msgId, remaining, limit });
});

router.post("/ai/rate-check", verifyToken, async (req: AuthRequest, res) => {
  const db = getAuthClient(req.token!);

  const { data: usageRow } = await db
    .from("usage_tracking")
    .select("ai_messages_today, ai_messages_reset_at")
    .eq("user_id", req.userId!)
    .single();

  const { data: profileRow } = await db
    .from("profiles")
    .select("plan")
    .eq("id", req.userId!)
    .single();

  const plan = profileRow?.plan ?? "free";
  const planLimits: Record<string, number> = { free: 3, student_pro: 50, maker_pro: -1, college_lab: -1 };
  const limit = planLimits[plan] ?? 3;

  let todayCount = usageRow?.ai_messages_today ?? 0;
  const resetAt = usageRow?.ai_messages_reset_at ? new Date(usageRow.ai_messages_reset_at) : new Date(0);
  const now = new Date();
  const isNewDay =
    now.getFullYear() !== resetAt.getFullYear() ||
    now.getMonth() !== resetAt.getMonth() ||
    now.getDate() !== resetAt.getDate();
  if (isNewDay) todayCount = 0;

  const allowed = limit === -1 || todayCount < limit;
  const remaining = limit === -1 ? -1 : Math.max(0, limit - todayCount);

  res.json({ allowed, remaining, limit, used: todayCount, plan });
});

router.get("/ai/conversation/:projectId", verifyToken, async (req: AuthRequest, res) => {
  const { projectId } = req.params;
  const db = getAuthClient(req.token!);

  const { data } = await db
    .from("ai_conversations")
    .select("messages")
    .eq("project_id", projectId)
    .eq("user_id", req.userId!)
    .single();

  res.json({ messages: data?.messages ?? [] });
});

router.delete("/ai/conversation/:projectId", verifyToken, async (req: AuthRequest, res) => {
  const { projectId } = req.params;
  const db = getAuthClient(req.token!);

  await db
    .from("ai_conversations")
    .update({ messages: [], updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("user_id", req.userId!);

  res.json({ success: true });
});

router.post("/ai/feedback", verifyToken, async (req: AuthRequest, res) => {
  const { messageId, projectId, feedback } = req.body as {
    messageId: string;
    projectId: string;
    feedback: "helpful" | "not_helpful";
  };

  const db = getAuthClient(req.token!);
  await db.from("ai_feedback").insert({
    message_id: messageId,
    project_id: projectId,
    user_id: req.userId!,
    feedback,
  });

  res.json({ success: true });
});

router.post("/ai/validate-wiring", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { connections, components, platform } = req.body as {
      connections: Array<{ from: { component: string; pin: string }; to: { component: string; pin: string } }>;
      components: string[];
      platform: string;
    };

    const systemPrompt = `You are a hardware safety validator for IoT projects. 
Analyze wiring connections and identify dangerous mistakes.
Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Validate these wiring connections for a ${platform} project.
Components in use: ${components.join(", ")}
Connections:
${connections.map((c, i) => `${i + 1}. ${c.from.component} ${c.from.pin} → ${c.to.component} ${c.to.pin}`).join("\n")}

Check for: reversed power/ground, wrong voltage levels (5V to 3.3V sensors), missing pull-up resistors, pin conflicts.

Return: { "safe": boolean, "warnings": ["..."], "critical": ["..."] }`;

    const raw = await callGroq(userPrompt, systemPrompt, 400);
    let result = { safe: true, warnings: [] as string[], critical: [] as string[] };
    try {
      result = JSON.parse(raw.trim()) as typeof result;
    } catch { /* return safe=true on parse fail */ }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "validate-wiring error");
    res.json({ safe: true, warnings: [], critical: [] });
  }
});

export default router;
