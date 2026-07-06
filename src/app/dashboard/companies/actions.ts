"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clearCompanyBlockers } from "@/lib/cascade-delete";

export async function createCompany(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageCompanies");

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const gstin = String(formData.get("gstin") ?? "").trim() || null;

  if (!name) return { error: "Company name is required." };

  const company = await db.company.create({ data: { name, address, gstin } });
  await logAudit({ userId: session.sub, entityType: "Company", entityId: company.id, action: "CREATE", after: company });

  redirect("/dashboard/companies");
}

export async function updateCompany(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageCompanies");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const gstin = String(formData.get("gstin") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "ACTIVE");

  if (!id || !name) return { error: "Company name is required." };

  const before = await db.company.findUnique({ where: { id } });
  const company = await db.company.update({ where: { id }, data: { name, address, gstin, status } });
  await logAudit({ userId: session.sub, entityType: "Company", entityId: id, action: "UPDATE", before, after: company });

  redirect("/dashboard/companies");
}

export async function deleteCompany(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("deleteRecords");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing company id." };
  if (id === session.companyId) return { error: "You cannot delete the company your own account belongs to." };

  const company = await db.company.findUnique({ where: { id } });
  if (!company) return { error: "Company not found." };

  await db.$transaction(async (tx) => {
    await clearCompanyBlockers(tx, id);
    await tx.company.delete({ where: { id } });
  });
  await logAudit({ userId: session.sub, entityType: "Company", entityId: id, action: "DELETE", before: company });

  redirect("/dashboard/companies");
}
