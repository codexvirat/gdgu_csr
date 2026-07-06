import Link from "next/link";
import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function ClientsPage() {
  const session = await requireCapability("manageClients");
  const clients = await db.client.findMany({
    where: companyScope(session),
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Organizations commissioning CSR / training projects (e.g. Havells, Crompton, Schneider)."
        actions={
          <Link href="/dashboard/clients/new">
            <Button>New client</Button>
          </Link>
        }
      />
      {clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Add a client company before creating a project." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Industry</Th>
              <Th>Primary contact</Th>
              <Th>Projects</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <Td>{c.name}</Td>
                <Td>{c.industry ?? "—"}</Td>
                <Td>{c.primaryContact ?? "—"}</Td>
                <Td>{c._count.projects}</Td>
                <Td className="text-right">
                  <Link href={`/dashboard/clients/${c.id}`} className="text-sm font-medium text-slate-600 hover:underline">
                    Edit
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
