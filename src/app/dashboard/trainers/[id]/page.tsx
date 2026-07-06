import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability, companyScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { addTrainerRating, deleteTrainer } from "../actions";
import { DeleteButton } from "@/components/delete-button";
import { Badge, Button, Card, Field, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui";

export default async function TrainerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("assignTrainersManagers");
  const { id } = await params;

  const trainer = await db.trainer.findFirst({
    where: { id, ...companyScope(session) },
    include: {
      eventAssignments: { include: { event: { include: { project: true, projectCity: true } } } },
      ratings: { include: { event: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!trainer) notFound();

  const avgRating = trainer.ratings.length ? (trainer.ratings.reduce((s, r) => s + r.rating, 0) / trainer.ratings.length).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title={trainer.name}
        description={trainer.skills ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/trainers/${trainer.id}/edit`}>
              <Button variant="secondary">Edit trainer</Button>
            </Link>
            {can(session.role, "deleteRecords") && (
              <DeleteButton
                action={deleteTrainer}
                hiddenFields={{ id: trainer.id }}
                confirmText={trainer.name}
                label="Delete trainer"
                description="This permanently deletes the trainer, their event assignments, and their ratings history."
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-1">
            <Badge tone={trainer.status === "ACTIVE" ? "green" : "slate"}>{trainer.status}</Badge>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fee structure</p>
          <p className="mt-1 text-sm text-slate-800">{trainer.feeStructure ?? "Not set"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Avg. rating · events delivered</p>
          <p className="mt-1 text-sm text-slate-800">
            {avgRating} · {trainer.eventAssignments.length}
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Assignment history (availability)</h2>
        {trainer.eventAssignments.length === 0 ? (
          <p className="text-sm text-slate-500">Not assigned to any events yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>Project</Th>
                <Th>City</Th>
                <Th>Dates</Th>
                <Th>Fee</Th>
              </tr>
            </thead>
            <tbody>
              {trainer.eventAssignments
                .sort((a, b) => a.event.eventDateStart.getTime() - b.event.eventDateStart.getTime())
                .map((ea) => (
                  <tr key={ea.id}>
                    <Td>
                      <Link href={`/dashboard/events/${ea.event.id}`} className="font-medium text-slate-900 hover:underline">
                        {ea.event.name}
                      </Link>
                    </Td>
                    <Td>{ea.event.project.name}</Td>
                    <Td>{ea.event.projectCity.city}</Td>
                    <Td>
                      {ea.event.eventDateStart.toLocaleDateString()} – {ea.event.eventDateEnd.toLocaleDateString()}
                    </Td>
                    <Td>{ea.feeAmount ? `₹${ea.feeAmount.toLocaleString("en-IN")}` : "—"}</Td>
                  </tr>
                ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Ratings & feedback</h2>
        {trainer.ratings.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">No ratings recorded yet.</p>
        ) : (
          <ul className="mb-4 space-y-2 text-sm">
            {trainer.ratings.map((r) => (
              <li key={r.id} className="border-b border-slate-100 pb-2">
                <span className="font-medium text-slate-900">{r.rating}/5</span> — {r.event.name}
                {r.feedbackText && <p className="text-slate-500">{r.feedbackText}</p>}
              </li>
            ))}
          </ul>
        )}
        {trainer.eventAssignments.length > 0 && (
          <form action={addTrainerRating} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="trainerId" value={trainer.id} />
            <Field label="Event" htmlFor="eventId">
              <Select id="eventId" name="eventId" className="w-56">
                {trainer.eventAssignments.map((ea) => (
                  <option key={ea.eventId} value={ea.eventId}>
                    {ea.event.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Rating (1-5)" htmlFor="rating">
              <Input id="rating" name="rating" type="number" min={1} max={5} required className="w-24" />
            </Field>
            <Field label="Feedback" htmlFor="feedbackText">
              <Input id="feedbackText" name="feedbackText" className="w-64" />
            </Field>
            <Button type="submit" variant="secondary">
              Add rating
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
