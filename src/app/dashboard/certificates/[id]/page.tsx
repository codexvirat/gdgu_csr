import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, companyScope } from "@/lib/auth";
import { can, isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { accessibleEventIds } from "@/lib/event-access";
import { deleteCertificateTemplate, publishEventCertificate, unpublishEventCertificate, removeEventCertificate, revokeCertificate, reinstateCertificate } from "../actions";
import { AllotCertificateForm } from "../allot-certificate-form";
import { CertificatePreview } from "../certificate-preview";
import { DeleteButton } from "@/components/delete-button";
import { Badge, Button, Card, Input, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function CertificateTemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;
  const { q } = await searchParams;

  const template = await db.certificateTemplate.findFirst({
    where: { id, project: companyScope(session) },
    include: {
      project: true,
      eventCertificates: {
        include: {
          event: true,
          certificates: {
            where: q ? { participant: { name: { contains: q } } } : undefined,
            include: { participant: true, event: true },
            orderBy: { issuedAt: "desc" },
          },
        },
        orderBy: { allottedAt: "asc" },
      },
    },
  });
  if (!template) notFound();

  const access = await accessibleEventIds(session);
  if (isEventScopedRole(session.role) && access !== "ALL") {
    const hasAccessibleEvent = await db.event.count({ where: { projectId: template.projectId, id: { in: access } } });
    if (!hasAccessibleEvent) notFound();
  }

  const canManage = can(session.role, "manageCertificates");
  const canPublish = can(session.role, "publishCertificates");

  const visibleEventCertificates =
    isEventScopedRole(session.role) && access !== "ALL" ? template.eventCertificates.filter((ec) => access.includes(ec.eventId)) : template.eventCertificates;

  const candidateEvents = canPublish
    ? await db.event.findMany({
        where: {
          projectId: template.projectId,
          id: {
            notIn: template.eventCertificates.map((ec) => ec.eventId),
            ...(isEventScopedRole(session.role) && access !== "ALL" ? { in: access } : {}),
          },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const logos: string[] = (() => {
    try {
      return JSON.parse(template.logos || "[]");
    } catch {
      return [];
    }
  })();
  const issuedCertificates = visibleEventCertificates.flatMap((ec) => ec.certificates.map((c) => ({ ...c, eventName: ec.event.name })));

  return (
    <div className="space-y-6">
      <PageHeader
        title={template.title}
        description={`${template.project.name}${template.tradeCategory ? ` · ${template.tradeCategory}` : ""}`}
        actions={
          can(session.role, "deleteRecords") ? (
            <DeleteButton
              action={deleteCertificateTemplate}
              hiddenFields={{ id: template.id }}
              confirmText={template.title}
              label="Delete certificate template"
              description="This permanently deletes the certificate template, its event allotments, and every issued certificate."
            />
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Logos</p>
          <p className="mt-1 text-sm text-slate-800">{logos.length} / 5</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Allotted events</p>
          <p className="mt-1 text-sm text-slate-800">{template.eventCertificates.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Issued certificates</p>
          <p className="mt-1 text-sm text-slate-800">{issuedCertificates.length}</p>
        </Card>
      </div>

      {canManage && (
        <Card className="p-4">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Certificate preview</h2>
          <div className="overflow-x-auto">
            <CertificatePreview template={template} />
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Allotted events</h2>
        {visibleEventCertificates.length === 0 ? (
          <p className="mb-3 text-sm text-slate-500">Not allotted to any event yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>Status</Th>
                <Th>Allotted</Th>
                <Th>Issued</Th>
                {canPublish && <Th> </Th>}
              </tr>
            </thead>
            <tbody>
              {visibleEventCertificates.map((ec) => (
                <tr key={ec.id}>
                  <Td>
                    <Link href={`/dashboard/events/${ec.eventId}`} className="font-medium text-slate-900 hover:underline">
                      {ec.event.name}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={ec.isPublished ? "green" : "slate"}>{ec.isPublished ? "Published" : "Draft"}</Badge>
                  </Td>
                  <Td>{ec.allottedAt.toLocaleDateString()}</Td>
                  <Td>{ec.certificates.length}</Td>
                  {canPublish && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        <form action={ec.isPublished ? unpublishEventCertificate : publishEventCertificate}>
                          <input type="hidden" name="id" value={ec.id} />
                          <button type="submit" className="text-sm text-slate-600 hover:underline">
                            {ec.isPublished ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                        <form action={removeEventCertificate}>
                          <input type="hidden" name="id" value={ec.id} />
                          <button type="submit" className="text-sm text-red-600 hover:underline">
                            Remove
                          </button>
                        </form>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {canPublish && (
          <div className="mt-3">
            <AllotCertificateForm fixedCertificateTemplateId={template.id} options={candidateEvents.map((e) => ({ id: e.id, label: e.name }))} />
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Issued certificates</h2>
          <form method="get" className="flex gap-2">
            <Input name="q" defaultValue={q} placeholder="Search participant" className="w-48" />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </div>
        {issuedCertificates.length === 0 ? (
          <p className="text-sm text-slate-500">No certificates issued yet — they appear once a participant claims one from their trainee portal.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Participant</Th>
                <Th>Event</Th>
                <Th>Certificate No</Th>
                <Th>Issued</Th>
                <Th>Status</Th>
                {canPublish && <Th> </Th>}
              </tr>
            </thead>
            <tbody>
              {issuedCertificates.map((c) => (
                <tr key={c.id}>
                  <Td>{c.participant.name}</Td>
                  <Td>{c.eventName}</Td>
                  <Td>
                    <a href={`/api/files/${c.fileUrl}?name=${c.certificateNumber}.pdf`} className="font-medium text-slate-900 hover:underline">
                      {c.certificateNumber}
                    </a>
                  </Td>
                  <Td>{c.issuedAt.toLocaleString()}</Td>
                  <Td>
                    <Badge tone={c.status === "ACTIVE" ? "green" : "red"}>{c.status}</Badge>
                  </Td>
                  {canPublish && (
                    <Td className="text-right">
                      <form action={c.status === "ACTIVE" ? revokeCertificate : reinstateCertificate}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className={c.status === "ACTIVE" ? "text-sm text-red-600 hover:underline" : "text-sm text-slate-600 hover:underline"}>
                          {c.status === "ACTIVE" ? "Revoke" : "Reinstate"}
                        </button>
                      </form>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
