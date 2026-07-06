"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability, companyScope } from "@/lib/auth";
import { isEventScopedRole } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { accessibleEventIds } from "@/lib/event-access";
import { encryptAadhaar, isValidAadhaarFormat, hashAadhaarLookup, decryptAadhaar, normalizeAadhaar } from "@/lib/crypto";
import { saveUploadedFile } from "@/lib/storage";
import { parseCsv } from "@/lib/csv";
import { readXlsxRows } from "@/lib/export";
import { clearParticipantBlockers } from "@/lib/cascade-delete";
import { ParticipantStatus } from "@/generated/prisma/enums";

const PARTICIPANT_STATUSES: ParticipantStatus[] = ["REGISTERED", "TRAINED", "CERTIFIED", "DROPPED"];

type ActionState = { error?: string; duplicate?: { id: string; name: string; project: string } } | undefined;

export async function createParticipant(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireCapability("registerParticipants");

  const projectId = String(formData.get("projectId") ?? "");
  const eventId = String(formData.get("eventId") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const aadhaar = String(formData.get("aadhaar") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const tradeCategory = String(formData.get("tradeCategory") ?? "").trim() || null;
  const experienceYears = formData.get("experienceYears") ? Number(formData.get("experienceYears")) : null;
  const managerId = String(formData.get("managerId") ?? "") || null;
  const confirmDuplicate = String(formData.get("confirmDuplicate") ?? "") === "yes";

  if (!projectId || !name || !aadhaar || !mobile) {
    return { error: "Project, name, Aadhaar, and mobile are required." };
  }
  if (!isValidAadhaarFormat(aadhaar)) {
    return { error: "Aadhaar must be a 12-digit number." };
  }
  if (!/^\d{10}$/.test(mobile)) {
    return { error: "Mobile must be a 10-digit number." };
  }

  const project = await db.project.findFirst({ where: { id: projectId, ...companyScope(session) } });
  if (!project) return { error: "Project not found." };

  if (isEventScopedRole(session.role)) {
    const access = await accessibleEventIds(session);
    if (!eventId || (access !== "ALL" && !access.includes(eventId))) {
      return { error: "You can only register participants for your own assigned event." };
    }
  }

  const aadhaarHash = hashAadhaarLookup(aadhaar);
  if (!confirmDuplicate) {
    const match = await db.participant.findFirst({
      where: { project: { companyId: project.companyId }, OR: [{ aadhaarHash }, { mobile }] },
      include: { project: true },
    });
    if (match) {
      return { duplicate: { id: match.id, name: match.name, project: match.project.name } };
    }
  }

  const { aadhaarEncrypted, aadhaarLast4 } = encryptAadhaar(aadhaar);

  const participant = await db.participant.create({
    data: {
      projectId,
      eventId,
      name,
      aadhaarEncrypted,
      aadhaarHash,
      aadhaarLast4,
      mobile,
      address,
      tradeCategory,
      experienceYears,
      managerId,
      registeredById: session.sub,
    },
  });
  await logAudit({
    userId: session.sub,
    entityType: "Participant",
    entityId: participant.id,
    action: "CREATE",
    after: { ...participant, aadhaarEncrypted: undefined },
  });

  redirect(`/dashboard/participants/${participant.id}`);
}

export async function updateParticipantStatus(formData: FormData) {
  const session = await requireCapability("editParticipants");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ParticipantStatus;
  if (!id || !PARTICIPANT_STATUSES.includes(status)) return;

  const before = await db.participant.findFirst({ where: { id, project: companyScope(session) } });
  if (!before) return;

  const participant = await db.participant.update({ where: { id }, data: { status } });
  await logAudit({ userId: session.sub, entityType: "Participant", entityId: id, action: "STATUS_CHANGE", before, after: participant });

  revalidatePath(`/dashboard/participants/${id}`);
}

export async function uploadParticipantDocument(formData: FormData) {
  const session = await requireCapability("editParticipants");

  const participantId = String(formData.get("participantId") ?? "");
  const docType = String(formData.get("docType") ?? "Document").trim();
  const file = formData.get("file") as File | null;
  if (!participantId || !file || file.size === 0) return;
  if (file.size > 10 * 1024 * 1024) return;

  const participant = await db.participant.findFirst({ where: { id: participantId, project: companyScope(session) } });
  if (!participant) return;

  const { fileKey } = await saveUploadedFile(file, `participants/${participantId}`);
  const doc = await db.participantDocument.create({ data: { participantId, docType, fileUrl: fileKey } });
  await logAudit({ userId: session.sub, entityType: "ParticipantDocument", entityId: doc.id, action: "CREATE", after: doc });

  revalidatePath(`/dashboard/participants/${participantId}`);
}

const MAX_IMPORT_ROWS = 500;

type ImportRowResult = { row: number; name: string; mobile: string; status: "CREATED" | "SKIPPED" | "ERROR"; reason?: string };
type ImportState = { error?: string; summary?: { created: number; skipped: number; rows: ImportRowResult[] } } | undefined;

export async function bulkImportParticipants(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const session = await requireCapability("registerParticipants");

  const projectId = String(formData.get("projectId") ?? "");
  const eventId = String(formData.get("eventId") ?? "") || null;
  const managerId = String(formData.get("managerId") ?? "") || null;
  const file = formData.get("file") as File | null;

  if (!projectId || !file || file.size === 0) return { error: "Project and a file are required." };

  const project = await db.project.findFirst({ where: { id: projectId, ...companyScope(session) } });
  if (!project) return { error: "Project not found." };

  if (isEventScopedRole(session.role)) {
    const access = await accessibleEventIds(session);
    if (!eventId || (access !== "ALL" && !access.includes(eventId))) {
      return { error: "You can only import participants for your own assigned event." };
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
  const rows = isXlsx ? await readXlsxRows(buffer) : parseCsv(buffer.toString("utf8"));
  if (rows.length === 0) return { error: "The file is empty." };
  if (rows.length - 1 > MAX_IMPORT_ROWS) return { error: `Files are limited to ${MAX_IMPORT_ROWS} rows per upload.` };

  const header = rows[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const colIndex = (key: string) => header.indexOf(key);
  const idx = {
    name: colIndex("name"),
    aadhaar: colIndex("aadhaar"),
    mobile: colIndex("mobile"),
    address: colIndex("address"),
    tradeCategory: colIndex("tradecategory"),
    experienceYears: colIndex("experienceyears"),
  };
  if (idx.name < 0 || idx.aadhaar < 0 || idx.mobile < 0) {
    return { error: "The file must have name, aadhaar, and mobile columns (address, tradeCategory, experienceYears are optional)." };
  }

  const seenInBatch = new Set<string>();
  const results: ImportRowResult[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c)) continue;
    const rowNum = i + 1;
    const name = (row[idx.name] ?? "").trim();
    const aadhaarRaw = (row[idx.aadhaar] ?? "").trim();
    const mobile = (row[idx.mobile] ?? "").trim();
    const address = idx.address >= 0 ? (row[idx.address] ?? "").trim() || null : null;
    const tradeCategory = idx.tradeCategory >= 0 ? (row[idx.tradeCategory] ?? "").trim() || null : null;
    const experienceYears = idx.experienceYears >= 0 && row[idx.experienceYears] ? Number(row[idx.experienceYears]) : null;

    if (!name || !aadhaarRaw || !mobile) {
      results.push({ row: rowNum, name, mobile, status: "ERROR", reason: "Missing name, Aadhaar, or mobile." });
      continue;
    }
    if (!isValidAadhaarFormat(aadhaarRaw)) {
      results.push({ row: rowNum, name, mobile, status: "ERROR", reason: "Aadhaar must be a 12-digit number." });
      continue;
    }
    if (!/^\d{10}$/.test(mobile)) {
      results.push({ row: rowNum, name, mobile, status: "ERROR", reason: "Mobile must be a 10-digit number." });
      continue;
    }

    const aadhaarHash = hashAadhaarLookup(aadhaarRaw);
    const batchKey = `${aadhaarHash}|${mobile}`;
    if (seenInBatch.has(batchKey)) {
      results.push({ row: rowNum, name, mobile, status: "SKIPPED", reason: "Duplicate within this file." });
      continue;
    }

    const existing = await db.participant.findFirst({ where: { project: { companyId: project.companyId }, OR: [{ aadhaarHash }, { mobile }] } });
    if (existing) {
      results.push({ row: rowNum, name, mobile, status: "SKIPPED", reason: `Already registered as "${existing.name}".` });
      continue;
    }

    seenInBatch.add(batchKey);
    const { aadhaarEncrypted, aadhaarLast4 } = encryptAadhaar(normalizeAadhaar(aadhaarRaw));

    const participant = await db.participant.create({
      data: {
        projectId,
        eventId,
        name,
        aadhaarEncrypted,
        aadhaarHash,
        aadhaarLast4,
        mobile,
        address,
        tradeCategory,
        experienceYears,
        managerId,
        registeredById: session.sub,
      },
    });
    await logAudit({ userId: session.sub, entityType: "Participant", entityId: participant.id, action: "BULK_IMPORT" });
    results.push({ row: rowNum, name, mobile, status: "CREATED" });
  }

  const created = results.filter((r) => r.status === "CREATED").length;
  const skipped = results.filter((r) => r.status !== "CREATED").length;

  return { summary: { created, skipped, rows: results } };
}

export async function deleteParticipant(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("deleteRecords");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing participant id." };

  const participant = await db.participant.findFirst({ where: { id, project: companyScope(session) } });
  if (!participant) return { error: "Participant not found." };

  await db.$transaction(async (tx) => {
    await clearParticipantBlockers(tx, [id]);
    await tx.participant.delete({ where: { id } });
  });
  await logAudit({
    userId: session.sub,
    entityType: "Participant",
    entityId: id,
    action: "DELETE",
    before: { ...participant, aadhaarEncrypted: undefined, pinHash: undefined, pinEncrypted: undefined },
  });

  redirect("/dashboard/participants");
}

export async function unmaskAadhaarAction(participantId: string): Promise<{ value?: string; error?: string }> {
  const session = await requireCapability("unmaskAadhaar");
  const participant = await db.participant.findFirst({ where: { id: participantId, project: companyScope(session) } });
  if (!participant) return { error: "Not found" };

  const value = decryptAadhaar(participant.aadhaarEncrypted);
  await logAudit({ userId: session.sub, entityType: "Participant", entityId: participantId, action: "UNMASK_AADHAAR" });

  return { value };
}
