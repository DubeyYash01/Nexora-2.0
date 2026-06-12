import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import type { Response } from "express";
import { db } from "@workspace/db";
import { classes, assignments, assignmentSubmissions, classMembers, profiles } from "@workspace/db/schema";
import { eq, inArray, desc } from "drizzle-orm";

const router = Router();

// GET /api/analytics/:professorId
router.get("/analytics/:professorId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { professorId } = req.params;
  const { classId } = req.query as { classId?: string };

  if (req.userId !== professorId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const classData = await db
    .select({ id: classes.id, name: classes.name, studentCount: classes.studentCount, isActive: classes.isActive })
    .from(classes)
    .where(eq(classes.professorId, professorId));

  const classIds = classId ? [classId] : classData.map((c) => c.id);

  if (classIds.length === 0) {
    res.json({ classes: [], assignments: [], studentEngagement: [], componentInsights: [] });
    return;
  }

  const assignmentData = await db
    .select({ id: assignments.id, title: assignments.title, submissionCount: assignments.submissionCount, status: assignments.status, deadline: assignments.deadline, classId: assignments.classId })
    .from(assignments)
    .where(inArray(assignments.classId, classIds))
    .orderBy(desc(assignments.createdAt));

  const assignmentIds = assignmentData.map((a) => a.id);

  let submissionData: { studentId: string; assignmentId: string; status: string; submittedAt: Date | null; aiAssistanceLog: unknown; componentList: unknown }[] = [];
  if (assignmentIds.length > 0) {
    submissionData = await db
      .select({ studentId: assignmentSubmissions.studentId, assignmentId: assignmentSubmissions.assignmentId, status: assignmentSubmissions.status, submittedAt: assignmentSubmissions.submittedAt, aiAssistanceLog: assignmentSubmissions.aiAssistanceLog, componentList: assignmentSubmissions.componentList })
      .from(assignmentSubmissions)
      .where(inArray(assignmentSubmissions.assignmentId, assignmentIds));
  }

  const memberData = await db
    .select({ studentId: classMembers.studentId, classId: classMembers.classId, fullName: profiles.fullName, email: profiles.email })
    .from(classMembers)
    .leftJoin(profiles, eq(profiles.id, classMembers.studentId))
    .where(inArray(classMembers.classId, classIds));

  const studentMap = new Map<string, { name: string; assignmentsCompleted: number; totalAiMessages: number; lastActive: Date | null }>();
  for (const m of memberData) {
    studentMap.set(m.studentId, {
      name: m.fullName ?? "Unknown",
      assignmentsCompleted: 0,
      totalAiMessages: 0,
      lastActive: null,
    });
  }

  for (const sub of submissionData) {
    const student = studentMap.get(sub.studentId);
    if (!student) continue;
    if (sub.status === "submitted" || sub.status === "graded") student.assignmentsCompleted++;
    const ai = sub.aiAssistanceLog as { totalMessages?: number } | null;
    student.totalAiMessages += ai?.totalMessages ?? 0;
    if (sub.submittedAt && (!student.lastActive || sub.submittedAt > student.lastActive)) {
      student.lastActive = sub.submittedAt;
    }
  }

  const studentEngagement = Array.from(studentMap.entries()).map(([id, data]) => ({ id, ...data }));

  const componentCounts = new Map<string, number>();
  for (const sub of submissionData) {
    const comps = (sub.componentList as { list?: { name: string }[] } | null)?.list ?? [];
    for (const c of comps) {
      componentCounts.set(c.name, (componentCounts.get(c.name) ?? 0) + 1);
    }
  }

  const componentInsights = Array.from(componentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const assignmentsWithStats = assignmentData.map((a) => {
    const aSubmissions = submissionData.filter((s) => s.assignmentId === a.id);
    const classStudents = memberData.filter((m) => m.classId === a.classId).length;
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

  res.json({ classes: classData, assignments: assignmentsWithStats, studentEngagement, componentInsights });
});

export default router;
