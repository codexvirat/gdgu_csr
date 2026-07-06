import "server-only";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * The schema deliberately uses RESTRICT (not CASCADE) on most foreign keys so that
 * accidental deletes fail loudly elsewhere in the app. The Super Admin "delete anything"
 * feature needs to actually succeed, though, so these helpers explicitly clear every
 * RESTRICT-blocking row in dependency order before the caller deletes the target row(s).
 * Anything already wired as CASCADE in the schema (e.g. ParticipantDocument, Attendance,
 * EventTrainer, EventPA, AssessmentQuestion, FeedbackQuestion/Answer) is left for the
 * database to handle automatically.
 */

export async function clearEventBlockers(tx: Tx, eventIds: string[]) {
  if (eventIds.length === 0) return;
  await tx.trainerRating.deleteMany({ where: { eventId: { in: eventIds } } });
  await tx.assetAllocation.deleteMany({ where: { eventId: { in: eventIds } } });
  await tx.assessmentResult.deleteMany({ where: { eventId: { in: eventIds } } });
  await tx.feedbackResponse.deleteMany({ where: { eventId: { in: eventIds } } });
}

export async function clearParticipantBlockers(tx: Tx, participantIds: string[]) {
  if (participantIds.length === 0) return;
  await tx.assessmentResult.deleteMany({ where: { participantId: { in: participantIds } } });
  await tx.feedbackResponse.deleteMany({ where: { participantId: { in: participantIds } } });
}

export async function clearTrainerBlockers(tx: Tx, trainerIds: string[]) {
  if (trainerIds.length === 0) return;
  await tx.eventTrainer.deleteMany({ where: { trainerId: { in: trainerIds } } });
  await tx.trainerRating.deleteMany({ where: { trainerId: { in: trainerIds } } });
}

export async function clearVenueBlockers(tx: Tx, venueIds: string[]) {
  if (venueIds.length === 0) return;
  await tx.venueBooking.deleteMany({ where: { venueId: { in: venueIds } } });
}

export async function clearVendorBlockers(tx: Tx, vendorIds: string[]) {
  if (vendorIds.length === 0) return;
  await tx.vendorTransaction.deleteMany({ where: { vendorId: { in: vendorIds } } });
}

export async function clearAssetBlockers(tx: Tx, assetIds: string[]) {
  if (assetIds.length === 0) return;
  await tx.assetAllocation.deleteMany({ where: { assetId: { in: assetIds } } });
}

/**
 * Clears every RESTRICT blocker across a project's events and participants. The project
 * row itself still needs `tx.project.delete()` afterward — CASCADE handles the rest
 * (ProjectCity, ProjectDocument, Event, Participant, Assessment, FeedbackForm, Budget, Expense).
 */
export async function clearProjectBlockers(tx: Tx, projectId: string) {
  const [events, participants] = await Promise.all([
    tx.event.findMany({ where: { projectId }, select: { id: true } }),
    tx.participant.findMany({ where: { projectId }, select: { id: true } }),
  ]);
  await clearEventBlockers(tx, events.map((e) => e.id));
  await clearParticipantBlockers(tx, participants.map((p) => p.id));
}

/**
 * Fully unwinds a company: deletes every project (with its own blocker cleanup), trainer,
 * venue, vendor, asset, and client under it, then every user — in an order where nothing is
 * still referenced by a RESTRICT foreign key when its turn comes. Caller deletes the
 * Company row itself afterward.
 */
export async function clearCompanyBlockers(tx: Tx, companyId: string) {
  const projects = await tx.project.findMany({ where: { companyId }, select: { id: true } });
  for (const p of projects) {
    await clearProjectBlockers(tx, p.id);
    await tx.project.delete({ where: { id: p.id } });
  }

  const trainers = await tx.trainer.findMany({ where: { companyId }, select: { id: true } });
  await clearTrainerBlockers(tx, trainers.map((t) => t.id));
  await tx.trainer.deleteMany({ where: { companyId } });

  const venues = await tx.venue.findMany({ where: { companyId }, select: { id: true } });
  await clearVenueBlockers(tx, venues.map((v) => v.id));
  await tx.venue.deleteMany({ where: { companyId } });

  const vendors = await tx.vendor.findMany({ where: { companyId }, select: { id: true } });
  await clearVendorBlockers(tx, vendors.map((v) => v.id));
  await tx.vendor.deleteMany({ where: { companyId } });

  const assets = await tx.asset.findMany({ where: { companyId }, select: { id: true } });
  await clearAssetBlockers(tx, assets.map((a) => a.id));
  await tx.asset.deleteMany({ where: { companyId } });

  await tx.client.deleteMany({ where: { companyId } });

  // Users last — every row that RESTRICTs a user's deletion (created projects, uploaded
  // documents, registered participants, event-PA assignments, trainer ratings) is gone by now.
  await tx.user.deleteMany({ where: { companyId } });
}
