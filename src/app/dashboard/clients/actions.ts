"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCapability, companyScope } from "@/lib/auth";
import { isGlobalRole } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { clearProjectBlockers } from "@/lib/cascade-delete";

export async function createClient(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageClients");

  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const primaryContact = String(formData.get("primaryContact") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const companyId = isGlobalRole(session.role) ? String(formData.get("companyId") ?? "") : session.companyId;

  if (!name || !companyId) return { error: "Client name is required." };

  const client = await db.client.create({ data: { name, industry, primaryContact, address, companyId } });
  await logAudit({ userId: session.sub, entityType: "Client", entityId: client.id, action: "CREATE", after: client });

  redirect("/dashboard/clients");
}

export async function updateClient(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageClients");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const primaryContact = String(formData.get("primaryContact") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!id || !name) return { error: "Client name is required." };

  const before = await db.client.findUnique({ where: { id } });
  if (!isGlobalRole(session.role) && before?.companyId !== session.companyId) {
    return { error: "You do not have access to this client." };
  }

  const client = await db.client.update({ where: { id }, data: { name, industry, primaryContact, address } });
  await logAudit({ userId: session.sub, entityType: "Client", entityId: id, action: "UPDATE", before, after: client });

  redirect("/dashboard/clients");
}

export async function deleteClient(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("deleteRecords");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing client id." };

  const client = await db.client.findFirst({ where: { id, ...companyScope(session) } });
  if (!client) return { error: "Client not found." };

  await db.$transaction(async (tx) => {
    const projects = await tx.project.findMany({ where: { clientId: id }, select: { id: true } });
    for (const p of projects) {
      await clearProjectBlockers(tx, p.id);
      await tx.project.delete({ where: { id: p.id } });
    }
    await tx.client.delete({ where: { id } });
  });
  await logAudit({ userId: session.sub, entityType: "Client", entityId: id, action: "DELETE", before: client });

  redirect("/dashboard/clients");
}
