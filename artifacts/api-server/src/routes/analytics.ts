import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import type { Response } from "express";
import { getAuthClient } from "../lib/supabaseAdmin";

const router = Router();

router.get("/analytics/:professorId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { professorId } = req.params;
  const { classId } = req.query as { classId?: string };

  if (req.userId !== professorId) { res.status(403).json({ error: "Forbidden" }); return; }

  const db = getAuthClient(req.token!);
  const { data: classData } = await db.from("classes").select("id,name,student_count,is_active").eq("professor_id", professorId);

  const classIds = classId ? [classId] : (classData ?? []).map((c) => c.id);
  if (classIds.length === 0) {
    res.json({ classes: [], assignments: [], studentEngagement: [], componentInsights: [] });
    return;
  }

  const { data: assignmentData } = await db
    .from("assignments")
    .select("id,title,submission_count,status,deadline,class_id")
    .in("class_id", classIds)
    .order("created_at", { ascending: false });

  const assignmentIds = (assignmentData ?? []).map((a) => a.id);

  let submissionData: { student_id: string; assignment_id: string; status: string; submitted_at: string | null; ai_assistance_log: unknown; component_list: unknown }[] = [];
  if (assignmentIds.length > 0) {
    const { data } = await db
      .from("assignment_submissions")
      .select("student_id,assignment_id,status,submitted_at,ai_assistance_log,component_list")
      .in("assignment_id", assignmentIds);
    submissionData = data ?? [];
  }

  const { data: memberData } = await db
    .from("class_members")
    .select("student_id,class_id,profiles(full_name,email)")
    .in("class_id", classIds);

  const studentMap = new Map<string, { name: string; assignmentsCompleted: number; totalAiMessages: number; lastActive: string | null }>();
  for (const m of (memberData ?? [])) {
    const profile = m.profiles as { full_name?: string } | null;
    studentMap.set(m.student_id, {
      name: profile?.full_name ?? "Unknown",
      assignmentsCompleted: 0,
      totalAiMessages: 0,
      lastActive: null,
    });
  }

  for (const sub of submissionData) {
    const student = studentMap.get(sub.student_id);
    if (!student) continue;
    if (sub.status === "submitted" || sub.status === "graded") student.assignmentsCompleted++;
    const ai = sub.ai_assistance_log as { totalMessages?: number } | null;
    student.totalAiMessages += ai?.totalMessages ?? 0;
    if (sub.submitted_at && (!student.lastActive || sub.submitted_at > student.lastActive)) {
      student.lastActive = sub.submitted_at;
    }
  }

  const studentEngagement = Array.from(studentMap.entries()).map(([id, data]) => ({ id, ...data }));

  const componentCounts = new Map<string, number>();
  for (const sub of submissionData) {
    const comps = (sub.component_list as { list?: { name: string }[] } | null)?.list ?? [];
    for (const c of comps) {
      componentCounts.set(c.name, (componentCounts.get(c.name) ?? 0) + 1);
    }
  }

  const componentInsights = Array.from(componentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const assignmentsWithStats = (assignmentData ?? []).map((a) => {
    const aSubmissions = submissionData.filter((s) => s.assignment_id === a.id);
    const classStudents = (memberData ?? []).filter((m) => m.class_id === a.class_id).length;
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

  res.json({ classes: classData ?? [], assignments: assignmentsWithStats, studentEngagement, componentInsights });
});

export default router;
