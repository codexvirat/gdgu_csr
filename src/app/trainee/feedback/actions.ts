"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTrainee } from "@/lib/trainee-auth";
import { logAudit } from "@/lib/audit";
import { FeedbackQuestionType } from "@/generated/prisma/enums";

export async function submitFeedback(formData: FormData) {
  const trainee = await requireTrainee();
  const feedbackFormId = String(formData.get("feedbackFormId") ?? "");
  if (!feedbackFormId) redirect("/trainee");

  const [participant, form] = await Promise.all([
    db.participant.findUnique({ where: { id: trainee.sub } }),
    db.feedbackForm.findFirst({ where: { id: feedbackFormId, projectId: trainee.projectId }, include: { questions: true } }),
  ]);
  if (!participant || !form) redirect("/trainee");
  if (!participant.eventId) redirect(`/trainee/feedback/${feedbackFormId}?error=not-assigned`);

  const link = await db.eventFeedback.findUnique({ where: { eventId_feedbackFormId: { eventId: participant.eventId, feedbackFormId } } });
  if (!link?.isPublished) redirect("/trainee");

  const existing = await db.feedbackResponse.findFirst({ where: { feedbackFormId, participantId: participant.id } });
  if (existing) redirect(`/trainee/feedback/${feedbackFormId}`);

  const answers = form.questions.map((q) =>
    q.type === FeedbackQuestionType.RATING
      ? { questionId: q.id, ratingValue: Number(formData.get(`answer_${q.id}`) ?? 0) }
      : { questionId: q.id, textValue: String(formData.get(`answer_${q.id}`) ?? "").trim() }
  );

  const response = await db.feedbackResponse.create({
    data: { feedbackFormId, participantId: participant.id, eventId: participant.eventId, answers: { create: answers } },
  });
  await logAudit({ userId: null, entityType: "FeedbackResponse", entityId: response.id, action: "SELF_SUBMIT", after: response });

  redirect("/trainee?feedbackSubmitted=1");
}
