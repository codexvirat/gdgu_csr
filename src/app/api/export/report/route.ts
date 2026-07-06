import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability, companyScope } from "@/lib/auth";
import { maskAadhaar } from "@/lib/crypto";
import { toCsv, toXlsxBuffer } from "@/lib/export";

export async function GET(request: NextRequest) {
  const session = await requireCapability("viewReports");
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const projectId = request.nextUrl.searchParams.get("projectId");
  const eventId = request.nextUrl.searchParams.get("eventId");

  // Event-level report: participant detail with individual attendance
  if (eventId) {
    const event = await db.event.findFirst({
      where: { id: eventId, project: companyScope(session) },
      include: {
        project: true,
        projectCity: true,
        participants: {
          include: { attendances: { where: { eventId } } },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const headers = ["Project", "City", "Event", "Name", "Mobile", "Aadhaar", "Trade", "Status", "Check-in", "Check-out"];
    const rows = event.participants.map((p) => {
      const att = p.attendances[0];
      return [
        event.project.name,
        event.projectCity.city,
        event.name,
        p.name,
        p.mobile,
        maskAadhaar(p.aadhaarLast4),
        p.tradeCategory ?? "",
        p.status,
        att?.checkInAt ? att.checkInAt.toLocaleString() : "",
        att?.checkOutAt ? att.checkOutAt.toLocaleString() : "",
      ];
    });

    const filename = `event-report-${event.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

    if (format === "xlsx") {
      // mobile col=4, aadhaar col=5 — keep as text so Excel doesn't mangle them
      const buffer = await toXlsxBuffer("Event Report", headers, rows, [4, 5]);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
    return new NextResponse(toCsv(headers, rows), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${filename}.csv"` },
    });
  }

  // Summary report: all events or filtered to one project
  const events = await db.event.findMany({
    where: projectId ? { projectId, project: companyScope(session) } : { project: companyScope(session) },
    orderBy: [{ project: { name: "asc" } }, { eventDateStart: "asc" }],
    include: { project: true, projectCity: true, participants: { include: { attendances: true } } },
  });

  const headers = ["Project", "City", "Event", "Target", "Registered", "Checked in", "Checked out", "Attendance %"];
  const rows = events.map((e) => {
    const registered = e.participants.length;
    const checkedIn = e.participants.filter((p) => p.attendances[0]?.checkInAt).length;
    const checkedOut = e.participants.filter((p) => p.attendances[0]?.checkOutAt).length;
    const attendancePct = registered > 0 ? Math.round((checkedIn / registered) * 100) : 0;
    return [e.project.name, e.projectCity.city, e.name, e.targetCount, registered, checkedIn, checkedOut, attendancePct];
  });

  let filename = "overall-report";
  if (projectId && events.length > 0) {
    filename = `project-report-${events[0].project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  }

  if (format === "xlsx") {
    const buffer = await toXlsxBuffer("Report", headers, rows);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }
  return new NextResponse(toCsv(headers, rows), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${filename}.csv"` },
  });
}
