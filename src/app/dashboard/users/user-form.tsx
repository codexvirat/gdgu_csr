"use client";

import { useActionState } from "react";
import { createUser, updateUser } from "./actions";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import type { Company, User } from "@/generated/prisma/client";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "DIRECTOR", label: "Director" },
  { value: "MANAGER", label: "Manager" },
  { value: "TRAINER", label: "Trainer" },
  { value: "PA", label: "PA / Data Entry" },
  { value: "CLIENT", label: "Client (view-only)" },
];

export function UserForm({
  user,
  companies,
  canAssignSuperAdmin = false,
  defaultCompanyId = null,
}: {
  user?: User;
  companies: Company[];
  canAssignSuperAdmin?: boolean;
  defaultCompanyId?: string | null;
}) {
  const action = user ? updateUser : createUser;
  const [state, formAction, pending] = useActionState(action, undefined);
  // Volunteers are created from an event's page (locked to that event), not here —
  // except when editing an existing volunteer, where we still need to show their role.
  let roleOptions = user?.role === "VOLUNTEER" ? [...ROLE_OPTIONS, { value: "VOLUNTEER", label: "Volunteer" }] : ROLE_OPTIONS;
  // Only a Super Admin can grant the Super Admin role (cross-company access), and only when
  // editing/creating within the Super Admin's own view — never offered to company-scoped admins.
  if (canAssignSuperAdmin || user?.role === "SUPER_ADMIN") {
    roleOptions = [{ value: "SUPER_ADMIN", label: "Super Admin" }, ...roleOptions];
  }

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {user && <input type="hidden" name="id" value={user.id} />}
      <Field label="Full name" htmlFor="name">
        <Input id="name" name="name" defaultValue={user?.name} required />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={user?.email} required />
      </Field>
      <Field label="Phone" htmlFor="phone">
        <Input id="phone" name="phone" defaultValue={user?.phone ?? ""} />
      </Field>
      <Field label="Role" htmlFor="role">
        <Select id="role" name="role" defaultValue={user?.role ?? "MANAGER"} required>
          {roleOptions.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        {user?.role === "VOLUNTEER" && <p className="mt-1 text-xs text-slate-500">Volunteer role is locked to the event it was created from.</p>}
      </Field>
      {!user && (
        <Field label="Company" htmlFor="companyId">
          <Select id="companyId" name="companyId" defaultValue={defaultCompanyId ?? undefined} required>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {user && (
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={user.status}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
      )}
      <Field label={user ? "New password (optional)" : "Password"} htmlFor={user ? "newPassword" : "password"} hint={user ? "Leave blank to keep the current password." : "Minimum 8 characters."}>
        <Input id={user ? "newPassword" : "password"} name={user ? "newPassword" : "password"} type="password" minLength={8} required={!user} />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : user ? "Save changes" : "Create user"}
      </Button>
    </form>
  );
}
