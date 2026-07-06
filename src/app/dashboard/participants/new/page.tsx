import { requireCapability, companyScope } from "@/lib/auth";
import { isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { accessibleEventIds } from "@/lib/event-access";
import { EmptyState, PageHeader } from "@/components/ui";
import { ParticipantForm } from "../participant-form";

export default async function NewParticipantPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; eventId?: string }>;
}) {
  const session = await requireCapability("registerParticipants");
  const { projectId, eventId } = await searchParams;

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

  let resolvedProjectId = projectId;
  if (!resolvedProjectId && eventId) {
    resolvedProjectId = projectOptions.find((p) => p.events.some((e) => e.id === eventId))?.id;
  }
  if (!resolvedProjectId && isEventScopedRole(session.role) && projectOptions.length === 1) {
    resolvedProjectId = projectOptions[0].id;
  }
  const resolvedEventId = eventId ?? (isEventScopedRole(session.role) && projectOptions.length === 1 && projectOptions[0].events.length === 1 ? projectOptions[0].events[0].id : undefined);

  return (
    <div>
      <PageHeader title="Register participant" />
      {projectOptions.length === 0 ? (
        <EmptyState
          title="No events available"
          description={isEventScopedRole(session.role) ? "You're not assigned to an event yet." : "Create a project before registering participants."}
        />
      ) : (
        <ParticipantForm projects={projectOptions} managers={managers} defaultProjectId={resolvedProjectId} defaultEventId={resolvedEventId} />
      )}
    </div>
  );
}
