"use client";

import { useActionState } from "react";
import { allotFeedbackToEvent } from "./actions";
import { Button, Field, FormError, Select } from "@/components/ui";

/** Allots a feedback form to an event. Pass either a fixed feedbackFormId (used from the event
 * page, with that event's candidate forms in `options`) or a fixed eventId (used from the
 * feedback form page, with that project's candidate events in `options`) — never both. */
export function AllotFeedbackForm({
  fixedFeedbackFormId,
  fixedEventId,
  options,
}: {
  fixedFeedbackFormId?: string;
  fixedEventId?: string;
  options: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(allotFeedbackToEvent, undefined);

  if (options.length === 0) {
    return <p className="text-sm text-slate-500">{fixedFeedbackFormId ? "No other events available to allot this form to." : "No feedback forms available to allot to this event."}</p>;
  }

  return (
    <form action={formAction} className="space-y-2">
      {fixedFeedbackFormId && <input type="hidden" name="feedbackFormId" value={fixedFeedbackFormId} />}
      {fixedEventId && <input type="hidden" name="eventId" value={fixedEventId} />}
      <div className="flex flex-wrap items-end gap-2">
        <Field label={fixedFeedbackFormId ? "Event" : "Feedback form"} htmlFor="allot-option">
          <Select id="allot-option" name={fixedFeedbackFormId ? "eventId" : "feedbackFormId"} className="w-64">
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
