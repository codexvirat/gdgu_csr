"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Input } from "@/components/ui";

export type DeleteState = { error?: string } | undefined;

export function DeleteButton({
  action,
  hiddenFields,
  confirmText,
  label = "Delete",
  description,
}: {
  action: (prevState: DeleteState, formData: FormData) => Promise<DeleteState>;
  hiddenFields: Record<string, string>;
  confirmText: string;
  label?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [state, formAction, pending] = useActionState(action, undefined);

  if (!open) {
    return (
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className="w-full max-w-md space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-sm text-red-800">
        {description ?? "This permanently deletes this record and everything under it."} Type <strong>{confirmText}</strong> to confirm.
      </p>
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={confirmText} className="border-red-300" />
      <form action={formAction} className="flex gap-2">
        {Object.entries(hiddenFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <Button type="submit" variant="danger" disabled={value !== confirmText || pending}>
          {pending ? "Deleting…" : "Confirm delete"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setOpen(false);
            setValue("");
          }}
        >
          Cancel
        </Button>
      </form>
      <FormError message={state?.error} />
    </div>
  );
}
