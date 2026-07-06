"use server";

import { redirect } from "next/navigation";
import { requireUser, setViewCompanyCookie } from "@/lib/auth";
import { isGlobalRole } from "@/lib/permissions";

export async function switchCompanyAction(formData: FormData) {
  const session = await requireUser();
  if (!isGlobalRole(session.role)) return;

  const companyId = String(formData.get("companyId") ?? "");
  await setViewCompanyCookie(companyId === "ALL" ? null : companyId);

  redirect("/dashboard");
}
