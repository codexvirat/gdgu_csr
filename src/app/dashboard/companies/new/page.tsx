import { requireCapability } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { CompanyForm } from "../company-form";

export default async function NewCompanyPage() {
  await requireCapability("manageCompanies");
  return (
    <div>
      <PageHeader title="New company" />
      <CompanyForm />
    </div>
  );
}
