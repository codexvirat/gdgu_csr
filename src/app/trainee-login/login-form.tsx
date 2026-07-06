"use client";

import { useActionState, useState } from "react";
import { traineeLoginAction } from "./actions";
import { Button, Field, FormError, Input } from "@/components/ui";

export function TraineeLoginForm() {
  const [state, formAction, pending] = useActionState(traineeLoginAction, undefined);
  const [mobile, setMobile] = useState("");

  if (state?.options && state.options.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">More than one registration matches this mobile number — which one is you?</p>
        {state.options.map((o) => (
          <form key={o.id} action={formAction}>
            <input type="hidden" name="mobile" value={mobile} />
            <input type="hidden" name="participantId" value={o.id} />
            <button type="submit" className="w-full rounded-md border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-50">
              <span className="font-medium text-slate-900">{o.name}</span>
              <span className="ml-2 text-slate-500">{o.eventName}</span>
            </button>
          </form>
        ))}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Mobile number" htmlFor="mobile">
        <Input
          id="mobile"
          name="mobile"
          inputMode="numeric"
          maxLength={10}
          required
          placeholder="10-digit mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
      </Field>
      <Field label="PIN" htmlFor="pin" hint="Only needed if your event has an assessment. Leave blank if you're only here to give feedback.">
        <Input id="pin" name="pin" inputMode="numeric" maxLength={4} placeholder="4-digit PIN" />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Continue"}
      </Button>
    </form>
  );
}
