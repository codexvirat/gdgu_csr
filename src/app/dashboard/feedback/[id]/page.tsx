import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, companyScope } from "@/lib/auth";
import { can, isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { accessibleEventIds } from "@/lib/event-access";
import { addFeedbackQuestion, deleteFeedbackForm, publishEventFeedback, unpublishEventFeedback, removeEventFeedback } from "../actions";
import { AllotFeedbackForm } from "../allot-feedback-form";
import { DeleteButton } from "@/components/delete-button";
import { Badge, Button, Card, Field, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui";

export default async function FeedbackFormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;
  const { q } = await searchParams;

  const form = await db.feedbackForm.findFirst({
    where: { id, project: companyScope(session) },
    include: {
      project: true,
      questions: true,
      eventFeedbacks: { include: { event: true }, orderBy: { allottedAt: "asc" } },
      responses: {
        where: q ? { participant: { name: { contains: q } } } : undefined,
        include: { participant: true, event: true, answers: true },
        orderBy: { submittedAt: "desc" },
      },
    },
  });
  if (!form) notFound();

  const access = await accessibleEventIds(session);
  if (isEventScopedRole(session.role) && access !== "ALL") {
    const hasAccessibleEvent = await db.event.count({ where: { projectId: form.projectId, id: { in: access } } });
    if (!hasAccessibleEvent) notFound();
  }

  const canManage = can(session.role, "manageFeedback");
  const canPublish = can(session.role, "publishFeedback");

  const visibleEventFeedbacks =
    isEventScopedRole(session.role) && access !== "ALL" ? form.eventFeedbacks.filter((ef) => access.includes(ef.eventId)) : form.eventFeedbacks;

  const candidateEvents = canPublish
    ? await db.event.findMany({
        where: {
          projectId: form.projectId,
          id: {
            notIn: form.eventFeedbacks.map((ef) => ef.eventId),
            ...(isEventScopedRole(session.role) && access !== "ALL" ? { in: access } : {}),
          },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={form.title}
        description={`${form.project.name}${form.tradeCategory ? ` · ${form.tradeCategory}` : ""}`}
        actions={
          can(session.role, "deleteRecords") ? (
            <DeleteButton
              action={deleteFeedbackForm}
              hiddenFields={{ id: form.id }}
              confirmText={form.title}
              label="Delete feedback form"
              description="This permanently deletes the feedback form, its question bank, and every submitted response."
            />
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Questions</p>
          <p className="mt-1 text-sm text-slate-800">{form.questions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Responses</p>
          <p className="mt-1 text-sm text-slate-800">{form.responses.length}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Allotted events</h2>
        {visibleEventFeedbacks.length === 0 ? (
          <p className="mb-3 text-sm text-slate-500">Not allotted to any event yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>Status</Th>
                <Th>Allotted</Th>
                {canPublish && <Th> </Th>}
              </tr>
            </thead>
            <tbody>
              {visibleEventFeedbacks.map((ef) => (
                <tr key={ef.id}>
                  <Td>
                    <Link href={`/dashboard/events/${ef.eventId}`} className="font-medium text-slate-900 hover:underline">
                      {ef.event.name}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={ef.isPublished ? "green" : "slate"}>{ef.isPublished ? "Published" : "Draft"}</Badge>
                  </Td>
                  <Td>{ef.allottedAt.toLocaleDateString()}</Td>
                  {canPublish && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        <form action={ef.isPublished ? unpublishEventFeedback : publishEventFeedback}>
                          <input type="hidden" name="id" value={ef.id} />
                          <button type="submit" className="text-sm text-slate-600 hover:underline">
                            {ef.isPublished ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                        <form action={removeEventFeedback}>
                          <input type="hidden" name="id" value={ef.id} />
                          <button type="submit" className="text-sm text-red-600 hover:underline">
                            Remove
                          </button>
                        </form>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {canPublish && (
          <div className="mt-3">
            <AllotFeedbackForm fixedFeedbackFormId={form.id} options={candidateEvents.map((e) => ({ id: e.id, label: e.name }))} />
          </div>
        )}
      </Card>

      {canManage && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Question bank</h2>
          <ul className="mb-4 space-y-2 text-sm">
            {form.questions.map((qn, i) => (
              <li key={qn.id} className="border-b border-slate-100 pb-1">
                {i + 1}. {qn.questionText} <span className="text-xs text-slate-400">({qn.type === "RATING" ? "Rating 1–5" : "Text"})</span>
              </li>
            ))}
          </ul>
          <form action={addFeedbackQuestion} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="feedbackFormId" value={form.id} />
            <Field label="New question" htmlFor="questionText">
              <Input id="questionText" name="questionText" required className="w-64" />
            </Field>
            <Field label="Type" htmlFor="type">
              <Select id="type" name="type" defaultValue="RATING" className="w-40">
                <option value="RATING">Rating (1–5)</option>
                <option value="TEXT">Text answer</option>
              </Select>
            </Field>
            <Button type="submit" variant="secondary">
              Add question
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Responses</h2>
          <form method="get" className="flex gap-2">
            <Input name="q" defaultValue={q} placeholder="Search participant" className="w-48" />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </div>
        {form.responses.length === 0 ? (
          <p className="text-sm text-slate-500">No responses submitted yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Participant</Th>
                <Th>Event</Th>
                {form.questions.map((qn) => (
                  <Th key={qn.id}>{qn.questionText}</Th>
                ))}
                <Th>Submitted</Th>
              </tr>
            </thead>
            <tbody>
              {form.responses.map((r) => (
                <tr key={r.id}>
                  <Td>{r.participant.name}</Td>
                  <Td>{r.event.name}</Td>
                  {form.questions.map((qn) => {
                    const answer = r.answers.find((a) => a.questionId === qn.id);
                    return <Td key={qn.id}>{answer ? (qn.type === "RATING" ? `★ ${answer.ratingValue ?? "—"}` : answer.textValue ?? "—") : "—"}</Td>;
                  })}
                  <Td>{r.submittedAt.toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
