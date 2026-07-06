"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCapability, companyScope, hashPassword } from "@/lib/auth";
import { isGlobalRole } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { UserRole, UserStatus } from "@/generated/prisma/enums";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "MANAGER", "TRAINER", "PA", "VOLUNTEER", "CLIENT"];
const STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE"];

export async function createUser(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageUsers");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as UserRole;
  const requestedCompanyId = String(formData.get("companyId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !role || !requestedCompanyId || !password) {
    return { error: "Name, email, role, company, and password are all required." };
  }
  if (!ROLES.includes(role)) return { error: "Invalid role." };
  if (role === "VOLUNTEER") return { error: "Volunteers are created from an event's page so they're locked to that event." };
  if (role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can grant the Super Admin role." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  // Company-scoped admins can only ever create users in their own company, regardless of
  // what the (hidden, for them single-option) company field on the form actually contains.
  const companyId = isGlobalRole(session.role) ? requestedCompanyId : session.companyId;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with this email already exists." };

  const user = await db.user.create({
    data: { name, email, phone, role, companyId, passwordHash: await hashPassword(password) },
  });
  await logAudit({ userId: session.sub, entityType: "User", entityId: user.id, action: "CREATE", after: { ...user, passwordHash: undefined } });

  redirect("/dashboard/users");
}

export async function updateUser(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("manageUsers");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as UserRole;
  const status = String(formData.get("status") ?? "ACTIVE") as UserStatus;
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!id || !name || !email || !role) return { error: "Name, email, and role are required." };
  if (!ROLES.includes(role) || !STATUSES.includes(status)) return { error: "Invalid role or status." };
  if (newPassword && newPassword.length < 8) return { error: "New password must be at least 8 characters." };

  const before = await db.user.findFirst({ where: { id, ...companyScope(session) } });
  if (!before) return { error: "User not found." };
  if (!isGlobalRole(session.role) && (before.role === "SUPER_ADMIN" || role === "SUPER_ADMIN")) {
    return { error: "Only a Super Admin can grant or modify the Super Admin role." };
  }

  const user = await db.user.update({
    where: { id },
    data: {
      name,
      email,
      phone,
      role,
      status,
      ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {}),
    },
  });
  await logAudit({
    userId: session.sub,
    entityType: "User",
    entityId: id,
    action: newPassword ? "UPDATE_WITH_PASSWORD_RESET" : "UPDATE",
    before: { ...before, passwordHash: undefined },
    after: { ...user, passwordHash: undefined },
  });

  redirect("/dashboard/users");
}

// Intentionally does NOT cascade — unlike Company/Project/Event/Participant, wiping a
// user's created projects or registered participants as a side effect of removing their
// login would be surprising. If the DB's RESTRICT constraints block it, surface a friendly
// error instead; deactivating the account (or deleting the whole company) is the alternative.
export async function deleteUser(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireCapability("deleteRecords");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing user id." };
  if (id === session.sub) return { error: "You cannot delete your own account." };

  const user = await db.user.findFirst({ where: { id, ...companyScope(session) } });
  if (!user) return { error: "User not found." };

  try {
    await db.user.delete({ where: { id } });
  } catch {
    return { error: "Can't delete this user — they have associated records (projects created, participants registered, ratings given, etc). Deactivate them instead, or remove those records first." };
  }
  await logAudit({ userId: session.sub, entityType: "User", entityId: id, action: "DELETE", before: { ...user, passwordHash: undefined } });

  redirect("/dashboard/users");
}
