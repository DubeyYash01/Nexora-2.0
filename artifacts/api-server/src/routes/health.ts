import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { isAuthenticated } from "../lib/replitAuth";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/auth/user", isAuthenticated, async (req: any, res) => {
  try {
    const claims = req.user?.claims;
    res.json({
      id: claims?.sub,
      email: claims?.email,
      firstName: claims?.first_name,
      lastName: claims?.last_name,
      profileImageUrl: claims?.profile_image_url,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

export default router;
