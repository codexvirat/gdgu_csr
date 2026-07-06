import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui";
import { NewProjectForm } from "../new-project-form";

export default async function NewProjectPage() {
  const session = await requireCapability("manageProjects");
  const clients = await db.client.findMany({ where: companyScope(session), orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title="New project" />
      {clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Add a client company before creating a project." />
      ) : (
        <NewProjectForm clients={clients} />
      )}
    </div>
  );
}
