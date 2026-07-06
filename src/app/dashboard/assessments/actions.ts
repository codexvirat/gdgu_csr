"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability, companyScope } from "@/lib/auth";
import { canAccessEvent, getAssessmentEventLink } from "@/lib/event-access";
import { logAudit } from "@/lib/audit";

const questionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});
const questionsSchema = z.array(questionSchema).min(1);

export async function createAssessment(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageAssessments");

  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const tradeCategory = String(formData.get("tradeCategory") ?? "").trim() || null;
  const passMark = Number(formData.get("passMark") ?? 0);
  const totalMarks = Number(formData.get("totalMarks") ?? 0);

  if (!projectId || !title || totalMarks <= 0 || passMark <= 0 || passMark > totalMarks) {
    return { error: "Title, total marks, and a pass mark within range are required." };
  }

  const project = await db.project.findFirst({ where: { id: projectId, ...companyScope(session) } });
  if (!project) return { error: "Project not found." };

  const parsed = questionsSchema.safeParse(JSON.parse(String(formData.get("questionsJson") ?? "[]")));
  if (!parsed.success) return { error: "Each question needs text and 4 non-empty options with one marked correct." };

  const assessment = await db.assessment.create({
    data: {
      projectId,
      title,
      tradeCategory,
      passMark,
      totalMarks,
      questions: {
        create: parsed.data.map((q) => ({
          questionText: q.text,
          options: JSON.stringify(q.options),
          correctOption: String(q.correctIndex),
        })),
      },
    },
  });
  await logAudit({ userId: session.sub, entityType: "Assessment", entityId: assessment.id, action: "CREATE", after: assessment });

  redirect(`/dashboard/assessments/${assessment.id}`);
}

export async function addQuestion(formData: FormData) {
  const session = await requireCapability("manageAssessments");

  const assessmentId = String(formData.get("assessmentId") ?? "");
  const questionText = String(formData.get("questionText") ?? "").trim();
  const options = [0, 1, 2, 3].map((i) => String(formData.get(`option${i}`) ?? "").trim());
  const correctOption = String(formData.get("correctOption") ?? "0");

  if (!assessmentId || !questionText || options.some((o) => !o)) return;

  const assessment = await db.assessment.findFirst({ where: { id: assessmentId, project: companyScope(session) } });
  if (!assessment) return;

  const question = await db.assessmentQuestion.create({
    data: { assessmentId, questionText, options: JSON.stringify(options), correctOption },
  });
  await logAudit({ userId: session.sub, entityType: "AssessmentQuestion", entityId: question.id, action: "CREATE", after: question });

  revalidatePath(`/dashboard/assessments/${assessmentId}`);
}

export async function allotAssessmentToEvent(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("publishAssessments");

  const assessmentId = String(formData.get("assessmentId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!assessmentId || !eventId) return { error: "Select an event to allot this paper to." };

  const assessment = await db.assessment.findFirst({ where: { id: assessmentId, project: companyScope(session) } });
  if (!assessment) return { error: "Assessment not found." };

  const event = await db.event.findFirst({ where: { id: eventId, projectId: assessment.projectId } });
  if (!event) return { error: "Event not found in this assessment's project." };
  if (!(await canAccessEvent(session, eventId))) return { error: "You can't allot papers to events outside your assigned event(s)." };

  const link = await db.eventAssessment.create({ data: { assessmentId, eventId } });
  await logAudit({ userId: session.sub, entityType: "EventAssessment", entityId: link.id, action: "CREATE", after: link });

  revalidatePath(`/dashboard/assessments/${assessmentId}`);
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function publishEventAssessment(formData: FormData) {
  const session = await requireCapability("publishAssessments");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const link = await db.eventAssessment.findFirst({ where: { id, assessment: { project: companyScope(session) } } });
  if (!link || !(await canAccessEvent(session, link.eventId))) return;

  const updated = await db.eventAssessment.update({ where: { id }, data: { isPublished: true, publishedAt: new Date() } });
  await logAudit({ userId: session.sub, entityType: "EventAssessment", entityId: id, action: "PUBLISH", before: link, after: updated });

  revalidatePath(`/dashboard/assessments/${link.assessmentId}`);
  revalidatePath(`/dashboard/events/${link.eventId}`);
}

export async function unpublishEventAssessment(formData: FormData) {
  const session = await requireCapability("publishAssessments");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const link = await db.eventAssessment.findFirst({ where: { id, assessment: { project: companyScope(session) } } });
  if (!link || !(await canAccessEvent(session, link.eventId))) return;

  const updated = await db.eventAssessment.update({ where: { id }, data: { isPublished: false, publishedAt: null } });
  await logAudit({ userId: session.sub, entityType: "EventAssessment", entityId: id, action: "UNPUBLISH", before: link, after: updated });

  revalidatePath(`/dashboard/assessments/${link.assessmentId}`);
  revalidatePath(`/dashboard/events/${link.eventId}`);
}

export async function removeEventAssessment(formData: FormData) {
  const session = await requireCapability("publishAssessments");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const link = await db.eventAssessment.findFirst({ where: { id, assessment: { project: companyScope(session) } } });
  if (!link || !(await canAccessEvent(session, link.eventId))) return;

  await db.eventAssessment.delete({ where: { id } });
  await logAudit({ userId: session.sub, entityType: "EventAssessment", entityId: id, action: "DELETE", before: link });

  revalidatePath(`/dashboard/assessments/${link.assessmentId}`);
  revalidatePath(`/dashboard/events/${link.eventId}`);
}

export async function deleteAssessment(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("deleteRecords");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing assessment id." };

  const assessment = await db.assessment.findFirst({ where: { id, project: companyScope(session) } });
  if (!assessment) return { error: "Assessment not found." };

  await db.$transaction(async (tx) => {
    await tx.assessmentResult.deleteMany({ where: { assessmentId: id } });
    await tx.assessment.delete({ where: { id } });
  });
  await logAudit({ userId: session.sub, entityType: "Assessment", entityId: id, action: "DELETE", before: assessment });

  redirect("/dashboard/assessments");
}

export async function recordOnlineResult(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("conductScoreAssessments");

  const assessmentId = String(formData.get("assessmentId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");

  if (!assessmentId || !participantId || !eventId) return { error: "Select a participant." };
  if (!(await canAccessEvent(session, eventId))) return { error: "You can't score participants outside your assigned event(s)." };

  const assessment = await db.assessment.findFirst({
    where: { id: assessmentId, project: companyScope(session) },
    include: { questions: true },
  });
  if (!assessment) return { error: "Assessment not found." };
  if (!(await getAssessmentEventLink(assessmentId, eventId))) return { error: "This paper isn't allotted to that event yet." };

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
    data: { assessmentId, participantId, eventId, totalQuestions, attemptedCount, correctCount, score, status, mode: "ONLINE" },
  });
  await logAudit({ userId: session.sub, entityType: "AssessmentResult", entityId: result.id, action: "CREATE", after: result });
  await db.participant.update({ where: { id: participantId }, data: { status: status === "PASS" ? "CERTIFIED" : "TRAINED" } });

  redirect(`/dashboard/assessments/${assessmentId}`);
}

export async function recordOfflineResult(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("conductScoreAssessments");

  const assessmentId = String(formData.get("assessmentId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const score = Number(formData.get("score") ?? -1);
  const totalQuestions = Number(formData.get("totalQuestions") ?? -1);
  const attemptedCount = Number(formData.get("attemptedCount") ?? -1);
  const correctCount = Number(formData.get("correctCount") ?? -1);

  if (!assessmentId || !participantId || !eventId || score < 0 || totalQuestions < 0 || attemptedCount < 0 || correctCount < 0) {
    return { error: "Select a participant and fill in the score and question counts." };
  }
  if (attemptedCount > totalQuestions || correctCount > attemptedCount) {
    return { error: "Correct answers can't exceed attempted, and attempted can't exceed total questions." };
  }
  if (!(await canAccessEvent(session, eventId))) return { error: "You can't score participants outside your assigned event(s)." };

  const assessment = await db.assessment.findFirst({ where: { id: assessmentId, project: companyScope(session) } });
  if (!assessment) return { error: "Assessment not found." };
  if (score > assessment.totalMarks) return { error: `Score cannot exceed ${assessment.totalMarks}.` };
  if (!(await getAssessmentEventLink(assessmentId, eventId))) return { error: "This paper isn't allotted to that event yet." };

  const status = score >= assessment.passMark ? "PASS" : "FAIL";

  const result = await db.assessmentResult.create({
    data: { assessmentId, participantId, eventId, totalQuestions, attemptedCount, correctCount, score, status, mode: "OFFLINE" },
  });
  await logAudit({ userId: session.sub, entityType: "AssessmentResult", entityId: result.id, action: "CREATE", after: result });
  await db.participant.update({ where: { id: participantId }, data: { status: status === "PASS" ? "CERTIFIED" : "TRAINED" } });

  redirect(`/dashboard/assessments/${assessmentId}`);
}
