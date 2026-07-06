"use client";

import { useActionState } from "react";
import { updateEvent } from "./actions";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import type { Event } from "@/generated/prisma/client";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function EditEventForm({ event, managers }: { event: Event; managers: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(updateEvent, undefined);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <input type="hidden" name="id" value={event.id} />
      <Field label="Event / batch name" htmlFor="name">
        <Input id="name" name="name" defaultValue={event.name} required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" htmlFor="eventDateStart">
          <Input id="eventDateStart" name="eventDateStart" type="date" defaultValue={toDateInput(event.eventDateStart)} required />
        </Field>
        <Field label="End date" htmlFor="eventDateEnd">
          <Input id="eventDateEnd" name="eventDateEnd" type="date" defaultValue={toDateInput(event.eventDateEnd)} required />
        </Field>
      </div>
      <Field label="Target headcount" htmlFor="targetCount">
        <Input id="targetCount" name="targetCount" type="number" min={1} defaultValue={event.targetCount} required className="w-40" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="requiresAssessment" defaultChecked={event.requiresAssessment} />
        This event has an assessment (PIN required for trainee login). Feedback is always collected regardless.
      </label>
      <Field label="Operations Manager" htmlFor="opsManagerId">
        <Select id="opsManagerId" name="opsManagerId" defaultValue={event.opsManagerId ?? ""}>
          <option value="">Unassigned</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={event.status}>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In progress</option>
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
