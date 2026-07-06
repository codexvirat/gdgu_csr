import "server-only";
import { db } from "@/lib/db";
import { isEventScopedRole } from "@/lib/permissions";
import type { SessionPayload } from "@/lib/auth";

/** Event ids a session may act on. "ALL" means company-wide (still subject to companyScope elsewhere). */
export type EventAccess = "ALL" | string[];

export async function accessibleEventIds(session: SessionPayload): Promise<EventAccess> {
  if (!isEventScopedRole(session.role)) return "ALL";

  if (session.role === "VOLUNTEER") {
    return session.volunteerEventId ? [session.volunteerEventId] : [];
  }

  if (session.role === "PA") {
    const assignments = await db.eventPA.findMany({ where: { userId: session.sub }, select: { eventId: true } });
    return assignments.map((a) => a.eventId);
  }

  // TRAINER
  const trainer = await db.trainer.findUnique({
    where: { userId: session.sub },
    select: { eventAssignments: { select: { eventId: true } } },
  });
  return trainer?.eventAssignments.map((e) => e.eventId) ?? [];
}

export async function canAccessEvent(session: SessionPayload, eventId: string): Promise<boolean> {
  const access = await accessibleEventIds(session);
  return access === "ALL" || access.includes(eventId);
}

/** Prisma `where` fragment for the Event model, layered on top of companyScope. */
export function eventWhereFragment(access: EventAccess) {
  return access === "ALL" ? {} : { id: { in: access } };
}

/** The allotment link between a question paper and one of the events it's allotted to, or null if not allotted. */
export function getAssessmentEventLink(assessmentId: string, eventId: string) {
  return db.eventAssessment.findUnique({ where: { eventId_assessmentId: { eventId, assessmentId } } });
}

/** The allotment link between a feedback form and one of the events it's allotted to, or null if not allotted. */
export function getFeedbackEventLink(feedbackFormId: string, eventId: string) {
  return db.eventFeedback.findUnique({ where: { eventId_feedbackFormId: { eventId, feedbackFormId } } });
}
