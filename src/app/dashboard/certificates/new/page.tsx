import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { CertificateTemplateForm } from "../certificate-template-form";

export default async function NewCertificateTemplatePage() {
  const session = await requireCapability("manageCertificates");
  const projects = await db.project.findMany({
    where: companyScope(session),
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <PageHeader title="New certificate template" />
      {projects.length === 0 ? <EmptyState title="No projects yet" /> : <CertificateTemplateForm projects={projects} />}
    </div>
  );
}
