import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, companyScope } from "@/lib/auth";
import { can, isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Badge, Button, EmptyState, PageHeader, ProgressBar, Table, Td, Th } from "@/components/ui";

const STATUS_TONE: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  DRAFT: "slate",
  ACTIVE: "green",
  ON_HOLD: "amber",
  COMPLETED: "blue",
  CANCELLED: "red",
};

export default async function ProjectsPage() {
  const session = await requireUser();
  if (isEventScopedRole(session.role)) redirect("/dashboard");
  const projects = await db.project.findMany({
    where: companyScope(session),
    orderBy: { createdAt: "desc" },
    include: { client: true, _count: { select: { participants: true, events: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Client work orders broken into city-wise training targets."
        actions={
          can(session.role, "manageProjects") ? (
            <Link href="/dashboard/projects/new">
              <Button>New project</Button>
            </Link>
          ) : undefined
        }
      />
      {projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Create a client first, then start a project." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Client</Th>
              <Th>Trade</Th>
              <Th>Status</Th>
              <Th>Events</Th>
              <Th>Progress</Th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const pct = p.targetCount > 0 ? Math.round((p._count.participants / p.targetCount) * 100) : 0;
              return (
                <tr key={p.id}>
                  <Td>
                    <Link href={`/dashboard/projects/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.name}
                    </Link>
                  </Td>
                  <Td>{p.client.name}</Td>
                  <Td>{p.tradeCategory}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                  </Td>
                  <Td>{p._count.events}</Td>
                  <Td className="min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <div className="w-28">
                        <ProgressBar value={pct} />
                      </div>
                      <span className="text-xs text-slate-500">
                        {p._count.participants}/{p.targetCount}
                      </span>
                    </div>
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
