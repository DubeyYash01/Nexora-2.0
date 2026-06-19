import { Router } from "express";
import { callGroq, parseGroqJSON } from "../lib/groq.js";

const router = Router();

router.post("/wiring/validate", async (req, res) => {
  try {
    const { connections, components, platform } = req.body;

    const systemPrompt = `You are an expert electronics engineer.
Validate these wiring connections for an IoT project and identify any dangerous or incorrect connections.

Return ONLY raw JSON:
{
  "safe": true,
  "critical": [
    {
      "connection": "description",
      "issue": "what is wrong",
      "risk": "what could happen",
      "fix": "how to fix it"
    }
  ],
  "warnings": [
    {
      "connection": "description",
      "issue": "potential issue",
      "suggestion": "recommendation"
    }
  ],
  "confirmed": [
    "confirmed safe connection 1"
  ]
}`;

    const userPrompt = `Platform: ${platform || "ESP32"}
Components: ${JSON.stringify(components)}
Connections to validate:
${JSON.stringify(connections, null, 2)}

Check for:
1. Power/ground reversals
2. Wrong voltage levels (5V vs 3.3V)
3. Missing resistors
4. Pin conflicts
5. Incorrect pin functions`;

    const raw = await callGroq(userPrompt, systemPrompt, 1000);
    const result = parseGroqJSON(raw);

    res.json({ success: true, ...(result as object) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: msg });
  }
});

export default router;
