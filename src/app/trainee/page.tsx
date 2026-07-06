import Link from "next/link";
import { requireTrainee } from "@/lib/trainee-auth";
import { db } from "@/lib/db";
import { traineeLogoutAction } from "./logout-action";
import { claimCertificate } from "./certificates/actions";
import { Badge, Button, Card, EmptyState } from "@/components/ui";

export default async function TraineeHomePage({ searchParams }: { searchParams: Promise<{ feedbackSubmitted?: string }> }) {
  const trainee = await requireTrainee();
  const { feedbackSubmitted } = await searchParams;

  const participant = await db.participant.findUnique({ where: { id: trainee.sub }, include: { event: true } });
  const showAssessments = !!participant?.event?.requiresAssessment;

  const [assessments, feedbackForms, eventCertificates] = await Promise.all([
    showAssessments
      ? db.assessment.findMany({
          where: { projectId: trainee.projectId, eventAssessments: { some: { eventId: participant!.eventId!, isPublished: true } } },
          include: { results: { where: { participantId: trainee.sub }, orderBy: { attemptedAt: "desc" } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    db.feedbackForm.findMany({
      where: { projectId: trainee.projectId, eventFeedbacks: { some: { eventId: participant?.eventId ?? "__none__", isPublished: true } } },
      include: { responses: { where: { participantId: trainee.sub } } },
      orderBy: { createdAt: "asc" },
    }),
    db.eventCertificate.findMany({
      where: { eventId: participant?.eventId ?? "__none__", isPublished: true },
      include: { certificateTemplate: true, certificates: { where: { participantId: trainee.sub } } },
      orderBy: { allottedAt: "asc" },
    }),
  ]);

  const certificateUnlocked =
    assessments.some((a) => a.results.length > 0) || feedbackForms.some((f) => f.responses.length > 0) || (assessments.length === 0 && feedbackForms.length === 0);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Hello, {trainee.name}</h1>
            <p className="text-sm text-slate-500">{showAssessments ? "Your assessments & feedback" : "Your feedback"}</p>
          </div>
          <form action={traineeLogoutAction}>
            <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </div>

        {feedbackSubmitted && <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Thanks for your feedback!</div>}

        {showAssessments && (
          <div className="mb-6 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assessments</h2>
            {assessments.length === 0 ? (
              <EmptyState title="No assessments yet" description="Check back once your trainer sets one up." />
            ) : (
              assessments.map((a) => {
                const latest = a.results[0];
                const passed = latest?.status === "PASS";
                return (
                  <Card key={a.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-slate-900">{a.title}</p>
                      <p className="text-sm text-slate-500">
                        Pass mark {a.passMark}/{a.totalMarks}
                      </p>
                      {latest && (
                        <p className="mt-1">
                          <Badge tone={passed ? "green" : "red"}>
                            {latest.status} — {latest.score}/{a.totalMarks}
                          </Badge>
                        </p>
                      )}
                    </div>
                    {!passed && (
                      <Link href={`/trainee/assessments/${a.id}`}>
                        <Button>{latest ? "Retake" : "Start"}</Button>
                      </Link>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Feedback</h2>
          {feedbackForms.length === 0 ? (
            <EmptyState title="No feedback forms yet" description="Check back once your trainer sets one up." />
          ) : (
            feedbackForms.map((f) => {
              const submitted = f.responses.length > 0;
              return (
                <Card key={f.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-slate-900">{f.title}</p>
                    {submitted && (
                      <p className="mt-1">
                        <Badge tone="green">Submitted</Badge>
                      </p>
                    )}
                  </div>
                  <Link href={`/trainee/feedback/${f.id}`}>
                    <Button variant={submitted ? "secondary" : "primary"}>{submitted ? "View" : "Give feedback"}</Button>
                  </Link>
                </Card>
              );
            })
          )}
        </div>

        {eventCertificates.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Certificates</h2>
            {eventCertificates.map((ec) => {
              const issued = ec.certificates[0];
              return (
                <Card key={ec.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-slate-900">{ec.certificateTemplate.title}</p>
                    {!issued && !certificateUnlocked && (
                      <p className="mt-1 text-sm text-slate-500">Complete your assessment or feedback to unlock your certificate.</p>
                    )}
                  </div>
                  {issued ? (
                    <a href={`/trainee/certificates/${issued.id}/download`}>
                      <Button variant="secondary">Download certificate</Button>
                    </a>
                  ) : certificateUnlocked ? (
                    <form action={claimCertificate}>
                      <input type="hidden" name="eventCertificateId" value={ec.id} />
                      <Button type="submit">Get my certificate</Button>
                    </form>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
