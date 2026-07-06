"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability, companyScope } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clearTrainerBlockers } from "@/lib/cascade-delete";

export async function createTrainer(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("assignTrainersManagers");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const skills = String(formData.get("skills") ?? "").trim() || null;
  const certifications = String(formData.get("certifications") ?? "").trim() || null;
  const feeStructure = String(formData.get("feeStructure") ?? "").trim() || null;
  const userId = String(formData.get("userId") ?? "") || null;

  if (!name) return { error: "Trainer name is required." };

  const trainer = await db.trainer.create({
    data: { companyId: session.companyId, name, phone, email, skills, certifications, feeStructure, userId },
  });
  await logAudit({ userId: session.sub, entityType: "Trainer", entityId: trainer.id, action: "CREATE", after: trainer });

  redirect(`/dashboard/trainers/${trainer.id}`);
}

export async function updateTrainer(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("assignTrainersManagers");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const skills = String(formData.get("skills") ?? "").trim() || null;
  const certifications = String(formData.get("certifications") ?? "").trim() || null;
  const feeStructure = String(formData.get("feeStructure") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "ACTIVE");
  const userId = String(formData.get("userId") ?? "") || null;

  if (!id || !name) return { error: "Trainer name is required." };

  const before = await db.trainer.findFirst({ where: { id, ...companyScope(session) } });
  if (!before) return { error: "Trainer not found." };

  const trainer = await db.trainer.update({
    where: { id },
    data: { name, phone, email, skills, certifications, feeStructure, status, userId },
  });
  await logAudit({ userId: session.sub, entityType: "Trainer", entityId: id, action: "UPDATE", before, after: trainer });

  redirect(`/dashboard/trainers/${id}`);
}

export async function deleteTrainer(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("deleteRecords");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing trainer id." };

  const trainer = await db.trainer.findFirst({ where: { id, ...companyScope(session) } });
  if (!trainer) return { error: "Trainer not found." };

  await db.$transaction(async (tx) => {
    await clearTrainerBlockers(tx, [id]);
    await tx.trainer.delete({ where: { id } });
  });
  await logAudit({ userId: session.sub, entityType: "Trainer", entityId: id, action: "DELETE", before: trainer });

  redirect("/dashboard/trainers");
}

export async function assignTrainerToEvent(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("assignTrainersManagers");

  const eventId = String(formData.get("eventId") ?? "");
  const trainerId = String(formData.get("trainerId") ?? "");
  const roleInEvent = String(formData.get("roleInEvent") ?? "").trim() || null;
  const feeAmount = formData.get("feeAmount") ? Number(formData.get("feeAmount")) : null;

  if (!eventId || !trainerId) return { error: "Select a trainer to assign." };

  const event = await db.event.findFirst({ where: { id: eventId, project: companyScope(session) } });
  if (!event) return { error: "Event not found." };

  const overlapping = await db.eventTrainer.findFirst({
    where: {
      trainerId,
      event: {
        id: { not: eventId },
        eventDateStart: { lte: event.eventDateEnd },
        eventDateEnd: { gte: event.eventDateStart },
      },
    },
    include: { event: true },
  });
  if (overlapping) {
    return { error: `This trainer is already assigned to "${overlapping.event.name}" during an overlapping date range.` };
  }

  const assignment = await db.eventTrainer.create({ data: { eventId, trainerId, roleInEvent, feeAmount } });
  await logAudit({ userId: session.sub, entityType: "EventTrainer", entityId: assignment.id, action: "CREATE", after: assignment });

  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function removeTrainerFromEvent(formData: FormData) {
  const session = await requireCapability("assignTrainersManagers");
  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!id) return;

  const assignment = await db.eventTrainer.findFirst({ where: { id, event: { project: companyScope(session) } } });
  if (!assignment) return;

  await db.eventTrainer.delete({ where: { id } });
  await logAudit({ userId: session.sub, entityType: "EventTrainer", entityId: id, action: "DELETE", before: assignment });

  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function addTrainerRating(formData: FormData) {
  const session = await requireCapability("assignTrainersManagers");

  const trainerId = String(formData.get("trainerId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const feedbackText = String(formData.get("feedbackText") ?? "").trim() || null;

  if (!trainerId || !eventId || rating < 1 || rating > 5) return;

  const trainer = await db.trainer.findFirst({ where: { id: trainerId, ...companyScope(session) } });
  if (!trainer) return;

  const created = await db.trainerRating.create({ data: { trainerId, eventId, rating, feedbackText, ratedById: session.sub } });
  await logAudit({ userId: session.sub, entityType: "TrainerRating", entityId: created.id, action: "CREATE", after: created });

  revalidatePath(`/dashboard/trainers/${trainerId}`);
}
