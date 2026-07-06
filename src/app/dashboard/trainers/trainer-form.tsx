"use client";

import { useActionState } from "react";
import { createTrainer, updateTrainer } from "./actions";
import { Button, Field, FormError, Input, Select, Textarea } from "@/components/ui";
import type { Trainer } from "@/generated/prisma/client";

type LinkableUser = { id: string; name: string; email: string };

export function TrainerForm({ trainer, linkableUsers }: { trainer?: Trainer; linkableUsers: LinkableUser[] }) {
  const action = trainer ? updateTrainer : createTrainer;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {trainer && <input type="hidden" name="id" value={trainer.id} />}
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" defaultValue={trainer?.name} required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={trainer?.phone ?? ""} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={trainer?.email ?? ""} />
        </Field>
      </div>
      <Field label="Skills / trade expertise" htmlFor="skills" hint="Free text, e.g. Electrician, Solar PV, Wiring">
        <Input id="skills" name="skills" defaultValue={trainer?.skills ?? ""} />
      </Field>
      <Field label="Certifications" htmlFor="certifications">
        <Textarea id="certifications" name="certifications" defaultValue={trainer?.certifications ?? ""} rows={2} />
      </Field>
      <Field label="Fee structure" htmlFor="feeStructure" hint="e.g. ₹5,000/day, or ₹500/participant">
        <Input id="feeStructure" name="feeStructure" defaultValue={trainer?.feeStructure ?? ""} />
      </Field>
      <Field label="Linked portal login (optional)" htmlFor="userId" hint="Lets this trainer log in and view their assigned schedule.">
        <Select id="userId" name="userId" defaultValue={trainer?.userId ?? ""}>
          <option value="">No login linked</option>
          {linkableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </Select>
      </Field>
      {trainer && (
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={trainer.status}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
      )}
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : trainer ? "Save changes" : "Create trainer"}
      </Button>
    </form>
  );
}
