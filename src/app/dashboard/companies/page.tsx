import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Button, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function CompaniesPage() {
  await requireCapability("manageCompanies");
  const companies = await db.company.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Operating entities using this ERP instance."
        actions={
          <Link href="/dashboard/companies/new">
            <Button>New company</Button>
          </Link>
        }
      />
      {companies.length === 0 ? (
        <EmptyState title="No companies yet" description="Create the first operating company to get started." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>GSTIN</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <Td>{c.name}</Td>
                <Td>{c.gstin ?? "—"}</Td>
                <Td>
                  <Badge tone={c.status === "ACTIVE" ? "green" : "slate"}>{c.status}</Badge>
                </Td>
                <Td>{c.createdAt.toLocaleDateString()}</Td>
                <Td className="text-right">
                  <Link href={`/dashboard/companies/${c.id}`} className="text-sm font-medium text-slate-600 hover:underline">
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
