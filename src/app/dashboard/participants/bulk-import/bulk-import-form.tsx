"use client";

import { useActionState, useMemo, useState } from "react";
import { bulkImportParticipants } from "../actions";
import { Badge, Button, EmptyState, Field, FormError, Input, Select, Table, Td, Th } from "@/components/ui";

type ProjectOption = { id: string; name: string; events: { id: string; name: string; city: string }[] };
type ManagerOption = { id: string; name: string };

export function BulkImportForm({
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
  const [state, formAction, pending] = useActionState(bulkImportParticipants, undefined);
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const events = useMemo(() => projects.find((p) => p.id === projectId)?.events ?? [], [projects, projectId]);

  if (state?.summary) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.summary.created} created, {state.summary.skipped} skipped.
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Row</Th>
              <Th>Name</Th>
              <Th>Mobile</Th>
              <Th>Status</Th>
              <Th>Detail</Th>
            </tr>
          </thead>
          <tbody>
            {state.summary.rows.map((r) => (
              <tr key={r.row}>
                <Td>{r.row}</Td>
                <Td>{r.name}</Td>
                <Td>{r.mobile}</Td>
                <Td>
                  <Badge tone={r.status === "CREATED" ? "green" : r.status === "SKIPPED" ? "amber" : "red"}>{r.status}</Badge>
                </Td>
                <Td>{r.reason ?? (r.status === "CREATED" ? "Registered" : "")}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  }

  if (projects.length === 0) {
    return <EmptyState title="No events available" />;
  }

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <Field label="Project" htmlFor="projectId">
        <Select id="projectId" name="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Event" htmlFor="eventId">
        <Select id="eventId" name="eventId" defaultValue={defaultEventId ?? ""}>
          <option value="">Not yet assigned</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.city} — {e.name}
            </option>
          ))}
        </Select>
      </Field>
      {managers.length > 0 && (
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
      )}
      <Field label="File (.csv or .xlsx)" htmlFor="file" hint="Columns: name, aadhaar, mobile, address (optional), tradeCategory (optional), experienceYears (optional).">
        <Input id="file" name="file" type="file" accept=".csv,.xlsx" required />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Importing…" : "Import"}
      </Button>
    </form>
  );
}
