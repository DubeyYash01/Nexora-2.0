import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import compression from "compression";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { supabase } from "./lib/supabaseAdmin.js";

const app: Express = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// Compression
app.use(compression());

// CORS — allow Replit preview domains + configured frontend URL
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        !origin ||
        origin.includes(".replit.dev") ||
        origin.includes(".repl.co") ||
        origin.includes("localhost")
      ) {
        callback(null, true);
      } else {
        // Allow all for now — tighten after custom domain
        callback(null, true);
      }
    },
    credentials: true,
  }),
);

// Global rate limiter (200 req / 15 min per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

// Strict AI rate limiter (50 req / hour per IP)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: "AI rate limit reached. Please wait an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/ai", aiLimiter);
app.use("/api/projects/analyze", aiLimiter);
app.use("/api/projects/generate-plan", aiLimiter);

// Enhanced health check
app.get("/api/health", async (_req, res) => {
  const startTime = Date.now();

  const health: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
    services: {} as Record<string, unknown>,
  };

  const services = health.services as Record<string, unknown>;

  // Check Groq
  services.groq = {
    configured: !!process.env.GROQ_API_KEY,
    status: process.env.GROQ_API_KEY ? "ok" : "missing_key",
  };

  // Check Supabase connectivity (reuse existing client with WebSocket workaround)
  try {
    const { error } = await supabase.from("profiles").select("count").limit(1);
    services.database = {
      status: error ? "error" : "ok",
      error: error?.message,
    };
  } catch (err: unknown) {
    services.database = {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  health.responseTime = `${Date.now() - startTime}ms`;

  const statusCode =
    (services.database as Record<string, string>)?.status === "error"
      ? 503
      : 200;

  res.status(statusCode).json(health);
});

// Quick Groq connectivity test
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

// Request logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

export default app;
