import { notFound } from "next/navigation";
import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { VenueForm } from "../../venue-form";

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("manageVenuesVendors");
  const { id } = await params;
  const venue = await db.venue.findFirst({ where: { id, ...companyScope(session) } });
  if (!venue) notFound();

  return (
    <div>
      <PageHeader title={`Edit — ${venue.name}`} />
      <VenueForm venue={venue} />
    </div>
  );
}
