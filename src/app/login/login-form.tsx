"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button, Field, FormError, Input } from "@/components/ui";

export function LoginForm({ from }: { from: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="from" value={from} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
