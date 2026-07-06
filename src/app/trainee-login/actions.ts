"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createTraineeSessionCookie } from "@/lib/trainee-auth";

type LoginState = { error?: string; options?: { id: string; name: string; eventName: string }[] } | undefined;

async function loginAs(participant: { id: string; name: string; mobile: string; projectId: string }): Promise<never> {
  await createTraineeSessionCookie({
    sub: participant.id,
    name: participant.name,
    mobile: participant.mobile,
    projectId: participant.projectId,
  });
  redirect("/trainee");
}

export async function traineeLoginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const mobile = String(formData.get("mobile") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const participantId = String(formData.get("participantId") ?? "").trim();

  if (!/^\d{10}$/.test(mobile)) {
    return { error: "Enter your 10-digit mobile number." };
  }

  const candidates = await db.participant.findMany({ where: { mobile }, include: { event: true } });
  if (candidates.length === 0) {
    return { error: "No registration found for this mobile number." };
  }

  if (pin) {
    if (!/^\d{4}$/.test(pin)) return { error: "PIN must be 4 digits." };
    for (const candidate of candidates) {
      if (candidate.event?.requiresAssessment && candidate.event.eventPinHash) {
        if (await bcrypt.compare(pin, candidate.event.eventPinHash)) {
          await loginAs(candidate);
        }
      }
    }
    return { error: "Mobile number or PIN is incorrect." };
  }

  // No PIN given — only allowed for events that don't require an assessment (feedback never needs a PIN).
  const feedbackOnly = candidates.filter((c) => !c.event || !c.event.requiresAssessment);
  if (feedbackOnly.length === 0) {
    return { error: "A PIN is required for your event. Enter the 4-digit PIN you received at registration." };
  }

  // A specific participant was already picked from a disambiguation list — log straight in.
  // PIN is not needed here because feedbackOnly candidates never require assessment.
  if (participantId) {
    const chosen = feedbackOnly.find((c) => c.id === participantId);
    if (!chosen) return { error: "Selection not found — try again." };
    await loginAs(chosen);
  }

  if (feedbackOnly.length === 1) {
    await loginAs(feedbackOnly[0]);
  }

  return { options: feedbackOnly.map((c) => ({ id: c.id, name: c.name, eventName: c.event?.name ?? "—" })) };
}
