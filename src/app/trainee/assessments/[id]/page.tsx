import { notFound, redirect } from "next/navigation";
import { requireTrainee } from "@/lib/trainee-auth";
import { db } from "@/lib/db";
import { submitOwnAssessment } from "../actions";
import { Button, Card, FormError } from "@/components/ui";

export default async function TakeAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const trainee = await requireTrainee();
  const { id } = await params;
  const { error } = await searchParams;

  const assessment = await db.assessment.findFirst({
    where: { id, projectId: trainee.projectId },
    include: { questions: true },
  });
  if (!assessment) notFound();

  const participant = await db.participant.findUnique({ where: { id: trainee.sub }, select: { eventId: true } });
  const link = participant?.eventId
    ? await db.eventAssessment.findUnique({ where: { eventId_assessmentId: { eventId: participant.eventId, assessmentId: id } } })
    : null;
  if (!link?.isPublished) notFound();

  const existingPass = await db.assessmentResult.findFirst({ where: { assessmentId: id, participantId: trainee.sub, status: "PASS" } });
  if (existingPass) redirect(`/trainee/assessments/${id}/result?resultId=${existingPass.id}`);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-lg font-semibold text-slate-900">{assessment.title}</h1>
        <p className="mb-6 text-sm text-slate-500">
          {assessment.questions.length} question{assessment.questions.length === 1 ? "" : "s"} · pass mark {assessment.passMark}/{assessment.totalMarks}
        </p>
        {error === "not-assigned" && (
          <div className="mb-4">
            <FormError message="You haven't been assigned to an event yet — contact your trainer or PA before taking this test." />
          </div>
        )}
        <form action={submitOwnAssessment} className="space-y-4">
          <input type="hidden" name="assessmentId" value={assessment.id} />
          {assessment.questions.map((q, qi) => {
            const options = JSON.parse(q.options) as string[];
            return (
              <Card key={q.id} className="p-4">
                <p className="mb-2 text-sm font-medium text-slate-800">
                  {qi + 1}. {q.questionText}
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name={`answer_${q.id}`} value={String(oi)} />
                      {opt}
                    </label>
                  ))}
                </div>
              </Card>
            );
          })}
          <Button type="submit" className="w-full">
            Submit
          </Button>
        </form>
      </div>
    </div>
  );
}
