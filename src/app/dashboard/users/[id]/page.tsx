import { notFound } from "next/navigation";
import { requireCapability, companyScope } from "@/lib/auth";
import { can, isGlobalRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/delete-button";
import { UserForm } from "../user-form";
import { deleteUser } from "../actions";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("manageUsers");
  const { id } = await params;
  const [user, companies] = await Promise.all([
    db.user.findFirst({ where: { id, ...companyScope(session), ...(isGlobalRole(session.role) ? {} : { role: { not: "SUPER_ADMIN" } }) } }),
    isGlobalRole(session.role) ? db.company.findMany({ orderBy: { name: "asc" } }) : db.company.findMany({ where: { id: session.companyId } }),
  ]);
  if (!user) notFound();

  return (
    <div>
      <PageHeader
        title={user.name}
        description={user.email}
        actions={
          can(session.role, "deleteRecords") && user.id !== session.sub ? (
            <DeleteButton
              action={deleteUser}
              hiddenFields={{ id: user.id }}
              confirmText={user.name}
              label="Delete user"
              description="This permanently deletes the user's login. Fails if they have created projects, registered participants, or other associated records — deactivate them instead in that case."
            />
          ) : undefined
        }
      />
      <UserForm user={user} companies={companies} canAssignSuperAdmin={session.role === "SUPER_ADMIN"} />
    </div>
  );
}
