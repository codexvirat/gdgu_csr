import { notFound } from "next/navigation";
import { requireCapability, companyScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessEvent } from "@/lib/event-access";
import { PageHeader } from "@/components/ui";
import { ScanClient } from "./scan-client";

export default async function ScanPage({ params }: { params: Promise<{ eventId: string }> }) {
  const session = await requireCapability("markAttendance");
  const { eventId } = await params;
  if (!(await canAccessEvent(session, eventId))) notFound();

  const event = await db.event.findFirst({
    where: { id: eventId, project: companyScope(session) },
    include: {
      project: true,
      projectCity: true,
      participants: { include: { attendances: true }, orderBy: { name: "asc" } },
    },
  });
  if (!event) notFound();

  const roster = event.participants.map((p) => ({
    id: p.id,
    name: p.name,
    mobile: p.mobile,
    checkInAt: p.attendances[0]?.checkInAt?.toISOString() ?? null,
    checkOutAt: p.attendances[0]?.checkOutAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <PageHeader title={`Scan — ${event.name}`} description={`${event.project.name} · ${event.projectCity.city}`} />
      <ScanClient eventId={event.id} roster={roster} />
    </div>
  );
}
