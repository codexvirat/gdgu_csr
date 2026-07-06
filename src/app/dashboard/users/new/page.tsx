import { requireCapability } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGlobalRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  const session = await requireCapability("manageUsers");
  const companies = isGlobalRole(session.role)
    ? await db.company.findMany({ orderBy: { name: "asc" } })
    : await db.company.findMany({ where: { id: session.companyId } });

  return (
    <div>
      <PageHeader title="New user" />
      <UserForm companies={companies} canAssignSuperAdmin={session.role === "SUPER_ADMIN"} defaultCompanyId={session.viewCompanyId} />
    </div>
  );
}
