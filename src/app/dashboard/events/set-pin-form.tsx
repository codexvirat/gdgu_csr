"use client";

import { useActionState } from "react";
import { setEventPin } from "./actions";
import { Button, Field, FormError, Input } from "@/components/ui";

export function SetEventPinForm({ eventId, currentPin }: { eventId: string; currentPin: string | null }) {
  const [state, formAction, pending] = useActionState(setEventPin, undefined);

  return (
    <div className="space-y-2">
      {state?.success && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Event PIN updated successfully.</div>
      )}
      <p className="text-sm text-slate-600">
        Current PIN:{" "}
        <span className="font-mono font-semibold text-slate-900">{currentPin ?? "Not set"}</span>
      </p>
      <form action={formAction} className="flex items-end gap-2">
        <input type="hidden" name="id" value={eventId} />
        <Field label="New PIN" htmlFor="pin" hint="4-digit number — all participants in this event will use this PIN.">
          <Input id="pin" name="pin" inputMode="numeric" maxLength={4} placeholder="e.g. 1234" className="w-32" required />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : currentPin ? "Change PIN" : "Set PIN"}
        </Button>
      </form>
      <FormError message={state?.error} />
    </div>
  );
}
