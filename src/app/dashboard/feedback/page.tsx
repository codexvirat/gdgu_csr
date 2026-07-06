import Link from "next/link";
import { requireUser, companyScope } from "@/lib/auth";
import { can, isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { accessibleEventIds } from "@/lib/event-access";
import { Button, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function FeedbackPage() {
  const session = await requireUser();
  if (!can(session.role, "manageFeedback") && !can(session.role, "viewFeedback")) {
    return <EmptyState title="No access" description="Your role doesn't have access to feedback forms." />;
  }

  const access = await accessibleEventIds(session);
  const forms = await db.feedbackForm.findMany({
    where: {
      project: {
        ...companyScope(session),
        ...(isEventScopedRole(session.role) && access !== "ALL" ? { events: { some: { id: { in: access } } } } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    include: { project: true, questions: true, responses: true, eventFeedbacks: true },
  });

  return (
    <div>
      <PageHeader
        title="Feedback forms"
        description="Post-event feedback collected directly from trainees — every event gets feedback, with or without an assessment."
        actions={
          can(session.role, "manageFeedback") ? (
            <Link href="/dashboard/feedback/new">
              <Button>New feedback form</Button>
            </Link>
          ) : undefined
        }
      />
      {forms.length === 0 ? (
        <EmptyState title="No feedback forms yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Project</Th>
              <Th>Trade</Th>
              <Th>Questions</Th>
              <Th>Allotted events</Th>
              <Th>Responses</Th>
            </tr>
          </thead>
          <tbody>
            {forms.map((f) => {
              const publishedCount = f.eventFeedbacks.filter((ef) => ef.isPublished).length;
              return (
                <tr key={f.id}>
                  <Td>
                    <Link href={`/dashboard/feedback/${f.id}`} className="font-medium text-slate-900 hover:underline">
                      {f.title}
                    </Link>
                  </Td>
                  <Td>{f.project.name}</Td>
                  <Td>{f.tradeCategory ?? "—"}</Td>
                  <Td>{f.questions.length}</Td>
                  <Td>
                    {f.eventFeedbacks.length} ({publishedCount} published)
                  </Td>
                  <Td>{f.responses.length}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
