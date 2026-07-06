"use client";

import { useActionState } from "react";
import { createProject } from "./actions";
import { CityRows } from "./city-rows";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import type { Client } from "@/generated/prisma/client";

export function NewProjectForm({ clients }: { clients: Client[] }) {
  const [state, formAction, pending] = useActionState(createProject, undefined);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <Field label="Project name" htmlFor="name">
        <Input id="name" name="name" required placeholder="e.g. Electrician Skill Upgradation 2026" />
      </Field>
      <Field label="Client" htmlFor="clientId">
        <Select id="clientId" name="clientId" required>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Trade / skill category" htmlFor="tradeCategory">
        <Input id="tradeCategory" name="tradeCategory" required placeholder="e.g. Electrician" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" htmlFor="startDate">
          <Input id="startDate" name="startDate" type="date" required />
        </Field>
        <Field label="End date" htmlFor="endDate">
          <Input id="endDate" name="endDate" type="date" required />
        </Field>
      </div>
      <Field label="Budget (total, ₹)" htmlFor="budgetTotal">
        <Input id="budgetTotal" name="budgetTotal" type="number" min={0} step="0.01" />
      </Field>
      <Field label="Cities & sub-targets" htmlFor="cityName" hint="The project's overall target is the sum of city targets.">
        <CityRows />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}
