import { requireCapability, companyScope } from "@/lib/auth";
import { isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { accessibleEventIds } from "@/lib/event-access";
import { Button, PageHeader } from "@/components/ui";
import { BulkImportForm } from "./bulk-import-form";

export default async function BulkImportPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const session = await requireCapability("registerParticipants");
  const { eventId } = await searchParams;

  const [projects, managers, eventAccess] = await Promise.all([
    db.project.findMany({
      where: companyScope(session),
      orderBy: { name: "asc" },
      select: { id: true, name: true, events: { select: { id: true, name: true, projectCity: { select: { city: true } } } } },
    }),
    db.user.findMany({
      where: { ...companyScope(session), role: { in: ["ADMIN", "DIRECTOR", "MANAGER"] }, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    accessibleEventIds(session),
  ]);

  let projectOptions = projects.map((p) => ({
    id: p.id,
    name: p.name,
    events: p.events.map((e) => ({ id: e.id, name: e.name, city: e.projectCity.city })),
  }));

  if (isEventScopedRole(session.role) && eventAccess !== "ALL") {
    projectOptions = projectOptions
      .map((p) => ({ ...p, events: p.events.filter((e) => eventAccess.includes(e.id)) }))
      .filter((p) => p.events.length > 0);
  }

  const defaultProjectId = eventId ? projectOptions.find((p) => p.events.some((e) => e.id === eventId))?.id : undefined;

  return (
    <div>
      <PageHeader
        title="Bulk import participants"
        description="Upload a CSV or Excel file to register many trainees at once."
        actions={
          <a href="/api/participants/import-template">
            <Button variant="secondary">Download template</Button>
          </a>
        }
      />
      <BulkImportForm projects={projectOptions} managers={managers} defaultProjectId={defaultProjectId} defaultEventId={eventId} />
    </div>
  );
}
