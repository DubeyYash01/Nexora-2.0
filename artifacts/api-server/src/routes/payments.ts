import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import { getAuthClient } from "../lib/supabaseAdmin";
import crypto from "crypto";

const router = Router();

const PLAN_AMOUNTS: Record<string, Record<string, number>> = {
  student_pro: { monthly: 29900, semester: 99900 },
  maker_pro: { monthly: 49900 },
};

function getPeriodEnd(billingCycle: string): Date {
  const now = new Date();
  if (billingCycle === "semester") {
    now.setDate(now.getDate() + 180);
  } else {
    now.setDate(now.getDate() + 30);
  }
  return now;
}

// POST /api/payments/create-order
router.post("/payments/create-order", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { plan, billingCycle } = req.body;

    const planAmounts = PLAN_AMOUNTS[plan];
    if (!planAmounts) {
      res.status(400).json({ error: "Invalid plan" });
      return;
    }

    const amount = planAmounts[billingCycle ?? "monthly"];
    if (!amount) {
      res.status(400).json({ error: "Invalid billing cycle for this plan" });
      return;
    }

    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      res.status(500).json({ error: "Payment gateway not configured" });
      return;
    }

    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `nexora_${req.userId!.slice(0, 8)}_${Date.now()}`,
      notes: { userId: req.userId!, plan, billingCycle: billingCycle ?? "monthly" },
    });

    res.json({ orderId: order.id, amount, currency: "INR", keyId: RAZORPAY_KEY_ID });
  } catch (err) {
    logger.error({ err }, "Failed to create Razorpay order");
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// POST /api/payments/verify
router.post("/payments/verify", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, billingCycle } = req.body;

    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    if (!RAZORPAY_KEY_SECRET) {
      res.status(500).json({ error: "Payment gateway not configured" });
      return;
    }

    const hmac = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated = hmac.digest("hex");

    if (generated !== razorpay_signature) {
      res.status(400).json({ success: false, error: "Invalid payment signature" });
      return;
    }

    const db = getAuthClient(req.token!);
    const periodEnd = getPeriodEnd(billingCycle ?? "monthly");
    const amount = PLAN_AMOUNTS[plan]?.[billingCycle ?? "monthly"] ?? 0;

    const { data: sub, error: subError } = await db
      .from("subscriptions")
      .upsert({
        user_id: req.userId!,
        plan,
        billing_cycle: billingCycle ?? "monthly",
        status: "active",
        razorpay_payment_id,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        amount_paid: amount,
        currency: "INR",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (subError) throw subError;

    await db.from("profiles").update({ plan, updated_at: new Date().toISOString() }).eq("id", req.userId!);

    await db.from("payment_history").insert({
      user_id: req.userId!,
      subscription_id: sub?.id,
      razorpay_payment_id,
      razorpay_order_id,
      amount,
      currency: "INR",
      status: "captured",
      plan,
      billing_cycle: billingCycle ?? "monthly",
    });

    res.json({ success: true, subscription: sub });
  } catch (err) {
    logger.error({ err }, "Payment verification failed");
    res.status(500).json({ error: "Payment verification failed" });
  }
});

// POST /api/payments/start-trial
router.post("/payments/start-trial", verifyToken, async (req: AuthRequest, res) => {
  try {
    const db = getAuthClient(req.token!);

    const { data: profile } = await db.from("profiles").select("trial_used").eq("id", req.userId!).single();
    if (profile?.trial_used) {
      res.status(400).json({ error: "Free trial already used" });
      return;
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    await db
      .from("subscriptions")
      .upsert({
        user_id: req.userId!,
        plan: "student_pro",
        status: "trial",
        trial_ends_at: trialEnd.toISOString(),
        current_period_end: trialEnd.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    await db.from("profiles").update({ plan: "student_pro", trial_used: true, updated_at: new Date().toISOString() }).eq("id", req.userId!);

    res.json({ success: true, trialEndsAt: trialEnd.toISOString() });
  } catch (err) {
    logger.error({ err }, "Failed to start trial");
    res.status(500).json({ error: "Failed to start trial" });
  }
});

// POST /api/payments/cancel
router.post("/payments/cancel", verifyToken, async (req: AuthRequest, res) => {
  try {
    const db = getAuthClient(req.token!);

    const { data: sub } = await db.from("subscriptions").select("current_period_end").eq("user_id", req.userId!).single();
    await db.from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("user_id", req.userId!);

    res.json({ success: true, accessUntil: sub?.current_period_end });
  } catch (err) {
    logger.error({ err }, "Failed to cancel subscription");
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// GET /api/payments/subscription/:userId
router.get("/payments/subscription/:userId", verifyToken, async (req: AuthRequest, res) => {
  const { userId } = req.params;
  if (req.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const db = getAuthClient(req.token!);
  const { data: sub } = await db.from("subscriptions").select("*").eq("user_id", userId).single();
  const { data: usage } = await db.from("usage_tracking").select("*").eq("user_id", userId).single();
  const { data: profile } = await db.from("profiles").select("plan,trial_used").eq("id", userId).single();

  if (sub && sub.status === "trial" && sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) {
    await db.from("subscriptions").update({ status: "expired" }).eq("user_id", userId);
    await db.from("profiles").update({ plan: "free" }).eq("id", userId);
    res.json({ subscription: { ...sub, status: "expired" }, usage, plan: "free", trial_used: profile?.trial_used });
    return;
  }

  res.json({ subscription: sub ?? null, usage: usage ?? null, plan: profile?.plan ?? "free", trial_used: profile?.trial_used ?? false });
});

// GET /api/payments/history/:userId
router.get("/payments/history/:userId", verifyToken, async (req: AuthRequest, res) => {
  const { userId } = req.params;
  if (req.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const db = getAuthClient(req.token!);
  const { data } = await db.from("payment_history").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  res.json({ history: data ?? [] });
});

export default router;
