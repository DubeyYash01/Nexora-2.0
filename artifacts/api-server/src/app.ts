import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    groqKey: !!process.env.GROQ_API_KEY,
    supabase: !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
    time: new Date().toISOString(),
  });
});

app.get("/api/test-groq", async (_req, res) => {
  try {
    const { callGroq } = await import("./lib/groq.js");
    const response = await callGroq("Say WORKING in exactly one word", null, 10);
    res.json({ success: true, response, model: "llama-3.3-70b-versatile" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

export default app;
