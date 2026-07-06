"use client";

import { useActionState, useMemo, useState } from "react";
import { createEvent } from "./actions";
import { Button, Card, Field, FormError, Input, Select } from "@/components/ui";

type ProjectOption = { id: string; name: string; cities: { id: string; city: string }[] };
type SimpleOption = { id: string; name: string };
type VenueOption = {
  id: string;
  name: string;
  city: string;
  capacity: number | null;
  bookings: { costIncurred: number | null; bookingDate: string; event: { project: { name: string } } }[];
};

export function NewEventForm({
  projects,
  managers,
  venues,
  defaultProjectId,
}: {
  projects: ProjectOption[];
  managers: SimpleOption[];
  venues: VenueOption[];
  defaultProjectId?: string;
}) {
  const [state, formAction, pending] = useActionState(createEvent, undefined);
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [venueId, setVenueId] = useState("");

  const cities = useMemo(() => projects.find((p) => p.id === projectId)?.cities ?? [], [projects, projectId]);
  const selectedVenue = useMemo(() => venues.find((v) => v.id === venueId), [venues, venueId]);

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
      <Field label="City" htmlFor="projectCityId">
        <Select id="projectCityId" name="projectCityId" required>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.city}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Event / batch name" htmlFor="name">
        <Input id="name" name="name" required placeholder="e.g. Delhi Batch 1" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" htmlFor="eventDateStart">
          <Input id="eventDateStart" name="eventDateStart" type="date" required />
        </Field>
        <Field label="End date" htmlFor="eventDateEnd">
          <Input id="eventDateEnd" name="eventDateEnd" type="date" required />
        </Field>
      </div>
      <Field label="Target headcount" htmlFor="targetCount">
        <Input id="targetCount" name="targetCount" type="number" min={1} required className="w-40" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="requiresAssessment" defaultChecked />
        This event has an assessment (PIN required for trainee login). Feedback is always collected regardless.
      </label>
      <Field label="Operations Manager" htmlFor="opsManagerId">
        <Select id="opsManagerId" name="opsManagerId" defaultValue="">
          <option value="">Unassigned</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Venue (optional)" htmlFor="venueId">
        <Select id="venueId" name="venueId" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
          <option value="">— Choose existing venue, or add new below —</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.city}){v.capacity ? ` — capacity ${v.capacity}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      {selectedVenue && (
        <Card className="bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-700">
            {selectedVenue.name} — {selectedVenue.bookings.length} prior booking{selectedVenue.bookings.length === 1 ? "" : "s"}
          </p>
          {selectedVenue.bookings.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-slate-500">
              {selectedVenue.bookings.slice(0, 5).map((b, i) => (
                <li key={i}>
                  {new Date(b.bookingDate).toLocaleDateString()} — {b.event.project.name}
                  {b.costIncurred ? ` — ₹${b.costIncurred.toLocaleString("en-IN")}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Or quick-add new venue: name" htmlFor="newVenueName">
          <Input id="newVenueName" name="newVenueName" placeholder="Leave blank if selecting above" />
        </Field>
        <Field label="New venue city" htmlFor="newVenueCity">
          <Input id="newVenueCity" name="newVenueCity" />
        </Field>
      </div>
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create event"}
      </Button>
    </form>
  );
}
