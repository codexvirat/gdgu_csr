import Link from "next/link";
import { requireUser, companyScope } from "@/lib/auth";
import { can, isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { accessibleEventIds } from "@/lib/event-access";
import { Button, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function CertificatesPage() {
  const session = await requireUser();
  if (!can(session.role, "manageCertificates") && !can(session.role, "viewCertificates") && !can(session.role, "publishCertificates")) {
    return <EmptyState title="No access" description="Your role doesn't have access to certificate templates." />;
  }

  const access = await accessibleEventIds(session);
  const templates = await db.certificateTemplate.findMany({
    where: {
      project: {
        ...companyScope(session),
        ...(isEventScopedRole(session.role) && access !== "ALL" ? { events: { some: { id: { in: access } } } } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    include: { project: true, eventCertificates: { include: { certificates: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Certificates"
        description="Per-project certificate designs — allot to events, then participants can claim theirs once they've submitted the assessment or feedback."
        actions={
          can(session.role, "manageCertificates") ? (
            <Link href="/dashboard/certificates/new">
              <Button>New certificate template</Button>
            </Link>
          ) : undefined
        }
      />
      {templates.length === 0 ? (
        <EmptyState title="No certificate templates yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Project</Th>
              <Th>Trade</Th>
              <Th>Allotted events</Th>
              <Th>Issued</Th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const publishedCount = t.eventCertificates.filter((ec) => ec.isPublished).length;
              const issuedCount = t.eventCertificates.reduce((sum, ec) => sum + ec.certificates.length, 0);
              return (
                <tr key={t.id}>
                  <Td>
                    <Link href={`/dashboard/certificates/${t.id}`} className="font-medium text-slate-900 hover:underline">
                      {t.title}
                    </Link>
                  </Td>
                  <Td>{t.project.name}</Td>
                  <Td>{t.tradeCategory ?? "—"}</Td>
                  <Td>
                    {t.eventCertificates.length} ({publishedCount} published)
                  </Td>
                  <Td>{issuedCount}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
