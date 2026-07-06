import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

const STATUS_TONE: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  SCHEDULED: "slate",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  CANCELLED: "red",
};

export default async function MySchedulePage() {
  const session = await requireUser();
  if (session.role !== "TRAINER" && session.role !== "PA") redirect("/dashboard");

  const eventInclude = { project: true, projectCity: true, venue: true, _count: { select: { participants: true } } } as const;

  type ScheduleRow = {
    id: string;
    event: {
      id: string;
      name: string;
      status: string;
      eventDateStart: Date;
      eventDateEnd: Date;
      project: { name: string };
      projectCity: { city: string };
      venue: { name: string } | null;
      _count: { participants: number };
    };
  };

  let name: string;
  let assignments: ScheduleRow[];

  if (session.role === "PA") {
    name = session.name;
    const paAssignments = await db.eventPA.findMany({
      where: { userId: session.sub },
      include: { event: { include: eventInclude } },
      orderBy: { event: { eventDateStart: "asc" } },
    });
    assignments = paAssignments.map((a) => ({ id: a.id, event: a.event }));
  } else {
    const trainer = await db.trainer.findUnique({
      where: { userId: session.sub },
      include: { eventAssignments: { include: { event: { include: eventInclude } }, orderBy: { event: { eventDateStart: "asc" } } } },
    });

    if (!trainer) {
      return (
        <Card className="p-6">
          <p className="text-sm text-slate-600">Your login isn&apos;t linked to a trainer profile yet. Ask an Admin/Ops Manager to link it under Trainers.</p>
        </Card>
      );
    }
    name = trainer.name;
    assignments = trainer.eventAssignments.map((a) => ({ id: a.id, event: a.event }));
  }

  return (
    <div>
      <PageHeader title="My schedule" description={`Assignments for ${name}`} />
      {assignments.length === 0 ? (
        <EmptyState title="No assignments yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Event</Th>
              <Th>Project</Th>
              <Th>City</Th>
              <Th>Venue</Th>
              <Th>Dates</Th>
              <Th>Status</Th>
              <Th>Participants</Th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((ea) => (
              <tr key={ea.id}>
                <Td>
                  <Link href={`/dashboard/events/${ea.event.id}`} className="font-medium text-slate-900 hover:underline">
                    {ea.event.name}
                  </Link>
                </Td>
                <Td>{ea.event.project.name}</Td>
                <Td>{ea.event.projectCity.city}</Td>
                <Td>{ea.event.venue?.name ?? "—"}</Td>
                <Td>
                  {ea.event.eventDateStart.toLocaleDateString()} – {ea.event.eventDateEnd.toLocaleDateString()}
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[ea.event.status]}>{ea.event.status}</Badge>
                </Td>
                <Td>{ea.event._count.participants}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
