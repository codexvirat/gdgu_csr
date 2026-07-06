"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability, companyScope } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clearVenueBlockers } from "@/lib/cascade-delete";
import { saveUploadedFile } from "@/lib/storage";

export async function createVenue(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageVenuesVendors");

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const contactPerson = String(formData.get("contactPerson") ?? "").trim() || null;
  const contactPhone = String(formData.get("contactPhone") ?? "").trim() || null;
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const capacity = formData.get("capacity") ? Number(formData.get("capacity")) : null;
  const facilities = String(formData.get("facilities") ?? "").trim() || null;
  const rateCard = String(formData.get("rateCard") ?? "").trim() || null;

  if (!name || !city) return { error: "Venue name and city are required." };

  const venue = await db.venue.create({
    data: { companyId: session.companyId, name, city, state, address, contactPerson, contactPhone, contactEmail, capacity, facilities, rateCard },
  });

  const imageFiles = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const imageKeys: string[] = [];
  for (const file of imageFiles) {
    const { fileKey } = await saveUploadedFile(file, `venues/${venue.id}`);
    imageKeys.push(fileKey);
  }
  if (imageKeys.length > 0) {
    await db.venue.update({ where: { id: venue.id }, data: { imageKeys: JSON.stringify(imageKeys) } });
  }

  await logAudit({ userId: session.sub, entityType: "Venue", entityId: venue.id, action: "CREATE", after: venue });

  redirect(`/dashboard/venues/${venue.id}`);
}

export async function updateVenue(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageVenuesVendors");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const contactPerson = String(formData.get("contactPerson") ?? "").trim() || null;
  const contactPhone = String(formData.get("contactPhone") ?? "").trim() || null;
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const capacity = formData.get("capacity") ? Number(formData.get("capacity")) : null;
  const facilities = String(formData.get("facilities") ?? "").trim() || null;
  const rateCard = String(formData.get("rateCard") ?? "").trim() || null;

  if (!id || !name || !city) return { error: "Venue name and city are required." };

  const before = await db.venue.findFirst({ where: { id, ...companyScope(session) } });
  if (!before) return { error: "Venue not found." };

  const keepKeys = formData.getAll("keepKey").map(String);
  const imageFiles = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const newKeys: string[] = [];
  for (const file of imageFiles) {
    const { fileKey } = await saveUploadedFile(file, `venues/${id}`);
    newKeys.push(fileKey);
  }
  const imageKeys = JSON.stringify([...keepKeys, ...newKeys]);

  const venue = await db.venue.update({
    where: { id },
    data: { name, city, state, address, contactPerson, contactPhone, contactEmail, capacity, facilities, rateCard, imageKeys },
  });
  await logAudit({ userId: session.sub, entityType: "Venue", entityId: id, action: "UPDATE", before, after: venue });

  redirect(`/dashboard/venues/${id}`);
}

export async function deleteVenue(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("deleteRecords");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing venue id." };

  const venue = await db.venue.findFirst({ where: { id, ...companyScope(session) } });
  if (!venue) return { error: "Venue not found." };

  await db.$transaction(async (tx) => {
    await clearVenueBlockers(tx, [id]);
    await tx.venue.delete({ where: { id } });
  });
  await logAudit({ userId: session.sub, entityType: "Venue", entityId: id, action: "DELETE", before: venue });

  redirect("/dashboard/venues");
}

export async function updateBookingCost(formData: FormData) {
  const session = await requireCapability("manageVenuesVendors");

  const bookingId = String(formData.get("bookingId") ?? "");
  const venueId = String(formData.get("venueId") ?? "");
  const costIncurred = formData.get("costIncurred") ? Number(formData.get("costIncurred")) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!bookingId) return;

  const booking = await db.venueBooking.findFirst({ where: { id: bookingId, venue: companyScope(session) } });
  if (!booking) return;

  await db.venueBooking.update({ where: { id: bookingId }, data: { costIncurred, notes } });
  await logAudit({ userId: session.sub, entityType: "VenueBooking", entityId: bookingId, action: "UPDATE" });

  revalidatePath(`/dashboard/venues/${venueId}`);
}
