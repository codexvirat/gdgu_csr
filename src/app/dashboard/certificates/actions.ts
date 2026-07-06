"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability, companyScope } from "@/lib/auth";
import { canAccessEvent } from "@/lib/event-access";
import { logAudit } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/storage";

const DEFAULT_BODY_TEXT =
  'This is to certify that {{name}} has successfully completed training in {{tradeCategory}} under the "{{project}}" program at {{event}}, issued on {{date}}.';

function fileOrNull(formData: FormData, key: string) {
  const file = formData.get(key);
  return file instanceof File && file.size > 0 ? file : null;
}

export async function createCertificateTemplate(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageCertificates");

  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const tradeCategory = String(formData.get("tradeCategory") ?? "").trim() || null;
  const bodyText = String(formData.get("bodyText") ?? "").trim() || DEFAULT_BODY_TEXT;
  const signatoryName = String(formData.get("signatoryName") ?? "").trim();
  const signatoryTitle = String(formData.get("signatoryTitle") ?? "").trim();
  const accentColor = String(formData.get("accentColor") ?? "").trim() || "#1e3a8a";
  const layout = ["driiv", "classic", "banner"].includes(String(formData.get("layout") ?? "")) ? String(formData.get("layout")) : "driiv";

  if (!projectId || !title || !signatoryName || !signatoryTitle) {
    return { error: "Project, title, and signatory name/title are required." };
  }

  const project = await db.project.findFirst({ where: { id: projectId, ...companyScope(session) } });
  if (!project) return { error: "Project not found." };

  const template = await db.certificateTemplate.create({
    data: { projectId, title, tradeCategory, bodyText, signatoryName, signatoryTitle, accentColor, layout },
  });

  const logoFiles = [1, 2, 3, 4, 5].map((i) => fileOrNull(formData, `logo${i}`)).filter((f): f is File => f !== null);
  const signatureFile = fileOrNull(formData, "signatureImage");
  const stampFile = fileOrNull(formData, "stampImage");

  const logoKeys: string[] = [];
  for (const file of logoFiles) {
    const { fileKey } = await saveUploadedFile(file, `certificate-templates/${template.id}`);
    logoKeys.push(fileKey);
  }
  const signatureImage = signatureFile ? (await saveUploadedFile(signatureFile, `certificate-templates/${template.id}`)).fileKey : null;
  const stampImage = stampFile ? (await saveUploadedFile(stampFile, `certificate-templates/${template.id}`)).fileKey : null;

  const updated = await db.certificateTemplate.update({
    where: { id: template.id },
    data: { logos: JSON.stringify(logoKeys), signatureImage, stampImage },
  });
  await logAudit({ userId: session.sub, entityType: "CertificateTemplate", entityId: updated.id, action: "CREATE", after: updated });

  redirect(`/dashboard/certificates/${updated.id}`);
}

export async function allotCertificateToEvent(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("publishCertificates");

  const certificateTemplateId = String(formData.get("certificateTemplateId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!certificateTemplateId || !eventId) return { error: "Select an event to allot this certificate to." };

  const template = await db.certificateTemplate.findFirst({ where: { id: certificateTemplateId, project: companyScope(session) } });
  if (!template) return { error: "Certificate template not found." };

  const event = await db.event.findFirst({ where: { id: eventId, projectId: template.projectId } });
  if (!event) return { error: "Event not found in this template's project." };
  if (!(await canAccessEvent(session, eventId))) return { error: "You can't allot certificates to events outside your assigned event(s)." };

  const link = await db.eventCertificate.create({ data: { certificateTemplateId, eventId } });
  await logAudit({ userId: session.sub, entityType: "EventCertificate", entityId: link.id, action: "CREATE", after: link });

  revalidatePath(`/dashboard/certificates/${certificateTemplateId}`);
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function publishEventCertificate(formData: FormData) {
  const session = await requireCapability("publishCertificates");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const link = await db.eventCertificate.findFirst({ where: { id, certificateTemplate: { project: companyScope(session) } } });
  if (!link || !(await canAccessEvent(session, link.eventId))) return;

  const updated = await db.eventCertificate.update({ where: { id }, data: { isPublished: true, publishedAt: new Date() } });
  await logAudit({ userId: session.sub, entityType: "EventCertificate", entityId: id, action: "PUBLISH", before: link, after: updated });

  revalidatePath(`/dashboard/certificates/${link.certificateTemplateId}`);
  revalidatePath(`/dashboard/events/${link.eventId}`);
}

export async function unpublishEventCertificate(formData: FormData) {
  const session = await requireCapability("publishCertificates");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const link = await db.eventCertificate.findFirst({ where: { id, certificateTemplate: { project: companyScope(session) } } });
  if (!link || !(await canAccessEvent(session, link.eventId))) return;

  const updated = await db.eventCertificate.update({ where: { id }, data: { isPublished: false, publishedAt: null } });
  await logAudit({ userId: session.sub, entityType: "EventCertificate", entityId: id, action: "UNPUBLISH", before: link, after: updated });

  revalidatePath(`/dashboard/certificates/${link.certificateTemplateId}`);
  revalidatePath(`/dashboard/events/${link.eventId}`);
}

export async function removeEventCertificate(formData: FormData) {
  const session = await requireCapability("publishCertificates");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const link = await db.eventCertificate.findFirst({ where: { id, certificateTemplate: { project: companyScope(session) } } });
  if (!link || !(await canAccessEvent(session, link.eventId))) return;

  await db.eventCertificate.delete({ where: { id } });
  await logAudit({ userId: session.sub, entityType: "EventCertificate", entityId: id, action: "DELETE", before: link });

  revalidatePath(`/dashboard/certificates/${link.certificateTemplateId}`);
  revalidatePath(`/dashboard/events/${link.eventId}`);
}

export async function deleteCertificateTemplate(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("deleteRecords");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing certificate template id." };

  const template = await db.certificateTemplate.findFirst({ where: { id, project: companyScope(session) } });
  if (!template) return { error: "Certificate template not found." };

  // EventCertificate and Certificate both cascade-delete from CertificateTemplate.
  await db.certificateTemplate.delete({ where: { id } });
  await logAudit({ userId: session.sub, entityType: "CertificateTemplate", entityId: id, action: "DELETE", before: template });

  redirect("/dashboard/certificates");
}

export async function revokeCertificate(formData: FormData) {
  const session = await requireCapability("publishCertificates");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const certificate = await db.certificate.findFirst({
    where: { id, eventCertificate: { certificateTemplate: { project: companyScope(session) } } },
    include: { eventCertificate: true },
  });
  if (!certificate) return;

  const updated = await db.certificate.update({ where: { id }, data: { status: "REVOKED" } });
  await logAudit({ userId: session.sub, entityType: "Certificate", entityId: id, action: "REVOKE", before: certificate, after: updated });

  revalidatePath(`/dashboard/certificates/${certificate.eventCertificate.certificateTemplateId}`);
}

export async function reinstateCertificate(formData: FormData) {
  const session = await requireCapability("publishCertificates");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const certificate = await db.certificate.findFirst({
    where: { id, eventCertificate: { certificateTemplate: { project: companyScope(session) } } },
    include: { eventCertificate: true },
  });
  if (!certificate) return;

  const updated = await db.certificate.update({ where: { id }, data: { status: "ACTIVE" } });
  await logAudit({ userId: session.sub, entityType: "Certificate", entityId: id, action: "REINSTATE", before: certificate, after: updated });

  revalidatePath(`/dashboard/certificates/${certificate.eventCertificate.certificateTemplateId}`);
}
