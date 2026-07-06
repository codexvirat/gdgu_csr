"use client";

import { useActionState } from "react";
import { updateProject } from "./actions";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import type { Project } from "@/generated/prisma/client";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function EditProjectForm({ project }: { project: Project }) {
  const [state, formAction, pending] = useActionState(updateProject, undefined);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <input type="hidden" name="id" value={project.id} />
      <Field label="Project name" htmlFor="name">
        <Input id="name" name="name" defaultValue={project.name} required />
      </Field>
      <Field label="Trade / skill category" htmlFor="tradeCategory">
        <Input id="tradeCategory" name="tradeCategory" defaultValue={project.tradeCategory} required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" htmlFor="startDate">
          <Input id="startDate" name="startDate" type="date" defaultValue={toDateInput(project.startDate)} required />
        </Field>
        <Field label="End date" htmlFor="endDate">
          <Input id="endDate" name="endDate" type="date" defaultValue={toDateInput(project.endDate)} required />
        </Field>
      </div>
      <Field label="Budget (total, ₹)" htmlFor="budgetTotal">
        <Input id="budgetTotal" name="budgetTotal" type="number" min={0} step="0.01" defaultValue={project.budgetTotal ?? ""} />
      </Field>
      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={project.status}>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
