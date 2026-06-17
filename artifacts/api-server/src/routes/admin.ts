import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabase, getAuthClient } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";

const router = Router();

async function isAdmin(userId: string): Promise<{ admin: boolean; role: string | null }> {
  const { data } = await supabase.from("admin_users").select("role").eq("user_id", userId).single();
  return { admin: !!data, role: data?.role ?? null };
}

async function requireAdmin(req: AuthRequest, res: any, next: any) {
  const userId = req.userId ?? (req.query.userId as string) ?? (req.params.userId as string);
  if (!userId) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const { admin, role } = await isAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  (req as any).adminRole = role;
  next();
}

// GET /api/admin/check/:userId
router.get("/admin/check/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { admin, role } = await isAdmin(userId);
    res.json({ isAdmin: admin, role });
  } catch (err) {
    logger.error({ err }, "Error in admin check");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/log-access-attempt
router.post("/admin/log-access-attempt", async (req, res) => {
  const { userId, path } = req.body;
  logger.warn({ userId, path }, "Unauthorized admin access attempt");
  res.json({ ok: true });
});

// GET /api/admin/overview
router.get("/admin/overview", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00.000Z`;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [
      { count: totalUsers },
      { count: newUsersToday },
      { count: totalProjects },
      { count: newProjectsToday },
      { count: totalBlueprints },
      { data: paidData },
      { data: revenueToday },
      { data: revenueMonth },
      { data: aiToday },
      { data: recentProfiles },
      { data: recentPayments },
      { data: recentProjects },
      { data: recentBlueprints },
      { data: recentReports },
      { data: recentClasses },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase.from("projects").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("blueprints").select("*", { count: "exact", head: true }),
      supabase.from("subscriptions").select("plan, status").in("status", ["active", "trial"]),
      supabase.from("payment_history").select("amount").gte("created_at", todayStart),
      supabase.from("payment_history").select("amount").gte("created_at", monthStart),
      supabase.from("usage_tracking").select("ai_messages_count").eq("date", today),
      supabase.from("profiles").select("id, full_name, email, created_at").gte("created_at", todayStart).order("created_at", { ascending: false }).limit(5),
      supabase.from("payment_history").select("amount, plan, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("projects").select("id, title, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("blueprints").select("id, title, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("content_reports").select("id, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("classes").select("id, name, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    const paidUsers = (paidData ?? []).filter((s: any) => s.plan !== "free" && s.status === "active").length;
    const trialUsers = (paidData ?? []).filter((s: any) => s.status === "trial").length;
    const revToday = (revenueToday ?? []).reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);
    const revMonth = (revenueMonth ?? []).reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);
    const aiMsgs = (aiToday ?? []).reduce((sum: number, u: any) => sum + (u.ai_messages_count ?? 0), 0);

    const activity: any[] = [];
    (recentProfiles ?? []).forEach((p: any) => activity.push({ type: "signup", text: `New user signed up${p.full_name ? `: ${p.full_name}` : ""}`, created_at: p.created_at }));
    (recentPayments ?? []).forEach((p: any) => activity.push({ type: "payment", text: `Payment received — ₹${p.amount}`, created_at: p.created_at }));
    (recentProjects ?? []).forEach((p: any) => activity.push({ type: "project", text: `Project created: ${p.title}`, created_at: p.created_at }));
    (recentBlueprints ?? []).forEach((b: any) => activity.push({ type: "blueprint", text: `Blueprint published: ${b.title}`, created_at: b.created_at }));
    (recentReports ?? []).forEach((r: any) => activity.push({ type: "report", text: "Content reported", created_at: r.created_at }));
    (recentClasses ?? []).forEach((c: any) => activity.push({ type: "class", text: `Class created: ${c.name}`, created_at: c.created_at }));
    activity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // User growth 7 days
    const userGrowth: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", `${ds}T00:00:00Z`).lt("created_at", `${ds}T23:59:59Z`);
      userGrowth.push({ date: ds, count: count ?? 0, label: d.toLocaleDateString("en", { weekday: "short" }) });
    }

    // Revenue 30 days
    const revenueHistory: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const { data: dayPayments } = await supabase.from("payment_history").select("amount").gte("created_at", `${ds}T00:00:00Z`).lt("created_at", `${ds}T23:59:59Z`);
      const total = (dayPayments ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
      revenueHistory.push({ date: ds, amount: total });
    }

    // Plan distribution
    const { data: allProfiles } = await supabase.from("profiles").select("plan");
    const planCounts: Record<string, number> = { free: 0, student_pro: 0, maker_pro: 0, trial: 0 };
    (allProfiles ?? []).forEach((p: any) => { const k = p.plan ?? "free"; planCounts[k] = (planCounts[k] ?? 0) + 1; });

    // Pending reports count
    const { count: pendingReports } = await supabase.from("content_reports").select("*", { count: "exact", head: true }).eq("status", "pending");

    res.json({
      stats: {
        totalUsers: totalUsers ?? 0,
        newUsersToday: newUsersToday ?? 0,
        activeToday: newUsersToday ?? 0,
        paidUsers,
        trialUsers,
        revenueToday: revToday,
        revenueMonth: revMonth,
        totalProjects: totalProjects ?? 0,
        newProjectsToday: newProjectsToday ?? 0,
        totalBlueprints: totalBlueprints ?? 0,
        aiMessagesToday: aiMsgs,
        pendingReports: pendingReports ?? 0,
      },
      activity: activity.slice(0, 20),
      userGrowth,
      revenueHistory,
      planCounts,
    });
  } catch (err) {
    logger.error({ err }, "Error in admin overview");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/users
router.get("/admin/users", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { search, plan, role, sort = "newest", limit = "50", offset = "0" } = req.query as Record<string, string>;
    let query = supabase.from("profiles").select("id, full_name, email, username, role, plan, created_at, updated_at, avatar_url, college_name");

    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
    if (plan && plan !== "all") query = query.eq("plan", plan);
    if (role && role !== "all") query = query.eq("role", role);

    if (sort === "newest") query = query.order("created_at", { ascending: false });
    else if (sort === "oldest") query = query.order("created_at", { ascending: true });

    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: profiles, error, count } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }

    const enriched = await Promise.all((profiles ?? []).map(async (p: any) => {
      const { count: projCount } = await supabase.from("projects").select("*", { count: "exact", head: true }).eq("user_id", p.id);
      const { data: sub } = await supabase.from("subscriptions").select("status, plan").eq("user_id", p.id).single();
      return { ...p, project_count: projCount ?? 0, subscription: sub };
    }));

    const { count: totalCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    res.json({ users: enriched, total: totalCount ?? 0 });
  } catch (err) {
    logger.error({ err }, "Error in admin users");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/users/:targetId
router.get("/admin/users/:targetId", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { targetId } = req.params;
    const [
      { data: profile },
      { data: projects },
      { data: payments },
      { data: aiUsage },
      { data: blueprints },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetId).single(),
      supabase.from("projects").select("id, title, status, created_at, updated_at").eq("user_id", targetId).order("created_at", { ascending: false }),
      supabase.from("payment_history").select("*").eq("user_id", targetId).order("created_at", { ascending: false }),
      supabase.from("usage_tracking").select("date, ai_messages_count").eq("user_id", targetId).order("date", { ascending: false }).limit(30),
      supabase.from("blueprints").select("id, title, created_at, fork_count, like_count").eq("author_id", targetId),
    ]);
    const totalSpent = (payments ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    const totalAI = (aiUsage ?? []).reduce((s: number, u: any) => s + (u.ai_messages_count ?? 0), 0);
    res.json({ profile, projects: projects ?? [], payments: payments ?? [], aiUsage: aiUsage ?? [], blueprints: blueprints ?? [], totalSpent, totalAI });
  } catch (err) {
    logger.error({ err }, "Error in admin user detail");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/users/:targetId/plan
router.put("/admin/users/:targetId/plan", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { targetId } = req.params;
    const { plan, reason, duration } = req.body;
    const db = getAuthClient(req.token!);

    await db.from("profiles").update({ plan, updated_at: new Date().toISOString() }).eq("id", targetId);

    let periodEnd: string | null = null;
    if (duration && duration !== "permanent") {
      const days: Record<string, number> = { "30_days": 30, "90_days": 90, "6_months": 180 };
      const d = new Date();
      d.setDate(d.getDate() + (days[duration] ?? 30));
      periodEnd = d.toISOString();
    }

    await supabase.from("subscriptions").upsert({
      user_id: targetId, plan, status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    await supabase.from("notifications").insert({
      user_id: targetId,
      type: "plan_update",
      title: "Plan Updated",
      message: `Your plan has been updated to ${plan} by Nexora support.${reason ? ` Reason: ${reason}` : ""}`,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error updating user plan");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/revenue
router.get("/admin/revenue", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00Z`;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: allPayments } = await supabase.from("payment_history").select("amount, plan, billing_cycle, status, created_at, razorpay_payment_id, user_id").order("created_at", { ascending: false });
    const { data: todayPay } = await supabase.from("payment_history").select("amount").gte("created_at", todayStart);
    const { data: monthPay } = await supabase.from("payment_history").select("amount").gte("created_at", monthStart);
    const { data: activeSubs } = await supabase.from("subscriptions").select("plan, billing_cycle, status").eq("status", "active");

    const revenueToday = (todayPay ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    const revenueMonth = (monthPay ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    const revenueTotal = (allPayments ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);

    const planPrices: Record<string, number> = { student_pro: 299, maker_pro: 499 };
    const mrr = (activeSubs ?? []).reduce((s: number, sub: any) => {
      const price = planPrices[sub.plan] ?? 0;
      const multiplier = sub.billing_cycle === "semester" ? (999 / 6) : price;
      return s + multiplier;
    }, 0);

    const planSubs: Record<string, { count: number; price: number; mrr: number }> = {
      student_pro_monthly: { count: 0, price: 299, mrr: 0 },
      student_pro_semester: { count: 0, price: 999, mrr: 0 },
      maker_pro: { count: 0, price: 499, mrr: 0 },
    };
    (activeSubs ?? []).forEach((s: any) => {
      if (s.plan === "student_pro" && s.billing_cycle === "semester") { planSubs.student_pro_semester.count++; planSubs.student_pro_semester.mrr += 999 / 6; }
      else if (s.plan === "student_pro") { planSubs.student_pro_monthly.count++; planSubs.student_pro_monthly.mrr += 299; }
      else if (s.plan === "maker_pro") { planSubs.maker_pro.count++; planSubs.maker_pro.mrr += 499; }
    });

    // Revenue history 90 days
    const revenueHistory: any[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const dayAmount = (allPayments ?? []).filter((p: any) => p.created_at?.startsWith(ds)).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
      revenueHistory.push({ date: ds, amount: dayAmount });
    }

    // Enrich payments with profile info
    const enrichedPayments = await Promise.all((allPayments ?? []).slice(0, 100).map(async (p: any) => {
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", p.user_id).single();
      return { ...p, profile };
    }));

    res.json({ revenueToday, revenueMonth, revenueTotal, mrr, planSubs, revenueHistory, payments: enrichedPayments });
  } catch (err) {
    logger.error({ err }, "Error in admin revenue");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/ai-usage
router.get("/admin/ai-usage", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: todayUsage } = await supabase.from("usage_tracking").select("ai_messages_count, user_id").eq("date", today);
    const { data: weekUsage } = await supabase.from("usage_tracking").select("date, ai_messages_count").gte("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]);
    const { data: topUsers } = await supabase.from("usage_tracking").select("user_id, ai_messages_count").eq("date", today).order("ai_messages_count", { ascending: false }).limit(10);

    const totalToday = (todayUsage ?? []).reduce((s: number, u: any) => s + (u.ai_messages_count ?? 0), 0);
    const estimatedCost = totalToday * 0.002;

    const dailyUsage: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const dayTotal = (weekUsage ?? []).filter((u: any) => u.date === ds).reduce((s: number, u: any) => s + (u.ai_messages_count ?? 0), 0);
      dailyUsage.push({ date: ds, count: dayTotal, label: d.toLocaleDateString("en", { weekday: "short" }) });
    }

    const enrichedTop = await Promise.all((topUsers ?? []).map(async (u: any) => {
      const { data: profile } = await supabase.from("profiles").select("full_name, email, plan").eq("id", u.user_id).single();
      return { ...u, profile };
    }));

    res.json({ totalToday, estimatedCost, dailyUsage, topUsers: enrichedTop });
  } catch (err) {
    logger.error({ err }, "Error in admin ai-usage");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/reports
router.get("/admin/reports", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    let query = supabase.from("content_reports").select("*").order("created_at", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }

    const enriched = await Promise.all((data ?? []).map(async (r: any) => {
      const { data: reporter } = await supabase.from("profiles").select("full_name, email").eq("id", r.reporter_id).single();
      return { ...r, reporter };
    }));

    res.json({ reports: enriched });
  } catch (err) {
    logger.error({ err }, "Error in admin reports");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/reports/:reportId
router.put("/admin/reports/:reportId", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { reportId } = req.params;
    const { status, notes } = req.body;
    const { error } = await supabase.from("content_reports").update({
      status, updated_at: new Date().toISOString(), reviewed_by: req.userId,
    }).eq("id", reportId);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error updating report");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/reports/create
router.post("/reports/create", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { contentType, contentId, reason, description } = req.body;
    const { data, error } = await supabase.from("content_reports").insert({
      reporter_id: req.userId,
      content_type: contentType,
      content_id: contentId,
      reason,
      description,
      status: "pending",
      created_at: new Date().toISOString(),
    }).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true, report: data });
  } catch (err) {
    logger.error({ err }, "Error creating report");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/announcements (public — gracefully returns [] if table missing)
router.get("/admin/announcements", async (_req, res) => {
  try {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    res.json({ announcements: data ?? [] });
  } catch {
    res.json({ announcements: [] });
  }
});

// POST /api/admin/announcements
router.post("/admin/announcements", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, message, type, targetRoles, showUntil, isActive } = req.body;
    const { data, error } = await supabase.from("announcements").insert({
      title, message, type: type ?? "info",
      target_roles: targetRoles ?? ["student", "maker", "professor", "professional"],
      is_active: isActive !== false,
      show_until: showUntil ?? null,
      created_by: req.userId,
      created_at: new Date().toISOString(),
    }).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true, announcement: data });
  } catch (err) {
    logger.error({ err }, "Error creating announcement");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/announcements/:id
router.put("/admin/announcements/:id", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { error } = await supabase.from("announcements").update(updates).eq("id", id);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error updating announcement");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/feature-flags (public)
router.get("/admin/feature-flags", async (req, res) => {
  try {
    const { data } = await supabase.from("feature_flags").select("flag_name, is_enabled, description");
    const flags: Record<string, boolean> = {};
    (data ?? []).forEach((f: any) => { flags[f.flag_name] = f.is_enabled; });
    res.json({ flags, raw: data ?? [] });
  } catch (err) {
    logger.error({ err }, "Error fetching feature flags");
    res.json({ flags: {}, raw: [] });
  }
});

// PUT /api/admin/feature-flags/:flag
router.put("/admin/feature-flags/:flag", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { flag } = req.params;
    const { isEnabled } = req.body;
    await supabase.from("feature_flags").update({ is_enabled: isEnabled, updated_by: req.userId, updated_at: new Date().toISOString() }).eq("flag_name", flag);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error updating feature flag");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/college-inquiries
router.get("/admin/college-inquiries", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    let query = supabase.from("college_inquiries").select("*").order("created_at", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ inquiries: data ?? [] });
  } catch (err) {
    logger.error({ err }, "Error fetching college inquiries");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/college-inquiries/:id
router.put("/admin/college-inquiries/:id", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (adminNotes !== undefined) updates.admin_notes = adminNotes;
    const { error } = await supabase.from("college_inquiries").update(updates).eq("id", id);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error updating college inquiry");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/platform-config (public)
router.get("/admin/platform-config", async (req, res) => {
  try {
    const { data } = await supabase.from("platform_config").select("key, value, description");
    const config: Record<string, string> = {};
    (data ?? []).forEach((c: any) => { config[c.key] = c.value; });
    res.json({ config, raw: data ?? [] });
  } catch (err) {
    logger.error({ err }, "Error fetching platform config");
    res.json({ config: {}, raw: [] });
  }
});

// PUT /api/admin/platform-config
router.put("/admin/platform-config", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { key, value } = req.body;
    await supabase.from("platform_config").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error updating platform config");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/maintenance
router.post("/admin/maintenance", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { enabled, message } = req.body;
    await supabase.from("platform_config").upsert({ key: "maintenance_mode", value: enabled ? "true" : "false", updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (message !== undefined) {
      await supabase.from("platform_config").upsert({ key: "maintenance_message", value: message, updated_at: new Date().toISOString() }, { onConflict: "key" });
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error setting maintenance mode");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/blueprints
router.get("/admin/blueprints", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase.from("blueprints").select("id, title, description, category, difficulty, is_featured, is_public, fork_count, view_count, like_count, created_at, author_id").order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    const enriched = await Promise.all((data ?? []).map(async (b: any) => {
      const { data: author } = await supabase.from("profiles").select("full_name, email").eq("id", b.author_id).single();
      return { ...b, author };
    }));
    const { count: total } = await supabase.from("blueprints").select("*", { count: "exact", head: true });
    const { count: pub } = await supabase.from("blueprints").select("*", { count: "exact", head: true }).eq("is_public", true);
    const totalForks = (data ?? []).reduce((s: number, b: any) => s + (b.fork_count ?? 0), 0);
    const totalViews = (data ?? []).reduce((s: number, b: any) => s + (b.view_count ?? 0), 0);
    res.json({ blueprints: enriched, stats: { total: total ?? 0, public: pub ?? 0, totalForks, totalViews } });
  } catch (err) {
    logger.error({ err }, "Error in admin blueprints");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/blueprints/:id
router.put("/admin/blueprints/:id", verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { error } = await supabase.from("blueprints").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error updating blueprint");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
