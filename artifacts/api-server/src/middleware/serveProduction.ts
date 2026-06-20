import path from "path";
import { fileURLToPath } from "url";
import express, { type Express, type Request, type Response } from "express";
import fs from "fs";

export function serveProductionBuild(app: Express): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const clientBuildPath = path.resolve(__dirname, "../../../../nexora/dist");

  if (!fs.existsSync(clientBuildPath)) {
    console.warn("Frontend build not found at:", clientBuildPath);
    return;
  }

  console.log("Serving frontend from:", clientBuildPath);

  app.use(
    express.static(clientBuildPath, {
      maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
      etag: true,
      index: false,
    }),
  );

  app.get("/{*splat}", (req: Request, res: Response) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "API route not found" });
      return;
    }
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}
