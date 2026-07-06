import { notFound } from "next/navigation";
import { requireCapability, companyScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/delete-button";
import { ClientForm } from "../client-form";
import { deleteClient } from "../actions";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("manageClients");
  const { id } = await params;
  const client = await db.client.findFirst({ where: { id, ...companyScope(session) } });
  if (!client) notFound();

  return (
    <div>
      <PageHeader
        title={client.name}
        actions={
          can(session.role, "deleteRecords") ? (
            <DeleteButton
              action={deleteClient}
              hiddenFields={{ id: client.id }}
              confirmText={client.name}
              label="Delete client"
              description="This permanently deletes the client and every project, event, participant, assessment, and feedback form under it."
            />
          ) : undefined
        }
      />
      <ClientForm client={client} />
    </div>
  );
}
