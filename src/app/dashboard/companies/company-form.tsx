"use client";

import { useActionState } from "react";
import { createCompany, updateCompany } from "./actions";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import type { Company } from "@/generated/prisma/client";

export function CompanyForm({ company }: { company?: Company }) {
  const action = company ? updateCompany : createCompany;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {company && <input type="hidden" name="id" value={company.id} />}
      <Field label="Company name" htmlFor="name">
        <Input id="name" name="name" defaultValue={company?.name} required />
      </Field>
      <Field label="Address" htmlFor="address">
        <Input id="address" name="address" defaultValue={company?.address ?? ""} />
      </Field>
      <Field label="GSTIN" htmlFor="gstin">
        <Input id="gstin" name="gstin" defaultValue={company?.gstin ?? ""} />
      </Field>
      {company && (
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={company.status}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
      )}
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : company ? "Save changes" : "Create company"}
      </Button>
    </form>
  );
}
