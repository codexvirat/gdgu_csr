import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireCapability, companyScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { updateBookingCost, deleteVenue } from "../actions";
import { DeleteButton } from "@/components/delete-button";
import { Button, Card, Input, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("manageVenuesVendors");
  const { id } = await params;

  const venue = await db.venue.findFirst({
    where: { id, ...companyScope(session) },
    include: {
      bookings: {
        include: { event: { include: { project: { include: { client: true } } } } },
        orderBy: { bookingDate: "desc" },
      },
    },
  });
  if (!venue) notFound();

  const totalCost = venue.bookings.reduce((sum, b) => sum + (b.costIncurred ?? 0), 0);
  const avgCost =
    venue.bookings.filter((b) => b.costIncurred != null).length > 0
      ? totalCost / venue.bookings.filter((b) => b.costIncurred != null).length
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={venue.name}
        description={[venue.city, venue.state].filter(Boolean).join(", ") + (venue.capacity ? ` · capacity ${venue.capacity}` : "")}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/venues/${venue.id}/edit`}>
              <Button variant="secondary">Edit venue</Button>
            </Link>
            {can(session.role, "deleteRecords") && (
              <DeleteButton
                action={deleteVenue}
                hiddenFields={{ id: venue.id }}
                confirmText={venue.name}
                label="Delete venue"
                description="This permanently deletes the venue and its booking history."
              />
            )}
          </div>
        }
      />

      {(() => {
        const imageKeys: string[] = JSON.parse(venue.imageKeys);
        return imageKeys.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {imageKeys.map((key) => (
              <div key={key} className="overflow-hidden rounded-lg border border-slate-200">
                <Image
                  src={`/api/files/${key}`}
                  alt={venue.name}
                  width={280}
                  height={180}
                  className="h-44 w-[280px] object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : null;
      })()}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Contact</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{venue.contactPerson ?? "—"}</p>
          {venue.contactPhone && <p className="text-sm text-slate-500">{venue.contactPhone}</p>}
          {venue.contactEmail && (
            <a href={`mailto:${venue.contactEmail}`} className="text-sm text-blue-600 hover:underline">
              {venue.contactEmail}
            </a>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Facilities</p>
          <p className="mt-1 text-sm text-slate-800">{venue.facilities ?? "Not listed"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Events · avg. cost</p>
          <p className="mt-1 text-sm text-slate-800">
            {venue.bookings.length} events · {avgCost ? `₹${Math.round(avgCost).toLocaleString("en-IN")} avg` : "—"}
          </p>
          {totalCost > 0 && (
            <p className="text-sm text-slate-500">Total: ₹{totalCost.toLocaleString("en-IN")}</p>
          )}
        </Card>
      </div>

      {venue.rateCard && (
        <Card className="p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Rate card</p>
          <p className="whitespace-pre-wrap text-sm text-slate-800">{venue.rateCard}</p>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Events at this venue ({venue.bookings.length})
        </h2>
        {venue.bookings.length === 0 ? (
          <p className="text-sm text-slate-500">No events booked at this venue yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Event</Th>
                <Th>Project</Th>
                <Th>Client</Th>
                <Th>Rate / cost incurred</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {venue.bookings.map((b) => (
                <tr key={b.id}>
                  <Td>{b.bookingDate.toLocaleDateString("en-IN")}</Td>
                  <Td>
                    <Link href={`/dashboard/events/${b.eventId}`} className="font-medium text-slate-900 hover:underline">
                      {b.event.name}
                    </Link>
                  </Td>
                  <Td>{b.event.project.name}</Td>
                  <Td>{b.event.project.client.name}</Td>
                  <Td>
                    <form action={updateBookingCost} className="flex items-center gap-2">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input type="hidden" name="venueId" value={venue.id} />
                      <Input
                        name="costIncurred"
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={b.costIncurred ?? ""}
                        className="w-28"
                        placeholder="₹ amount"
                      />
                      <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                        Save
                      </Button>
                    </form>
                  </Td>
                  <Td>
                    <form action={updateBookingCost} className="flex items-center gap-2">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input type="hidden" name="venueId" value={venue.id} />
                      <input type="hidden" name="costIncurred" value={b.costIncurred ?? ""} />
                      <Input
                        name="notes"
                        defaultValue={b.notes ?? ""}
                        className="w-40"
                        placeholder="Notes…"
                      />
                      <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                        Save
                      </Button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
