import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { FeedbackForm } from "../feedback-form";

export default async function NewFeedbackFormPage() {
  const session = await requireCapability("manageFeedback");
  const projects = await db.project.findMany({
    where: companyScope(session),
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <PageHeader title="New feedback form" />
      {projects.length === 0 ? <EmptyState title="No projects yet" /> : <FeedbackForm projects={projects} />}
    </div>
  );
}
