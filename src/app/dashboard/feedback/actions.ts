"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability, companyScope } from "@/lib/auth";
import { canAccessEvent } from "@/lib/event-access";
import { logAudit } from "@/lib/audit";
import { FeedbackQuestionType } from "@/generated/prisma/enums";

const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["RATING", "TEXT"]),
});
const questionsSchema = z.array(questionSchema).min(1);

export async function createFeedbackForm(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageFeedback");

  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const tradeCategory = String(formData.get("tradeCategory") ?? "").trim() || null;

  if (!projectId || !title) {
    return { error: "Project and a title are required." };
  }

  const project = await db.project.findFirst({ where: { id: projectId, ...companyScope(session) } });
  if (!project) return { error: "Project not found." };

  const parsed = questionsSchema.safeParse(JSON.parse(String(formData.get("questionsJson") ?? "[]")));
  if (!parsed.success) return { error: "Each question needs text and a type (rating or text)." };

  const feedbackForm = await db.feedbackForm.create({
    data: {
      projectId,
      title,
      tradeCategory,
      questions: {
        create: parsed.data.map((q) => ({
          questionText: q.text,
          type: q.type as FeedbackQuestionType,
        })),
      },
    },
  });
  await logAudit({ userId: session.sub, entityType: "FeedbackForm", entityId: feedbackForm.id, action: "CREATE", after: feedbackForm });

  redirect(`/dashboard/feedback/${feedbackForm.id}`);
}

export async function allotFeedbackToEvent(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("publishFeedback");

  const feedbackFormId = String(formData.get("feedbackFormId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!feedbackFormId || !eventId) return { error: "Select an event to allot this form to." };

  const form = await db.feedbackForm.findFirst({ where: { id: feedbackFormId, project: companyScope(session) } });
  if (!form) return { error: "Feedback form not found." };

  const event = await db.event.findFirst({ where: { id: eventId, projectId: form.projectId } });
  if (!event) return { error: "Event not found in this form's project." };
  if (!(await canAccessEvent(session, eventId))) return { error: "You can't allot forms to events outside your assigned event(s)." };

  const link = await db.eventFeedback.create({ data: { feedbackFormId, eventId } });
  await logAudit({ userId: session.sub, entityType: "EventFeedback", entityId: link.id, action: "CREATE", after: link });

  revalidatePath(`/dashboard/feedback/${feedbackFormId}`);
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function publishEventFeedback(formData: FormData) {
  const session = await requireCapability("publishFeedback");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const link = await db.eventFeedback.findFirst({ where: { id, feedbackForm: { project: companyScope(session) } } });
  if (!link || !(await canAccessEvent(session, link.eventId))) return;

  const updated = await db.eventFeedback.update({ where: { id }, data: { isPublished: true, publishedAt: new Date() } });
  await logAudit({ userId: session.sub, entityType: "EventFeedback", entityId: id, action: "PUBLISH", before: link, after: updated });

  revalidatePath(`/dashboard/feedback/${link.feedbackFormId}`);
  revalidatePath(`/dashboard/events/${link.eventId}`);
}

export async function unpublishEventFeedback(formData: FormData) {
  const session = await requireCapability("publishFeedback");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const link = await db.eventFeedback.findFirst({ where: { id, feedbackForm: { project: companyScope(session) } } });
  if (!link || !(await canAccessEvent(session, link.eventId))) return;

  const updated = await db.eventFeedback.update({ where: { id }, data: { isPublished: false, publishedAt: null } });
  await logAudit({ userId: session.sub, entityType: "EventFeedback", entityId: id, action: "UNPUBLISH", before: link, after: updated });

  revalidatePath(`/dashboard/feedback/${link.feedbackFormId}`);
  revalidatePath(`/dashboard/events/${link.eventId}`);
}

export async function removeEventFeedback(formData: FormData) {
  const session = await requireCapability("publishFeedback");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const link = await db.eventFeedback.findFirst({ where: { id, feedbackForm: { project: companyScope(session) } } });
  if (!link || !(await canAccessEvent(session, link.eventId))) return;

  await db.eventFeedback.delete({ where: { id } });
  await logAudit({ userId: session.sub, entityType: "EventFeedback", entityId: id, action: "DELETE", before: link });

  revalidatePath(`/dashboard/feedback/${link.feedbackFormId}`);
  revalidatePath(`/dashboard/events/${link.eventId}`);
}

export async function deleteFeedbackForm(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("deleteRecords");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing feedback form id." };

  const form = await db.feedbackForm.findFirst({ where: { id, project: companyScope(session) } });
  if (!form) return { error: "Feedback form not found." };

  await db.$transaction(async (tx) => {
    await tx.feedbackResponse.deleteMany({ where: { feedbackFormId: id } });
    await tx.feedbackForm.delete({ where: { id } });
  });
  await logAudit({ userId: session.sub, entityType: "FeedbackForm", entityId: id, action: "DELETE", before: form });

  redirect("/dashboard/feedback");
}

export async function addFeedbackQuestion(formData: FormData) {
  const session = await requireCapability("manageFeedback");

  const feedbackFormId = String(formData.get("feedbackFormId") ?? "");
  const questionText = String(formData.get("questionText") ?? "").trim();
  const type = String(formData.get("type") ?? "RATING") as FeedbackQuestionType;

  if (!feedbackFormId || !questionText) return;

  const feedbackForm = await db.feedbackForm.findFirst({ where: { id: feedbackFormId, project: companyScope(session) } });
  if (!feedbackForm) return;

  const question = await db.feedbackQuestion.create({ data: { feedbackFormId, questionText, type } });
  await logAudit({ userId: session.sub, entityType: "FeedbackQuestion", entityId: question.id, action: "CREATE", after: question });

  revalidatePath(`/dashboard/feedback/${feedbackFormId}`);
}
