import Link from "next/link";
import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGlobalRole } from "@/lib/permissions";
import { Badge, Button, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function UsersPage() {
  const session = await requireCapability("manageUsers");
  const users = await db.user.findMany({
    // Company-scoped admins manage their own company's accounts only — Super Admin accounts
    // are out of scope even if one happens to share the same home company.
    where: { ...companyScope(session), ...(isGlobalRole(session.role) ? {} : { role: { not: "SUPER_ADMIN" } }) },
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Admin, Director, Operations, Trainer, PA, and Client accounts."
        actions={
          <Link href="/dashboard/users/new">
            <Button>New user</Button>
          </Link>
        }
      />
      {users.length === 0 ? (
        <EmptyState title="No users yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Company</Th>
              <Th>Status</Th>
              <Th>Last login</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>{u.name}</Td>
                <Td>{u.email}</Td>
                <Td>{u.role}</Td>
                <Td>{u.company.name}</Td>
                <Td>
                  <Badge tone={u.status === "ACTIVE" ? "green" : "slate"}>{u.status}</Badge>
                </Td>
                <Td>{u.lastLoginAt ? u.lastLoginAt.toLocaleString() : "Never"}</Td>
                <Td className="text-right">
                  <Link href={`/dashboard/users/${u.id}`} className="text-sm font-medium text-slate-600 hover:underline">
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
