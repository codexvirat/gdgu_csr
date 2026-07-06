import Link from "next/link";
import Image from "next/image";
import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button, EmptyState, Field, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui";

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; state?: string; name?: string; minCapacity?: string }>;
}) {
  const session = await requireCapability("manageVenuesVendors");
  const { city, state, name, minCapacity } = await searchParams;

  const venues = await db.venue.findMany({
    where: {
      ...companyScope(session),
      ...(name ? { name: { contains: name } } : {}),
      ...(city ? { city: { contains: city } } : {}),
      ...(state ? { state: { contains: state } } : {}),
      ...(minCapacity ? { capacity: { gte: Number(minCapacity) } } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      bookings: { select: { costIncurred: true } },
    },
  });

  const allVenues = await db.venue.findMany({ where: companyScope(session), select: { city: true, state: true } });
  const cities = [...new Set(allVenues.map((v) => v.city))].sort();
  const states = [...new Set(allVenues.map((v) => v.state).filter(Boolean))].sort() as string[];

  return (
    <div>
      <PageHeader
        title="Venues"
        description="Centralized venue master with rate cards and booking history."
        actions={
          <Link href="/dashboard/venues/new">
            <Button>New venue</Button>
          </Link>
        }
      />

      <form className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5" method="get">
        <Field label="Venue name" htmlFor="name">
          <Input id="name" name="name" placeholder="Search name…" defaultValue={name ?? ""} />
        </Field>
        <Field label="State" htmlFor="state">
          <Select id="state" name="state" defaultValue={state ?? ""}>
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="City" htmlFor="city">
          <Select id="city" name="city" defaultValue={city ?? ""}>
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Min. capacity" htmlFor="minCapacity">
          <Input id="minCapacity" name="minCapacity" type="number" min={0} defaultValue={minCapacity ?? ""} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" variant="secondary" className="w-full">
            Filter
          </Button>
        </div>
      </form>

      {venues.length === 0 ? (
        <EmptyState title="No venues found" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Photo</Th>
              <Th>Name</Th>
              <Th>City</Th>
              <Th>State</Th>
              <Th>Capacity</Th>
              <Th>Events</Th>
              <Th>Total cost</Th>
              <Th>Contact</Th>
            </tr>
          </thead>
          <tbody>
            {venues.map((v) => {
              const totalCost = v.bookings.reduce((sum, b) => sum + (b.costIncurred ?? 0), 0);
              const imageKeys: string[] = JSON.parse(v.imageKeys);
              return (
                <tr key={v.id}>
                  <Td>
                    {imageKeys[0] ? (
                      <Image
                        src={`/api/files/${imageKeys[0]}`}
                        alt={v.name}
                        width={56}
                        height={40}
                        className="rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-10 w-14 rounded bg-slate-100" />
                    )}
                  </Td>
                  <Td>
                    <Link href={`/dashboard/venues/${v.id}`} className="font-medium text-slate-900 hover:underline">
                      {v.name}
                    </Link>
                  </Td>
                  <Td>{v.city}</Td>
                  <Td>{v.state ?? "—"}</Td>
                  <Td>{v.capacity ?? "—"}</Td>
                  <Td>{v.bookings.length}</Td>
                  <Td>{totalCost > 0 ? `₹${totalCost.toLocaleString("en-IN")}` : "—"}</Td>
                  <Td>{v.contactPerson ?? "—"}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
