"use client";

import { useActionState } from "react";
import { assignTrainerToEvent } from "../trainers/actions";
import { Button, Field, FormError, Input, Select } from "@/components/ui";

export function AssignTrainerForm({ eventId, trainers }: { eventId: string; trainers: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(assignTrainerToEvent, undefined);

  if (trainers.length === 0) {
    return <p className="text-sm text-slate-500">No trainers available — add one under Trainers first.</p>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Trainer" htmlFor="trainerId">
          <Select id="trainerId" name="trainerId" className="w-56">
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role" htmlFor="roleInEvent">
          <Input id="roleInEvent" name="roleInEvent" placeholder="Lead trainer" className="w-40" />
        </Field>
        <Field label="Fee (₹)" htmlFor="feeAmount">
          <Input id="feeAmount" name="feeAmount" type="number" min={0} step="0.01" className="w-32" />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Assigning…" : "Assign"}
        </Button>
      </div>
      <FormError message={state?.error} />
    </form>
  );
}
