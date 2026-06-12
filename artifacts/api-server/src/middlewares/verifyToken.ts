import type { Request, Response, NextFunction } from "express";
import { isAuthenticated } from "../lib/replitAuth";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export async function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = (req as any).user as any;

  if (!req.isAuthenticated || !req.isAuthenticated() || !user?.claims?.sub) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.userId = user.claims.sub;
  req.userEmail = user.claims.email ?? "";
  next();
}
