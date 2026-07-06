import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { isGlobalRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Shell } from "@/components/shell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  const companies = isGlobalRole(session.role) ? await db.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];
  return (
    <Shell session={session} companies={companies}>
      {children}
    </Shell>
  );
}
