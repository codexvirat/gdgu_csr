"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { createVenue, updateVenue } from "./actions";
import { Button, Field, FormError, Input, Textarea } from "@/components/ui";
import type { Venue } from "@/generated/prisma/client";

export function VenueForm({ venue }: { venue?: Venue }) {
  const action = venue ? updateVenue : createVenue;
  const [state, formAction, pending] = useActionState(action, undefined);

  const initialKeys: string[] = venue?.imageKeys ? (JSON.parse(venue.imageKeys) as string[]) : [];
  const [keepKeys, setKeepKeys] = useState<string[]>(initialKeys);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {venue && <input type="hidden" name="id" value={venue.id} />}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Venue name" htmlFor="name">
          <Input id="name" name="name" defaultValue={venue?.name} required />
        </Field>
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" defaultValue={venue?.city} required />
        </Field>
      </div>

      <Field label="State" htmlFor="state">
        <Input id="state" name="state" defaultValue={venue?.state ?? ""} placeholder="e.g. Rajasthan" />
      </Field>

      <Field label="Address" htmlFor="address">
        <Input id="address" name="address" defaultValue={venue?.address ?? ""} />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Contact person" htmlFor="contactPerson">
          <Input id="contactPerson" name="contactPerson" defaultValue={venue?.contactPerson ?? ""} />
        </Field>
        <Field label="Contact phone" htmlFor="contactPhone">
          <Input id="contactPhone" name="contactPhone" defaultValue={venue?.contactPhone ?? ""} />
        </Field>
        <Field label="Contact email" htmlFor="contactEmail">
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={venue?.contactEmail ?? ""} />
        </Field>
      </div>

      <Field label="Capacity" htmlFor="capacity">
        <Input id="capacity" name="capacity" type="number" min={0} defaultValue={venue?.capacity ?? ""} className="w-40" />
      </Field>

      <Field label="Facilities" htmlFor="facilities" hint="e.g. Projector, Wi-Fi, Parking, AC">
        <Input id="facilities" name="facilities" defaultValue={venue?.facilities ?? ""} />
      </Field>

      <Field label="Rate card" htmlFor="rateCard">
        <Textarea id="rateCard" name="rateCard" defaultValue={venue?.rateCard ?? ""} rows={2} />
      </Field>

      <Field label="Venue images" htmlFor="images" hint="Select one or more photos (JPG, PNG, WebP). Click × to remove an existing photo.">
        {keepKeys.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-3">
            {keepKeys.map((key) => (
              <div key={key} className="relative">
                <input type="hidden" name="keepKey" value={key} />
                <Image
                  src={`/api/files/${key}`}
                  alt="Venue photo"
                  width={120}
                  height={80}
                  className="h-20 w-[120px] rounded-md border border-slate-200 object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => setKeepKeys((prev) => prev.filter((k) => k !== key))}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold leading-none text-white hover:bg-red-600"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <Input id="images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple />
      </Field>

      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : venue ? "Save changes" : "Create venue"}
      </Button>
    </form>
  );
}
