"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTrainee } from "@/lib/trainee-auth";
import { issueCertificate } from "@/lib/certificate";

export async function claimCertificate(formData: FormData) {
  const trainee = await requireTrainee();
  const eventCertificateId = String(formData.get("eventCertificateId") ?? "");
  if (!eventCertificateId) redirect("/trainee");

  const participant = await db.participant.findUnique({ where: { id: trainee.sub } });
  if (!participant?.eventId) redirect("/trainee");

  const eventCertificate = await db.eventCertificate.findFirst({
    where: { id: eventCertificateId, eventId: participant.eventId, isPublished: true },
  });
  if (!eventCertificate) redirect("/trainee");

  // issueCertificate re-validates the unlock condition itself and is a no-op if it's not met yet.
  await issueCertificate(eventCertificate.id, participant.id);

  redirect("/trainee");
}
