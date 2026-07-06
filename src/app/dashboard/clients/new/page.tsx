import { requireCapability } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGlobalRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { ClientForm } from "../client-form";

export default async function NewClientPage() {
  const session = await requireCapability("manageClients");
  const companies = isGlobalRole(session.role) ? await db.company.findMany({ orderBy: { name: "asc" } }) : undefined;

  return (
    <div>
      <PageHeader title="New client" />
      <ClientForm companies={companies} />
    </div>
  );
}
