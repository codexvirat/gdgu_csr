import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { AssessmentForm } from "../assessment-form";

export default async function NewAssessmentPage() {
  const session = await requireCapability("manageAssessments");
  const projects = await db.project.findMany({
    where: companyScope(session),
    orderBy: { name: "asc" },
    select: { id: true, name: true, tradeCategory: true },
  });

  return (
    <div>
      <PageHeader title="New assessment" />
      {projects.length === 0 ? <EmptyState title="No projects yet" /> : <AssessmentForm projects={projects} />}
    </div>
  );
}
