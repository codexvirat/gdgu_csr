import Link from "next/link";
import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Button, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function TrainersPage() {
  const session = await requireCapability("assignTrainersManagers");
  const trainers = await db.trainer.findMany({
    where: companyScope(session),
    orderBy: { name: "asc" },
    include: { eventAssignments: true, ratings: true },
  });

  return (
    <div>
      <PageHeader
        title="Trainers"
        description="Trainer master with skills, certifications, fee structure, and assignment history."
        actions={
          <Link href="/dashboard/trainers/new">
            <Button>New trainer</Button>
          </Link>
        }
      />
      {trainers.length === 0 ? (
        <EmptyState title="No trainers yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Skills</Th>
              <Th>Events delivered</Th>
              <Th>Avg. rating</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {trainers.map((t) => {
              const avgRating = t.ratings.length ? (t.ratings.reduce((s, r) => s + r.rating, 0) / t.ratings.length).toFixed(1) : "—";
              return (
                <tr key={t.id}>
                  <Td>
                    <Link href={`/dashboard/trainers/${t.id}`} className="font-medium text-slate-900 hover:underline">
                      {t.name}
                    </Link>
                  </Td>
                  <Td>{t.skills ?? "—"}</Td>
                  <Td>{t.eventAssignments.length}</Td>
                  <Td>{avgRating}</Td>
                  <Td>
                    <Badge tone={t.status === "ACTIVE" ? "green" : "slate"}>{t.status}</Badge>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
