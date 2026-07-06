import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainee } from "@/lib/trainee-auth";
import { db } from "@/lib/db";
import { Badge, Button, Card } from "@/components/ui";

export default async function AssessmentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resultId?: string }>;
}) {
  const trainee = await requireTrainee();
  const { id } = await params;
  const { resultId } = await searchParams;

  const result = await db.assessmentResult.findFirst({
    where: { id: resultId, assessmentId: id, participantId: trainee.sub },
    include: { assessment: true },
  });
  if (!result) notFound();

  const passed = result.status === "PASS";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm p-6 text-center">
        <Badge tone={passed ? "green" : "red"}>{passed ? "Passed" : "Not yet — try again"}</Badge>
        <p className="mt-4 text-2xl font-semibold text-slate-900">
          {result.score} / {result.assessment.totalMarks}
        </p>
        <p className="mt-1 text-sm text-slate-500">{result.assessment.title}</p>
        <p className="mt-3 text-sm text-slate-600">
          Attempted {result.attemptedCount} / {result.totalQuestions} questions · {result.correctCount} correct
        </p>
        <Link href="/trainee" className="mt-6 inline-block">
          <Button variant="secondary">Back to my assessments</Button>
        </Link>
      </Card>
    </div>
  );
}
