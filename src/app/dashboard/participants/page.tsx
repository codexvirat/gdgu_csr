import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, companyScope } from "@/lib/auth";
import { can, isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { maskAadhaar } from "@/lib/crypto";
import { Badge, Button, EmptyState, Field, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui";

const STATUS_TONE: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  REGISTERED: "slate",
  TRAINED: "blue",
  CERTIFIED: "green",
  DROPPED: "red",
};

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; projectId?: string; status?: string }>;
}) {
  const session = await requireUser();
  if (isEventScopedRole(session.role)) redirect("/dashboard");
  const { q, projectId, status } = await searchParams;

  const projects = await db.project.findMany({ where: companyScope(session), orderBy: { name: "asc" }, select: { id: true, name: true } });

  const participants = await db.participant.findMany({
    where: {
      project: companyScope(session),
      ...(projectId ? { projectId } : {}),
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [{ name: { contains: q } }, { mobile: { contains: q } }, { aadhaarLast4: { contains: q } }],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { project: true, event: { include: { projectCity: true } } },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Participants"
        description="Search and manage registered participants across all projects."
        actions={
          can(session.role, "registerParticipants") ? (
            <div className="flex gap-2">
              <Link href="/dashboard/participants/bulk-import">
                <Button variant="secondary">Bulk import</Button>
              </Link>
              <Link href="/dashboard/participants/new">
                <Button>Register participant</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      <form className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4" method="get">
        <Field label="Search" htmlFor="q">
          <Input id="q" name="q" defaultValue={q} placeholder="Name, mobile, Aadhaar last 4" />
        </Field>
        <Field label="Project" htmlFor="projectId">
          <Select id="projectId" name="projectId" defaultValue={projectId ?? ""}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            <option value="REGISTERED">Registered</option>
            <option value="TRAINED">Trained</option>
            <option value="CERTIFIED">Certified</option>
            <option value="DROPPED">Dropped</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" variant="secondary" className="w-full">
            Filter
          </Button>
        </div>
      </form>

      {participants.length === 0 ? (
        <EmptyState title="No participants found" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Aadhaar</Th>
              <Th>Mobile</Th>
              <Th>Project</Th>
              <Th>City / event</Th>
              <Th>Trade</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/dashboard/participants/${p.id}`} className="font-medium text-slate-900 hover:underline">
                    {p.name}
                  </Link>
                </Td>
                <Td>{maskAadhaar(p.aadhaarLast4)}</Td>
                <Td>{p.mobile}</Td>
                <Td>{p.project.name}</Td>
                <Td>{p.event ? `${p.event.projectCity.city} — ${p.event.name}` : "—"}</Td>
                <Td>{p.tradeCategory ?? "—"}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
