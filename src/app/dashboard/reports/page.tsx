import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button, Card, PageHeader, ProgressBar, Table, Td, Th } from "@/components/ui";

export default async function ReportsPage() {
  const session = await requireCapability("viewReports");

  const events = await db.event.findMany({
    where: { project: companyScope(session) },
    orderBy: [{ project: { name: "asc" } }, { eventDateStart: "asc" }],
    include: {
      project: { include: { client: true } },
      projectCity: true,
      participants: { include: { attendances: true } },
    },
  });

  const projects = await db.project.findMany({
    where: companyScope(session),
    include: { client: true, _count: { select: { participants: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Target vs. achieved and attendance summaries across all projects."
        actions={
          <div className="flex gap-2">
            <a href="/api/export/report?format=csv">
              <Button variant="secondary">Overall CSV</Button>
            </a>
            <a href="/api/export/report?format=xlsx">
              <Button variant="secondary">Overall Excel</Button>
            </a>
          </div>
        }
      />

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Project-level summary</h2>
        <Table>
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Client</Th>
              <Th>Target</Th>
              <Th>Registered</Th>
              <Th>Completion</Th>
              <Th>Download</Th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const pct = p.targetCount > 0 ? Math.round((p._count.participants / p.targetCount) * 100) : 0;
              return (
                <tr key={p.id}>
                  <Td>{p.name}</Td>
                  <Td>{p.client.name}</Td>
                  <Td>{p.targetCount}</Td>
                  <Td>{p._count.participants}</Td>
                  <Td className="min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <div className="w-28">
                        <ProgressBar value={pct} />
                      </div>
                      <span className="text-xs text-slate-500">{pct}%</span>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex gap-3 whitespace-nowrap">
                      <a
                        href={`/api/export/report?format=csv&projectId=${p.id}`}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        CSV
                      </a>
                      <a
                        href={`/api/export/report?format=xlsx&projectId=${p.id}`}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        Excel
                      </a>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Event / attendance summary</h2>
        <Table>
          <thead>
            <tr>
              <Th>Event</Th>
              <Th>Project</Th>
              <Th>City</Th>
              <Th>Target</Th>
              <Th>Registered</Th>
              <Th>Checked in</Th>
              <Th>Checked out</Th>
              <Th>Attendance %</Th>
              <Th>Download</Th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const registered = e.participants.length;
              const checkedIn = e.participants.filter((p) => p.attendances[0]?.checkInAt).length;
              const checkedOut = e.participants.filter((p) => p.attendances[0]?.checkOutAt).length;
              const attendancePct = registered > 0 ? Math.round((checkedIn / registered) * 100) : 0;
              return (
                <tr key={e.id}>
                  <Td>{e.name}</Td>
                  <Td>{e.project.name}</Td>
                  <Td>{e.projectCity.city}</Td>
                  <Td>{e.targetCount}</Td>
                  <Td>{registered}</Td>
                  <Td>{checkedIn}</Td>
                  <Td>{checkedOut}</Td>
                  <Td>{attendancePct}%</Td>
                  <Td>
                    <div className="flex gap-3 whitespace-nowrap">
                      <a
                        href={`/api/export/report?format=csv&eventId=${e.id}`}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        CSV
                      </a>
                      <a
                        href={`/api/export/report?format=xlsx&eventId=${e.id}`}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        Excel
                      </a>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
