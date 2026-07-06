"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSessionCookie, verifyPassword } from "@/lib/auth";

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") {
    return { error: "Invalid email or password." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  await createSessionCookie({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    clientId: user.clientId,
    volunteerEventId: user.volunteerEventId,
  });

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  redirect(from.startsWith("/") ? from : "/dashboard");
}
