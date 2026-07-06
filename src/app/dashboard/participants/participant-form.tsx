"use client";

import { useActionState, useMemo, useState } from "react";
import { createParticipant } from "./actions";
import { Button, Field, FormError, Input, Select } from "@/components/ui";

type ProjectOption = { id: string; name: string; events: { id: string; name: string; city: string }[] };
type ManagerOption = { id: string; name: string };

export function ParticipantForm({
  projects,
  managers,
  defaultProjectId,
  defaultEventId,
}: {
  projects: ProjectOption[];
  managers: ManagerOption[];
  defaultProjectId?: string;
  defaultEventId?: string;
}) {
  const [state, formAction, pending] = useActionState(createParticipant, undefined);
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");

  const events = useMemo(() => projects.find((p) => p.id === projectId)?.events ?? [], [projects, projectId]);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <Field label="Project" htmlFor="projectId">
        <Select id="projectId" name="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Event / batch (optional)" htmlFor="eventId">
        <Select id="eventId" name="eventId" defaultValue={defaultEventId ?? ""}>
          <option value="">Not yet assigned</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.city} — {e.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Full name" htmlFor="name">
        <Input id="name" name="name" required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Aadhaar number" htmlFor="aadhaar" hint="12 digits. Stored encrypted; only the last 4 digits are shown afterwards.">
          <Input id="aadhaar" name="aadhaar" inputMode="numeric" maxLength={12} required />
        </Field>
        <Field label="Mobile" htmlFor="mobile">
          <Input id="mobile" name="mobile" inputMode="numeric" maxLength={10} required />
        </Field>
      </div>
      <Field label="Address" htmlFor="address">
        <Input id="address" name="address" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Trade category" htmlFor="tradeCategory">
          <Input id="tradeCategory" name="tradeCategory" />
        </Field>
        <Field label="Experience (years)" htmlFor="experienceYears">
          <Input id="experienceYears" name="experienceYears" type="number" min={0} />
        </Field>
      </div>
      <Field label="Manager" htmlFor="managerId">
        <Select id="managerId" name="managerId" defaultValue="">
          <option value="">Unassigned</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>

      {state?.duplicate && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p>
            A participant with the same Aadhaar or mobile already exists: <strong>{state.duplicate.name}</strong> ({state.duplicate.project}).
          </p>
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" name="confirmDuplicate" value="yes" />
            This is a different person — register anyway
          </label>
        </div>
      )}
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Registering…" : "Register participant"}
      </Button>
    </form>
  );
}
