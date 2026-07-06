import { notFound } from "next/navigation";
import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { EditProjectForm } from "../../edit-project-form";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("manageProjects");
  const { id } = await params;
  const project = await db.project.findFirst({ where: { id, ...companyScope(session) } });
  if (!project) notFound();

  return (
    <div>
      <PageHeader title={`Edit — ${project.name}`} />
      <EditProjectForm project={project} />
    </div>
  );
}
