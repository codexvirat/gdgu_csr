"use client";

import { useActionState } from "react";
import { allotCertificateToEvent } from "./actions";
import { Button, Field, FormError, Select } from "@/components/ui";

/** Allots a certificate template to an event. Pass either a fixed certificateTemplateId (used from
 * the event page, with that event's candidate templates in `options`) or a fixed eventId (used from
 * the certificate template page, with that project's candidate events in `options`) — never both. */
export function AllotCertificateForm({
  fixedCertificateTemplateId,
  fixedEventId,
  options,
}: {
  fixedCertificateTemplateId?: string;
  fixedEventId?: string;
  options: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(allotCertificateToEvent, undefined);

  if (options.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {fixedCertificateTemplateId ? "No other events available to allot this certificate to." : "No certificate templates available to allot to this event."}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      {fixedCertificateTemplateId && <input type="hidden" name="certificateTemplateId" value={fixedCertificateTemplateId} />}
      {fixedEventId && <input type="hidden" name="eventId" value={fixedEventId} />}
      <div className="flex flex-wrap items-end gap-2">
        <Field label={fixedCertificateTemplateId ? "Event" : "Certificate template"} htmlFor="allot-option">
          <Select id="allot-option" name={fixedCertificateTemplateId ? "eventId" : "certificateTemplateId"} className="w-64">
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
