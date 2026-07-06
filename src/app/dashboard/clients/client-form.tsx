"use client";

import { useActionState } from "react";
import { createClient, updateClient } from "./actions";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import type { Client, Company } from "@/generated/prisma/client";

export function ClientForm({ client, companies }: { client?: Client; companies?: Company[] }) {
  const action = client ? updateClient : createClient;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {client && <input type="hidden" name="id" value={client.id} />}
      <Field label="Client name" htmlFor="name">
        <Input id="name" name="name" defaultValue={client?.name} required />
      </Field>
      <Field label="Industry" htmlFor="industry">
        <Input id="industry" name="industry" defaultValue={client?.industry ?? ""} />
      </Field>
      <Field label="Primary contact" htmlFor="primaryContact">
        <Input id="primaryContact" name="primaryContact" defaultValue={client?.primaryContact ?? ""} placeholder="Name — title" />
      </Field>
      <Field label="Address" htmlFor="address">
        <Input id="address" name="address" defaultValue={client?.address ?? ""} />
      </Field>
      {!client && companies && companies.length > 0 && (
        <Field label="Company" htmlFor="companyId">
          <Select id="companyId" name="companyId" required>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : client ? "Save changes" : "Create client"}
      </Button>
    </form>
  );
}
