import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, companyScope } from "@/lib/auth";
import { can, isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { accessibleEventIds } from "@/lib/event-access";
import { addQuestion, deleteAssessment, publishEventAssessment, unpublishEventAssessment, removeEventAssessment } from "../actions";
import { AllotAssessmentForm } from "../allot-assessment-form";
import { ScoreForm } from "../score-form";
import { DeleteButton } from "@/components/delete-button";
import { Badge, Button, Card, Field, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui";

export default async function AssessmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;
  const { q } = await searchParams;

  const assessment = await db.assessment.findFirst({
    where: { id, project: companyScope(session) },
    include: {
      project: true,
      questions: true,
      eventAssessments: { include: { event: true }, orderBy: { allottedAt: "asc" } },
      results: {
        where: q ? { participant: { name: { contains: q } } } : undefined,
        include: { participant: true, event: true },
        orderBy: { attemptedAt: "desc" },
      },
    },
  });
  if (!assessment) notFound();

  const access = await accessibleEventIds(session);
  if (isEventScopedRole(session.role) && access !== "ALL") {
    const hasAccessibleEvent = await db.event.count({ where: { projectId: assessment.projectId, id: { in: access } } });
    if (!hasAccessibleEvent) notFound();
  }

  const canManage = can(session.role, "manageAssessments");
  const canScore = can(session.role, "conductScoreAssessments");
  const canPublish = can(session.role, "publishAssessments");

  const participants = canScore
    ? await db.participant.findMany({
        where: {
          projectId: assessment.projectId,
          ...(isEventScopedRole(session.role) && access !== "ALL" ? { eventId: { in: access } } : {}),
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, eventId: true },
      })
    : [];

  const visibleEventAssessments =
    isEventScopedRole(session.role) && access !== "ALL" ? assessment.eventAssessments.filter((ea) => access.includes(ea.eventId)) : assessment.eventAssessments;

  const candidateEvents = canPublish
    ? await db.event.findMany({
        where: {
          projectId: assessment.projectId,
          requiresAssessment: true,
          id: {
            notIn: assessment.eventAssessments.map((ea) => ea.eventId),
            ...(isEventScopedRole(session.role) && access !== "ALL" ? { in: access } : {}),
          },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const questionsForScoring = assessment.questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    options: JSON.parse(q.options) as string[],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={assessment.title}
        description={`${assessment.project.name}${assessment.tradeCategory ? ` · ${assessment.tradeCategory}` : ""}`}
        actions={
          can(session.role, "deleteRecords") ? (
            <DeleteButton
              action={deleteAssessment}
              hiddenFields={{ id: assessment.id }}
              confirmText={assessment.title}
              label="Delete assessment"
              description="This permanently deletes the assessment, its question bank, and every recorded result."
            />
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pass mark</p>
          <p className="mt-1 text-sm text-slate-800">
            {assessment.passMark} / {assessment.totalMarks}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Questions</p>
          <p className="mt-1 text-sm text-slate-800">{assessment.questions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Attempts</p>
          <p className="mt-1 text-sm text-slate-800">{assessment.results.length}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Allotted events</h2>
        {visibleEventAssessments.length === 0 ? (
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
              {visibleEventAssessments.map((ea) => (
                <tr key={ea.id}>
                  <Td>
                    <Link href={`/dashboard/events/${ea.eventId}`} className="font-medium text-slate-900 hover:underline">
                      {ea.event.name}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={ea.isPublished ? "green" : "slate"}>{ea.isPublished ? "Published" : "Draft"}</Badge>
                  </Td>
                  <Td>{ea.allottedAt.toLocaleDateString()}</Td>
                  {canPublish && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        <form action={ea.isPublished ? unpublishEventAssessment : publishEventAssessment}>
                          <input type="hidden" name="id" value={ea.id} />
                          <button type="submit" className="text-sm text-slate-600 hover:underline">
                            {ea.isPublished ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                        <form action={removeEventAssessment}>
                          <input type="hidden" name="id" value={ea.id} />
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
            <AllotAssessmentForm fixedAssessmentId={assessment.id} options={candidateEvents.map((e) => ({ id: e.id, label: e.name }))} />
          </div>
        )}
      </Card>

      {canScore && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Record a result</h2>
          <ScoreForm
            assessmentId={assessment.id}
            participants={participants}
            questions={questionsForScoring}
            passMark={assessment.passMark}
            totalMarks={assessment.totalMarks}
          />
        </Card>
      )}

      {canManage && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Question bank</h2>
          <ul className="mb-4 space-y-2 text-sm">
            {assessment.questions.map((qn, i) => (
              <li key={qn.id} className="border-b border-slate-100 pb-1">
                {i + 1}. {qn.questionText}
              </li>
            ))}
          </ul>
          <form action={addQuestion} className="space-y-2">
            <input type="hidden" name="assessmentId" value={assessment.id} />
            <Field label="New question" htmlFor="questionText">
              <Input id="questionText" name="questionText" required />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Input key={i} name={`option${i}`} placeholder={`Option ${i + 1}`} required />
              ))}
            </div>
            <Field label="Correct option" htmlFor="correctOption">
              <Select id="correctOption" name="correctOption" defaultValue="0" className="w-40">
                <option value="0">Option 1</option>
                <option value="1">Option 2</option>
                <option value="2">Option 3</option>
                <option value="3">Option 4</option>
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
          <h2 className="text-sm font-semibold text-slate-900">Result repository</h2>
          <form method="get" className="flex gap-2">
            <Input name="q" defaultValue={q} placeholder="Search participant" className="w-48" />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </div>
        {assessment.results.length === 0 ? (
          <p className="text-sm text-slate-500">No attempts recorded yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Participant</Th>
                <Th>Event</Th>
                <Th>Attempted</Th>
                <Th>Correct</Th>
                <Th>Score</Th>
                <Th>Status</Th>
                <Th>Mode</Th>
                <Th>Attempted at</Th>
              </tr>
            </thead>
            <tbody>
              {assessment.results.map((r) => (
                <tr key={r.id}>
                  <Td>{r.participant.name}</Td>
                  <Td>{r.event.name}</Td>
                  <Td>
                    {r.attemptedCount} / {r.totalQuestions}
                  </Td>
                  <Td>{r.correctCount}</Td>
                  <Td>
                    {r.score} / {assessment.totalMarks}
                  </Td>
                  <Td>
                    <Badge tone={r.status === "PASS" ? "green" : "red"}>{r.status}</Badge>
                  </Td>
                  <Td>{r.mode}</Td>
                  <Td>{r.attemptedAt.toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
