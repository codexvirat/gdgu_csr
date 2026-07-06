import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { TrainerForm } from "../trainer-form";

export default async function NewTrainerPage() {
  const session = await requireCapability("assignTrainersManagers");
  const linkableUsers = await db.user.findMany({
    where: { ...companyScope(session), role: "TRAINER", trainerProfile: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div>
      <PageHeader title="New trainer" />
      <TrainerForm linkableUsers={linkableUsers} />
    </div>
  );
}
