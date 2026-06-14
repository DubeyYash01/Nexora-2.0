import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabase } from "../lib/supabaseAdmin";
import type { Response } from "express";

const router = Router();

router.post("/recently-viewed", verifyToken, async (req: AuthRequest, res: Response) => {
  const { itemId, itemType, itemTitle } = req.body;
  const userId = req.userId!;

  if (!itemId || !itemType) { res.json({ success: false }); return; }

  await supabase.from("recently_viewed").upsert(
    { user_id: userId, item_id: itemId, item_type: itemType, item_title: itemTitle ?? "", viewed_at: new Date().toISOString() },
    { onConflict: "user_id,item_id,item_type" }
  );

  const { data: all } = await supabase
    .from("recently_viewed")
    .select("id,viewed_at")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false });

  if ((all ?? []).length > 20) {
    const toDelete = (all ?? []).slice(20).map((r) => r.id);
    if (toDelete.length > 0) {
      await supabase.from("recently_viewed").delete().in("id", toDelete);
    }
  }

  res.json({ success: true });
});

router.get("/recently-viewed", verifyToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { type } = req.query as Record<string, string>;

  let query = supabase
    .from("recently_viewed")
    .select("id,item_id,item_type,item_title,viewed_at")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(20);

  if (type) query = query.eq("item_type", type);

  const { data } = await query;
  res.json({ items: data ?? [] });
});

router.post("/recently-viewed/clear", verifyToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  await supabase.from("recently_viewed").delete().eq("user_id", userId);
  res.json({ success: true });
});

export default router;
