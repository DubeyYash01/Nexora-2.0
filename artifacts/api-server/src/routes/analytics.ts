import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import type { Response } from "express";

const router = Router();

// GET /api/analytics/:professorId
router.get("/analytics/:professorId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { professorId } = req.params;
  const { classId } = req.query as { classId?: string };

  if (req.userId !== professorId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  let classQuery = supabaseAdmin
    .from("classes")
    .select("id, name, student_count, is_active")
    .eq("professor_id", professorId);

  const { data: classes } = await classQuery;

  const classIds = classId
    ? [classId]
    : (classes ?? []).map((c: { id: string }) => c.id);

  if (classIds.length === 0) {
    res.json({ classes: [], assignments: [], studentEngagement: [], componentInsights: [] });
    return;
  }

  const { data: assignments } = await supabaseAdmin
    .from("assignments")
    .select("id, title, submission_count, status, deadline, class_id")
    .in("class_id", classIds)
    .order("created_at", { ascending: false });

  const assignmentIds = (assignments ?? []).map((a: { id: string }) => a.id);

  let submissions: { student_id: string; assignment_id: string; status: string; submitted_at: string; ai_assistance_log: { totalMessages?: number } | null; component_list: { list?: { name: string }[] } | null }[] = [];
  if (assignmentIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("assignment_submissions")
      .select("student_id, assignment_id, status, submitted_at, ai_assistance_log, component_list")
      .in("assignment_id", assignmentIds);
    submissions = data ?? [];
  }

  const { data: members } = await supabaseAdmin
    .from("class_members")
    .select("student_id, class_id, profiles(id, full_name, email)")
    .in("class_id", classIds);

  const studentMap = new Map<string, { name: string; assignmentsCompleted: number; totalAiMessages: number; lastActive: string | null }>();
  for (const m of members ?? []) {
    const profile = m.profiles as { full_name?: string } | null;
    studentMap.set(m.student_id, {
      name: profile?.full_name ?? "Unknown",
      assignmentsCompleted: 0,
      totalAiMessages: 0,
      lastActive: null,
    });
  }

  for (const sub of submissions) {
    const student = studentMap.get(sub.student_id);
    if (!student) continue;
    if (sub.status === "submitted" || sub.status === "graded") {
      student.assignmentsCompleted++;
    }
    const ai = sub.ai_assistance_log as { totalMessages?: number } | null;
    student.totalAiMessages += ai?.totalMessages ?? 0;
    if (sub.submitted_at && (!student.lastActive || sub.submitted_at > student.lastActive)) {
      student.lastActive = sub.submitted_at;
    }
  }

  const studentEngagement = Array.from(studentMap.entries()).map(([id, data]) => ({
    id,
    ...data,
  }));

  const componentCounts = new Map<string, number>();
  for (const sub of submissions) {
    const comps = (sub.component_list as { list?: { name: string }[] } | null)?.list ?? [];
    for (const c of comps) {
      componentCounts.set(c.name, (componentCounts.get(c.name) ?? 0) + 1);
    }
  }

  const componentInsights = Array.from(componentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const assignmentsWithStats = (assignments ?? []).map((a: { id: string; submission_count: number }) => {
    const aSubmissions = submissions.filter((s) => s.assignment_id === a.id);
    const relevantClass = (classes ?? []).find((c: { id: string }) => {
      const aObj = (assignments ?? []).find((ax: { id: string; class_id: string }) => ax.id === a.id);
      return aObj && c.id === aObj.class_id;
    });
    const classStudents = (members ?? []).filter((m: { class_id: string }) => {
      const aObj = (assignments ?? []).find((ax: { id: string; class_id: string }) => ax.id === a.id);
      return aObj && m.class_id === aObj.class_id;
    }).length;

    return {
      ...a,
      submittedCount: aSubmissions.filter((s) => s.status === "submitted" || s.status === "graded").length,
      gradedCount: aSubmissions.filter((s) => s.status === "graded").length,
      classStudents,
      completionRate: classStudents > 0
        ? Math.round((aSubmissions.filter((s) => s.status === "submitted" || s.status === "graded").length / classStudents) * 100)
        : 0,
    };
  });

  res.json({
    classes: classes ?? [],
    assignments: assignmentsWithStats,
    studentEngagement,
    componentInsights,
  });
});

export default router;
