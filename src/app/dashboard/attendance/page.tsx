import Link from "next/link";
import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { accessibleEventIds, eventWhereFragment } from "@/lib/event-access";
import { Badge, Button, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function AttendancePage() {
  const session = await requireCapability("markAttendance");
  const access = await accessibleEventIds(session);
  const events = await db.event.findMany({
    where: { project: companyScope(session), status: { in: ["SCHEDULED", "IN_PROGRESS"] }, ...eventWhereFragment(access) },
    orderBy: { eventDateStart: "asc" },
    include: { project: true, projectCity: true, _count: { select: { participants: true } } },
  });

  return (
    <div>
      <PageHeader title="Attendance" description="Pick an event to scan QR check-in/out, or use manual entry." />
      {events.length === 0 ? (
        <EmptyState title="No active events" description="Scheduled or in-progress events will appear here." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Event</Th>
              <Th>Project</Th>
              <Th>City</Th>
              <Th>Dates</Th>
              <Th>Status</Th>
              <Th>Registered</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <Td>{e.name}</Td>
                <Td>{e.project.name}</Td>
                <Td>{e.projectCity.city}</Td>
                <Td>
                  {e.eventDateStart.toLocaleDateString()} – {e.eventDateEnd.toLocaleDateString()}
                </Td>
                <Td>
                  <Badge tone={e.status === "IN_PROGRESS" ? "blue" : "slate"}>{e.status}</Badge>
                </Td>
                <Td>{e._count.participants}</Td>
                <Td className="text-right">
                  <Link href={`/dashboard/attendance/${e.id}/scan`}>
                    <Button variant="secondary">Scan</Button>
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
