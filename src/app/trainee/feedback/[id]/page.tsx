import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainee } from "@/lib/trainee-auth";
import { db } from "@/lib/db";
import { submitFeedback } from "../actions";
import { Button, Card, FormError } from "@/components/ui";

export default async function GiveFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const trainee = await requireTrainee();
  const { id } = await params;
  const { error } = await searchParams;

  const form = await db.feedbackForm.findFirst({ where: { id, projectId: trainee.projectId }, include: { questions: true } });
  if (!form) notFound();

  const participant = await db.participant.findUnique({ where: { id: trainee.sub }, select: { eventId: true } });
  const link = participant?.eventId
    ? await db.eventFeedback.findUnique({ where: { eventId_feedbackFormId: { eventId: participant.eventId, feedbackFormId: id } } })
    : null;
  if (!link?.isPublished) notFound();

  const existing = await db.feedbackResponse.findFirst({
    where: { feedbackFormId: id, participantId: trainee.sub },
    include: { answers: true },
  });

  if (existing) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">{form.title}</h1>
          <p className="mb-6 text-sm text-slate-500">Thanks — you already submitted this feedback.</p>
          <div className="space-y-3">
            {form.questions.map((q, qi) => {
              const answer = existing.answers.find((a) => a.questionId === q.id);
              return (
                <Card key={q.id} className="p-4">
                  <p className="mb-1 text-sm font-medium text-slate-800">
                    {qi + 1}. {q.questionText}
                  </p>
                  <p className="text-sm text-slate-600">{q.type === "RATING" ? `★ ${answer?.ratingValue ?? "—"}` : answer?.textValue || "—"}</p>
                </Card>
              );
            })}
          </div>
          <Link href="/trainee" className="mt-6 inline-block">
            <Button variant="secondary">Back home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-lg font-semibold text-slate-900">{form.title}</h1>
        <p className="mb-6 text-sm text-slate-500">
          {form.questions.length} question{form.questions.length === 1 ? "" : "s"}
        </p>
        {error === "not-assigned" && (
          <div className="mb-4">
            <FormError message="You haven't been assigned to an event yet — contact your trainer or PA before giving feedback." />
          </div>
        )}
        <form action={submitFeedback} className="space-y-4">
          <input type="hidden" name="feedbackFormId" value={form.id} />
          {form.questions.map((q, qi) => (
            <Card key={q.id} className="p-4">
              <p className="mb-2 text-sm font-medium text-slate-800">
                {qi + 1}. {q.questionText}
              </p>
              {q.type === "RATING" ? (
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <label key={v} className="flex items-center gap-1 text-sm text-slate-700">
                      <input type="radio" name={`answer_${q.id}`} value={v} required />
                      {v}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea name={`answer_${q.id}`} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              )}
            </Card>
          ))}
          <Button type="submit" className="w-full">
            Submit feedback
          </Button>
        </form>
      </div>
    </div>
  );
}
