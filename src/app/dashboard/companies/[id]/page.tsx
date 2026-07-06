import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/delete-button";
import { CompanyForm } from "../company-form";
import { deleteCompany } from "../actions";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("manageCompanies");
  const { id } = await params;
  const company = await db.company.findUnique({ where: { id } });
  if (!company) notFound();

  return (
    <div>
      <PageHeader
        title={company.name}
        actions={
          can(session.role, "deleteRecords") ? (
            <DeleteButton
              action={deleteCompany}
              hiddenFields={{ id: company.id }}
              confirmText={company.name}
              label="Delete company"
              description="This permanently deletes the company and every user, client, project, event, participant, trainer, venue, vendor, and asset under it."
            />
          ) : undefined
        }
      />
      <CompanyForm company={company} />
    </div>
  );
}
