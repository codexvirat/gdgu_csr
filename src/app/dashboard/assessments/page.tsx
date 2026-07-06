import Link from "next/link";
import { requireUser, companyScope } from "@/lib/auth";
import { can, isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { accessibleEventIds } from "@/lib/event-access";
import { Button, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function AssessmentsPage() {
  const session = await requireUser();
  if (!can(session.role, "manageAssessments") && !can(session.role, "conductScoreAssessments")) {
    return <EmptyState title="No access" description="Your role doesn't have access to assessments." />;
  }

  const access = await accessibleEventIds(session);
  const assessments = await db.assessment.findMany({
    where: {
      project: {
        ...companyScope(session),
        ...(isEventScopedRole(session.role) && access !== "ALL" ? { events: { some: { id: { in: access } } } } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    include: { project: true, questions: true, results: true, eventAssessments: true },
  });

  return (
    <div>
      <PageHeader
        title="Assessments"
        description="MCQ question banks and pass/fail results per project."
        actions={
          can(session.role, "manageAssessments") ? (
            <Link href="/dashboard/assessments/new">
              <Button>New assessment</Button>
            </Link>
          ) : undefined
        }
      />
      {assessments.length === 0 ? (
        <EmptyState title="No assessments yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Project</Th>
              <Th>Trade</Th>
              <Th>Questions</Th>
              <Th>Pass mark</Th>
              <Th>Allotted events</Th>
              <Th>Attempts</Th>
              <Th>Pass rate</Th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => {
              const passCount = a.results.filter((r) => r.status === "PASS").length;
              const passRate = a.results.length ? Math.round((passCount / a.results.length) * 100) : null;
              const publishedCount = a.eventAssessments.filter((ea) => ea.isPublished).length;
              return (
                <tr key={a.id}>
                  <Td>
                    <Link href={`/dashboard/assessments/${a.id}`} className="font-medium text-slate-900 hover:underline">
                      {a.title}
                    </Link>
                  </Td>
                  <Td>{a.project.name}</Td>
                  <Td>{a.tradeCategory ?? "—"}</Td>
                  <Td>{a.questions.length}</Td>
                  <Td>
                    {a.passMark} / {a.totalMarks}
                  </Td>
                  <Td>
                    {a.eventAssessments.length} ({publishedCount} published)
                  </Td>
                  <Td>{a.results.length}</Td>
                  <Td>{passRate != null ? `${passRate}%` : "—"}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
