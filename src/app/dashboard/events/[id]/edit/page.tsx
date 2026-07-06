import { notFound } from "next/navigation";
import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { EditEventForm } from "../../edit-event-form";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCapability("manageEvents");
  const { id } = await params;
  const event = await db.event.findFirst({ where: { id, project: companyScope(session) } });
  if (!event) notFound();

  const managers = await db.user.findMany({
    where: { ...companyScope(session), role: { in: ["ADMIN", "DIRECTOR", "MANAGER"] }, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <PageHeader title={`Edit — ${event.name}`} />
      <EditEventForm event={event} managers={managers} />
    </div>
  );
}
