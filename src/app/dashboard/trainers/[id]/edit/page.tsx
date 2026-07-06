import { notFound } from "next/navigation";
import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { TrainerForm } from "../../trainer-form";

export default async function EditTrainerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("assignTrainersManagers");
  const { id } = await params;

  const trainer = await db.trainer.findFirst({ where: { id, ...companyScope(session) } });
  if (!trainer) notFound();

  const linkableUsers = await db.user.findMany({
    where: {
      ...companyScope(session),
      role: "TRAINER",
      OR: [{ trainerProfile: null }, { id: trainer.userId ?? undefined }],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div>
      <PageHeader title={`Edit — ${trainer.name}`} />
      <TrainerForm trainer={trainer} linkableUsers={linkableUsers} />
    </div>
  );
}
