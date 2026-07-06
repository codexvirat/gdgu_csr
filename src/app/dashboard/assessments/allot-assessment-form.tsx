"use client";

import { useActionState } from "react";
import { allotAssessmentToEvent } from "./actions";
import { Button, Field, FormError, Select } from "@/components/ui";

/** Allots a paper to an event. Pass either a fixed assessmentId (used from the event page, with
 * an event's candidate papers in `options`) or a fixed eventId (used from the assessment page,
 * with that project's candidate events in `options`) — never both. */
export function AllotAssessmentForm({
  fixedAssessmentId,
  fixedEventId,
  options,
}: {
  fixedAssessmentId?: string;
  fixedEventId?: string;
  options: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(allotAssessmentToEvent, undefined);

  if (options.length === 0) {
    return <p className="text-sm text-slate-500">{fixedAssessmentId ? "No other events available to allot this paper to." : "No assessments available to allot to this event."}</p>;
  }

  return (
    <form action={formAction} className="space-y-2">
      {fixedAssessmentId && <input type="hidden" name="assessmentId" value={fixedAssessmentId} />}
      {fixedEventId && <input type="hidden" name="eventId" value={fixedEventId} />}
      <div className="flex flex-wrap items-end gap-2">
        <Field label={fixedAssessmentId ? "Event" : "Assessment"} htmlFor="allot-option">
          <Select id="allot-option" name={fixedAssessmentId ? "eventId" : "assessmentId"} className="w-64">
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Allotting…" : "Allot"}
        </Button>
      </div>
      <FormError message={state?.error} />
    </form>
  );
}
