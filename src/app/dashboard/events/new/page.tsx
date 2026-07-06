import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { NewEventForm } from "../new-event-form";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const session = await requireCapability("manageEvents");
  const { projectId } = await searchParams;

  const [projects, managers, venues] = await Promise.all([
    db.project.findMany({
      where: companyScope(session),
      orderBy: { name: "asc" },
      select: { id: true, name: true, cities: { select: { id: true, city: true } } },
    }),
    db.user.findMany({
      where: { ...companyScope(session), role: { in: ["ADMIN", "DIRECTOR", "MANAGER"] }, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.venue.findMany({
      where: companyScope(session),
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        city: true,
        capacity: true,
        bookings: { select: { costIncurred: true, bookingDate: true, event: { select: { project: { select: { name: true } } } } } },
      },
    }),
  ]);

  const venueOptions = venues.map((v) => ({
    ...v,
    bookings: v.bookings.map((b) => ({ ...b, bookingDate: b.bookingDate.toISOString() })),
  }));

  return (
    <div>
      <PageHeader title="New event" />
      {projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Create a project with at least one city before scheduling events." />
      ) : (
        <NewEventForm projects={projects} managers={managers} venues={venueOptions} defaultProjectId={projectId} />
      )}
    </div>
  );
}
