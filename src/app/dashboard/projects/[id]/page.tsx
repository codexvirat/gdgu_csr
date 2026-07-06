import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, companyScope } from "@/lib/auth";
import { can, isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { addProjectCity, uploadProjectDocument, deleteProject } from "../actions";
import { DeleteButton } from "@/components/delete-button";
import { Badge, Button, Card, Field, Input, PageHeader, ProgressBar, Table, Td, Th } from "@/components/ui";

const STATUS_TONE: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  DRAFT: "slate",
  ACTIVE: "green",
  ON_HOLD: "amber",
  COMPLETED: "blue",
  CANCELLED: "red",
  SCHEDULED: "slate",
  IN_PROGRESS: "blue",
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (isEventScopedRole(session.role)) notFound();
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, ...companyScope(session) },
    include: {
      client: true,
      documents: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: true } },
      cities: {
        include: {
          events: { select: { id: true, _count: { select: { participants: true } } } },
        },
      },
      events: {
        orderBy: { eventDateStart: "asc" },
        include: { projectCity: true, opsManager: true, _count: { select: { participants: true } } },
      },
      _count: { select: { participants: true } },
    },
  });
  if (!project) notFound();

  const manage = can(session.role, "manageProjects");
  const pct = project.targetCount > 0 ? Math.round((project._count.participants / project.targetCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={`${project.client.name} · ${project.tradeCategory}`}
        actions={
          <div className="flex items-center gap-2">
            {manage && (
              <Link href={`/dashboard/projects/${project.id}/edit`}>
                <Button variant="secondary">Edit project</Button>
              </Link>
            )}
            {can(session.role, "deleteRecords") && (
              <DeleteButton
                action={deleteProject}
                hiddenFields={{ id: project.id }}
                confirmText={project.name}
                label="Delete project"
                description="This permanently deletes the project and every city, event, participant, assessment, and feedback form under it."
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-1">
            <Badge tone={STATUS_TONE[project.status]}>{project.status}</Badge>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Timeline</p>
          <p className="mt-1 text-sm text-slate-800">
            {project.startDate.toLocaleDateString()} – {project.endDate.toLocaleDateString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Budget</p>
          <p className="mt-1 text-sm text-slate-800">{project.budgetTotal ? `₹${project.budgetTotal.toLocaleString("en-IN")}` : "Not set"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Progress</p>
          <p className="mt-1 text-sm text-slate-800">
            {project._count.participants} / {project.targetCount} ({pct}%)
          </p>
          <div className="mt-2">
            <ProgressBar value={pct} />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Cities & sub-targets</h2>
        <Table>
          <thead>
            <tr>
              <Th>City</Th>
              <Th>Target</Th>
              <Th>Achieved</Th>
              <Th>Progress</Th>
            </tr>
          </thead>
          <tbody>
            {project.cities.map((c) => {
              const achieved = c.events.reduce((sum, e) => sum + e._count.participants, 0);
              const cityPct = c.targetCount > 0 ? Math.round((achieved / c.targetCount) * 100) : 0;
              return (
                <tr key={c.id}>
                  <Td>{c.city}</Td>
                  <Td>{c.targetCount}</Td>
                  <Td>{achieved}</Td>
                  <Td className="min-w-[140px]">
                    <ProgressBar value={cityPct} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {manage && (
          <form action={addProjectCity} className="mt-4 flex items-end gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <Field label="Add city" htmlFor="city">
              <Input id="city" name="city" required placeholder="City" />
            </Field>
            <Field label="Target" htmlFor="targetCount">
              <Input id="targetCount" name="targetCount" type="number" min={1} required className="w-32" />
            </Field>
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Events</h2>
          {manage && (
            <Link href={`/dashboard/events/new?projectId=${project.id}`}>
              <Button variant="secondary">New event</Button>
            </Link>
          )}
        </div>
        {project.events.length === 0 ? (
          <p className="text-sm text-slate-500">No events scheduled yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>City</Th>
                <Th>Dates</Th>
                <Th>Ops Manager</Th>
                <Th>Status</Th>
                <Th>Headcount</Th>
              </tr>
            </thead>
            <tbody>
              {project.events.map((e) => (
                <tr key={e.id}>
                  <Td>
                    <Link href={`/dashboard/events/${e.id}`} className="font-medium text-slate-900 hover:underline">
                      {e.name}
                    </Link>
                  </Td>
                  <Td>{e.projectCity.city}</Td>
                  <Td>
                    {e.eventDateStart.toLocaleDateString()} – {e.eventDateEnd.toLocaleDateString()}
                  </Td>
                  <Td>{e.opsManager?.name ?? "—"}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                  </Td>
                  <Td>
                    {e._count.participants} / {e.targetCount}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Work order & documents</h2>
        {project.documents.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">No documents uploaded yet.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {project.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm">
                <a
                  href={`/api/files/${d.fileUrl}?name=${encodeURIComponent(d.fileName)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-700 hover:underline"
                >
                  {d.fileName}
                </a>
                <span className="text-xs text-slate-500">
                  v{d.version} · {d.uploadedBy.name} · {d.uploadedAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        {manage && (
          <form action={uploadProjectDocument} className="flex items-end gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <Input name="file" type="file" required />
            <Button type="submit" variant="secondary">
              Upload
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
