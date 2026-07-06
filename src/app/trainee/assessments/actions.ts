"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTrainee } from "@/lib/trainee-auth";
import { logAudit } from "@/lib/audit";

export async function submitOwnAssessment(formData: FormData) {
  const trainee = await requireTrainee();
  const assessmentId = String(formData.get("assessmentId") ?? "");
  if (!assessmentId) redirect("/trainee");

  const [participant, assessment] = await Promise.all([
    db.participant.findUnique({ where: { id: trainee.sub } }),
    db.assessment.findFirst({ where: { id: assessmentId, projectId: trainee.projectId }, include: { questions: true } }),
  ]);
  if (!participant || !assessment) redirect("/trainee");
  if (!participant.eventId) redirect(`/trainee/assessments/${assessmentId}?error=not-assigned`);

  const link = await db.eventAssessment.findUnique({ where: { eventId_assessmentId: { eventId: participant.eventId, assessmentId } } });
  if (!link?.isPublished) redirect("/trainee");

  const existingPass = await db.assessmentResult.findFirst({ where: { assessmentId, participantId: participant.id, status: "PASS" } });
  if (existingPass) redirect(`/trainee/assessments/${assessmentId}/result?resultId=${existingPass.id}`);

  let attemptedCount = 0;
  let correctCount = 0;
  for (const q of assessment.questions) {
    const answer = formData.get(`answer_${q.id}`);
    if (answer === null || answer === "") continue;
    attemptedCount++;
    if (String(answer) === q.correctOption) correctCount++;
  }
  const totalQuestions = assessment.questions.length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * assessment.totalMarks) : 0;
  const status = score >= assessment.passMark ? "PASS" : "FAIL";

  const result = await db.assessmentResult.create({
    data: { assessmentId, participantId: participant.id, eventId: participant.eventId, totalQuestions, attemptedCount, correctCount, score, status, mode: "ONLINE" },
  });
  await logAudit({ userId: null, entityType: "AssessmentResult", entityId: result.id, action: "SELF_SUBMIT", after: result });
  await db.participant.update({ where: { id: participant.id }, data: { status: status === "PASS" ? "CERTIFIED" : "TRAINED" } });

  redirect(`/trainee/assessments/${assessmentId}/result?resultId=${result.id}`);
}
