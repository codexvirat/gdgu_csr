"use server";

import { redirect } from "next/navigation";
import { clearTraineeSessionCookie } from "@/lib/trainee-auth";

export async function traineeLogoutAction() {
  await clearTraineeSessionCookie();
  redirect("/trainee-login");
}
