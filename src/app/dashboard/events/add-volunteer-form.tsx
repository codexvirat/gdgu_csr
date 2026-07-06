"use client";

import { useActionState } from "react";
import { createVolunteer } from "./actions";
import { Button, Field, FormError, Input } from "@/components/ui";

export function AddVolunteerForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(createVolunteer, undefined);

  return (
    <div className="space-y-2">
      {state?.createdEmail && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Volunteer created. Login email: <strong>{state.createdEmail}</strong> — share this and the password you set with them. It won&apos;t be shown again.
        </div>
      )}
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="eventId" value={eventId} />
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required className="w-48" />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" className="w-36" />
        </Field>
        <Field label="Password" htmlFor="password" hint="Min 8 characters — you choose it, share it with the volunteer.">
          <Input id="password" name="password" type="password" minLength={8} required className="w-44" />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Creating…" : "Add volunteer"}
        </Button>
      </form>
      <FormError message={state?.error} />
    </div>
  );
}
