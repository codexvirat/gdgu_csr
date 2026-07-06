"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability, companyScope } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/storage";
import { clearProjectBlockers } from "@/lib/cascade-delete";
import { ProjectStatus } from "@/generated/prisma/enums";

const PROJECT_STATUSES: ProjectStatus[] = ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

export async function createProject(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageProjects");

  const name = String(formData.get("name") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "");
  const tradeCategory = String(formData.get("tradeCategory") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const budgetTotal = formData.get("budgetTotal") ? Number(formData.get("budgetTotal")) : null;
  const cityNames = formData.getAll("cityName").map(String);
  const cityTargets = formData.getAll("cityTarget").map(Number);

  const cities = cityNames
    .map((city, i) => ({ city: city.trim(), targetCount: cityTargets[i] || 0 }))
    .filter((c) => c.city && c.targetCount > 0);

  if (!name || !clientId || !tradeCategory || !startDate || !endDate || cities.length === 0) {
    return { error: "Name, client, trade category, dates, and at least one city target are required." };
  }

  const client = await db.client.findFirst({ where: { id: clientId, ...companyScope(session) } });
  if (!client) return { error: "Invalid client." };

  const targetCount = cities.reduce((sum, c) => sum + c.targetCount, 0);

  const project = await db.project.create({
    data: {
      companyId: client.companyId,
      clientId,
      name,
      targetCount,
      tradeCategory,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      budgetTotal,
      createdById: session.sub,
      cities: { create: cities },
    },
  });
  await logAudit({ userId: session.sub, entityType: "Project", entityId: project.id, action: "CREATE", after: project });

  redirect(`/dashboard/projects/${project.id}`);
}

export async function updateProject(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageProjects");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const tradeCategory = String(formData.get("tradeCategory") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const budgetTotal = formData.get("budgetTotal") ? Number(formData.get("budgetTotal")) : null;
  const status = String(formData.get("status") ?? "DRAFT") as ProjectStatus;

  if (!id || !name || !tradeCategory || !startDate || !endDate || !PROJECT_STATUSES.includes(status)) {
    return { error: "Name, trade category, and dates are required." };
  }

  const before = await db.project.findFirst({ where: { id, ...companyScope(session) } });
  if (!before) return { error: "Project not found." };

  const project = await db.project.update({
    where: { id },
    data: { name, tradeCategory, startDate: new Date(startDate), endDate: new Date(endDate), budgetTotal, status },
  });
  await logAudit({ userId: session.sub, entityType: "Project", entityId: id, action: "UPDATE", before, after: project });

  redirect(`/dashboard/projects/${id}`);
}

export async function deleteProject(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("deleteRecords");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing project id." };

  const project = await db.project.findFirst({ where: { id, ...companyScope(session) } });
  if (!project) return { error: "Project not found." };

  await db.$transaction(async (tx) => {
    await clearProjectBlockers(tx, id);
    await tx.project.delete({ where: { id } });
  });
  await logAudit({ userId: session.sub, entityType: "Project", entityId: id, action: "DELETE", before: project });

  redirect("/dashboard/projects");
}

export async function addProjectCity(formData: FormData) {
  const session = await requireCapability("manageProjects");

  const projectId = String(formData.get("projectId") ?? "");
  const city = String(formData.get("city") ?? "").trim();
  const targetCount = Number(formData.get("targetCount") ?? 0);

  const project = await db.project.findFirst({ where: { id: projectId, ...companyScope(session) } });
  if (!project || !city || targetCount <= 0) return;

  const created = await db.projectCity.create({ data: { projectId, city, targetCount } });
  await db.project.update({ where: { id: projectId }, data: { targetCount: project.targetCount + targetCount } });
  await logAudit({ userId: session.sub, entityType: "ProjectCity", entityId: created.id, action: "CREATE", after: created });

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function uploadProjectDocument(formData: FormData) {
  const session = await requireCapability("manageProjects");

  const projectId = String(formData.get("projectId") ?? "");
  const file = formData.get("file") as File | null;
  if (!projectId || !file || file.size === 0) return;
  if (file.size > 10 * 1024 * 1024) return;

  const project = await db.project.findFirst({ where: { id: projectId, ...companyScope(session) } });
  if (!project) return;

  const { fileKey, fileName } = await saveUploadedFile(file, `projects/${projectId}`);
  const doc = await db.projectDocument.create({
    data: { projectId, fileName, fileUrl: fileKey, uploadedById: session.sub },
  });
  await logAudit({ userId: session.sub, entityType: "ProjectDocument", entityId: doc.id, action: "CREATE", after: doc });

  revalidatePath(`/dashboard/projects/${projectId}`);
}
