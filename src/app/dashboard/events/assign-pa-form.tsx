"use client";

import { useActionState } from "react";
import { assignPaToEvent } from "./actions";
import { Button, Field, FormError, Select } from "@/components/ui";

export function AssignPaForm({ eventId, pas }: { eventId: string; pas: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(assignPaToEvent, undefined);

  if (pas.length === 0) {
    return <p className="text-sm text-slate-500">No unassigned PA users available — add one under Users first.</p>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="flex flex-wrap items-end gap-2">
        <Field label="PA" htmlFor="userId">
          <Select id="userId" name="userId" className="w-56">
            {pas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Assigning…" : "Assign"}
        </Button>
      </div>
      <FormError message={state?.error} />
    </form>
  );
}
