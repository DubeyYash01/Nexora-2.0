import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabaseAdmin";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  token?: string;
}

export async function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = user.id;
  req.userEmail = user.email ?? "";
  req.token = token;
  next();
}
