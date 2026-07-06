"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { requireCapability, companyScope, hashPassword } from "@/lib/auth";
import { isGlobalRole } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { clearEventBlockers } from "@/lib/cascade-delete";
import { encryptPin } from "@/lib/crypto";
import { EventStatus } from "@/generated/prisma/enums";

const EVENT_STATUSES: EventStatus[] = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export async function createEvent(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageEvents");

  const projectId = String(formData.get("projectId") ?? "");
  const projectCityId = String(formData.get("projectCityId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const eventDateStart = String(formData.get("eventDateStart") ?? "");
  const eventDateEnd = String(formData.get("eventDateEnd") ?? "");
  const targetCount = Number(formData.get("targetCount") ?? 0);
  const opsManagerId = String(formData.get("opsManagerId") ?? "") || null;
  const venueId = String(formData.get("venueId") ?? "") || null;
  const newVenueName = String(formData.get("newVenueName") ?? "").trim();
  const newVenueCity = String(formData.get("newVenueCity") ?? "").trim();
  const requiresAssessment = formData.get("requiresAssessment") === "on";

  if (!projectId || !projectCityId || !name || !eventDateStart || !eventDateEnd || targetCount <= 0) {
    return { error: "Name, city, dates, and a target headcount are required." };
  }

  const project = await db.project.findFirst({ where: { id: projectId, ...companyScope(session) } });
  if (!project) return { error: "Project not found." };

  let finalVenueId = venueId;
  if (!finalVenueId && newVenueName) {
    const venue = await db.venue.create({
      data: { companyId: project.companyId, name: newVenueName, city: newVenueCity || "Unspecified" },
    });
    finalVenueId = venue.id;
  }

  const event = await db.event.create({
    data: {
      projectId,
      projectCityId,
      venueId: finalVenueId,
      name,
      eventDateStart: new Date(eventDateStart),
      eventDateEnd: new Date(eventDateEnd),
      targetCount,
      opsManagerId,
      requiresAssessment,
    },
  });
  await logAudit({ userId: session.sub, entityType: "Event", entityId: event.id, action: "CREATE", after: event });

  if (finalVenueId) {
    await db.venueBooking.create({
      data: { venueId: finalVenueId, eventId: event.id, bookingDate: new Date(eventDateStart) },
    });
  }

  redirect(`/dashboard/events/${event.id}`);
}

export async function updateEvent(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageEvents");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const eventDateStart = String(formData.get("eventDateStart") ?? "");
  const eventDateEnd = String(formData.get("eventDateEnd") ?? "");
  const targetCount = Number(formData.get("targetCount") ?? 0);
  const opsManagerId = String(formData.get("opsManagerId") ?? "") || null;
  const status = String(formData.get("status") ?? "SCHEDULED") as EventStatus;
  const requiresAssessment = formData.get("requiresAssessment") === "on";

  if (!id || !name || !eventDateStart || !eventDateEnd || targetCount <= 0 || !EVENT_STATUSES.includes(status)) {
    return { error: "Name, dates, and a target headcount are required." };
  }

  const before = await db.event.findFirst({ where: { id, project: companyScope(session) } });
  if (!before) return { error: "Event not found." };

  const event = await db.event.update({
    where: { id },
    data: { name, eventDateStart: new Date(eventDateStart), eventDateEnd: new Date(eventDateEnd), targetCount, opsManagerId, status, requiresAssessment },
  });
  await logAudit({ userId: session.sub, entityType: "Event", entityId: id, action: "UPDATE", before, after: event });

  redirect(`/dashboard/events/${id}`);
}

export async function deleteEvent(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("deleteRecords");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing event id." };

  const event = await db.event.findFirst({ where: { id, project: companyScope(session) } });
  if (!event) return { error: "Event not found." };

  await db.$transaction(async (tx) => {
    await clearEventBlockers(tx, [id]);
    await tx.event.delete({ where: { id } });
  });
  await logAudit({ userId: session.sub, entityType: "Event", entityId: id, action: "DELETE", before: event });

  redirect("/dashboard/events");
}

export async function createVolunteer(_prev: { error?: string; createdEmail?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageEvents");

  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");

  if (!eventId || !name || !password) return { error: "Name and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const event = await db.event.findFirst({ where: { id: eventId, project: companyScope(session) }, include: { project: true } });
  if (!event) return { error: "Event not found." };

  const email = `volunteer.${crypto.randomBytes(4).toString("hex")}@volunteers.local`;
  const user = await db.user.create({
    data: {
      companyId: event.project.companyId,
      name,
      phone,
      email,
      passwordHash: await hashPassword(password),
      role: "VOLUNTEER",
      volunteerEventId: eventId,
    },
  });
  await logAudit({ userId: session.sub, entityType: "User", entityId: user.id, action: "CREATE_VOLUNTEER", after: { ...user, passwordHash: undefined } });

  return { createdEmail: email };
}

export async function assignPaToEvent(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("assignTrainersManagers");

  const eventId = String(formData.get("eventId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!eventId || !userId) return { error: "Select a PA to assign." };

  const event = await db.event.findFirst({ where: { id: eventId, project: companyScope(session) }, include: { project: true } });
  if (!event) return { error: "Event not found." };

  const pa = await db.user.findFirst({ where: { id: userId, role: "PA", companyId: event.project.companyId } });
  if (!pa) return { error: "PA not found in this company." };

  const assignment = await db.eventPA.create({ data: { eventId, userId } });
  await logAudit({ userId: session.sub, entityType: "EventPA", entityId: assignment.id, action: "CREATE", after: assignment });

  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function removePaFromEvent(formData: FormData) {
  const session = await requireCapability("assignTrainersManagers");
  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!id) return;

  const assignment = await db.eventPA.findFirst({ where: { id, event: { project: companyScope(session) } } });
  if (!assignment) return;

  await db.eventPA.delete({ where: { id } });
  await logAudit({ userId: session.sub, entityType: "EventPA", entityId: id, action: "DELETE", before: assignment });

  revalidatePath(`/dashboard/events/${eventId}`);
}

type SetPinState = { error?: string; success?: boolean } | undefined;

export async function setEventPin(_prev: SetPinState, formData: FormData): Promise<SetPinState> {
  const session = await requireCapability("manageEvents");
  if (!isGlobalRole(session.role)) return { error: "Only Super Admin can set the event PIN." };

  const id = String(formData.get("id") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();

  if (!id) return { error: "Missing event id." };
  if (!/^\d{4}$/.test(pin)) return { error: "PIN must be exactly 4 digits." };

  const event = await db.event.findFirst({ where: { id } });
  if (!event) return { error: "Event not found." };

  await db.event.update({
    where: { id },
    data: { eventPinHash: await hashPassword(pin), eventPinEncrypted: encryptPin(pin) },
  });
  await logAudit({ userId: session.sub, entityType: "Event", entityId: id, action: "UPDATE" });

  revalidatePath(`/dashboard/events/${id}`);
  return { success: true };
}
