import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, companyScope } from "@/lib/auth";
import { can, isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { isEventBehindTarget } from "@/lib/event-status";
import { Badge, Button, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

const STATUS_TONE: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  SCHEDULED: "slate",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  CANCELLED: "red",
};

export default async function EventsPage() {
  const session = await requireUser();
  if (isEventScopedRole(session.role)) redirect("/dashboard");
  const events = await db.event.findMany({
    where: { project: companyScope(session) },
    orderBy: { eventDateStart: "desc" },
    include: { project: true, projectCity: true, opsManager: true, _count: { select: { participants: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Events & batches"
        description="City-wise, date-wise training batches under each project."
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/events/calendar">
              <Button variant="secondary">Calendar view</Button>
            </Link>
            {can(session.role, "manageEvents") && (
              <Link href="/dashboard/events/new">
                <Button>New event</Button>
              </Link>
            )}
          </div>
        }
      />
      {events.length === 0 ? (
        <EmptyState title="No events yet" description="Create a project, then schedule events under it." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Event</Th>
              <Th>Project</Th>
              <Th>City</Th>
              <Th>Dates</Th>
              <Th>Manager</Th>
              <Th>Status</Th>
              <Th>Headcount</Th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const behind = isEventBehindTarget(e, e._count.participants);
              return (
                <tr key={e.id}>
                  <Td>
                    <Link href={`/dashboard/events/${e.id}`} className="font-medium text-slate-900 hover:underline">
                      {e.name}
                    </Link>
                  </Td>
                  <Td>{e.project.name}</Td>
                  <Td>{e.projectCity.city}</Td>
                  <Td>
                    {e.eventDateStart.toLocaleDateString()} – {e.eventDateEnd.toLocaleDateString()}
                  </Td>
                  <Td>{e.opsManager?.name ?? "—"}</Td>
                  <Td className="space-x-1">
                    <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                    {behind && <Badge tone="red">Behind target</Badge>}
                  </Td>
                  <Td>
                    {e._count.participants} / {e.targetCount}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
