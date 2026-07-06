import { requireCapability } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { VenueForm } from "../venue-form";

export default async function NewVenuePage() {
  await requireCapability("manageVenuesVendors");
  return (
    <div>
      <PageHeader title="New venue" />
      <VenueForm />
    </div>
  );
}
