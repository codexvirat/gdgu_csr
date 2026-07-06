import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { requireUser, companyScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { canAccessEvent } from "@/lib/event-access";
import { maskAadhaar } from "@/lib/crypto";
import { toCsv, toXlsxBuffer, type XlsxImage } from "@/lib/export";
import { resolveUploadPath } from "@/lib/storage";

export async function GET(request: NextRequest) {
  const session = await requireUser();
  if (!can(session.role, "viewReports") && !can(session.role, "markAttendance")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const eventId = request.nextUrl.searchParams.get("eventId");
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  if (!(await canAccessEvent(session, eventId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await db.event.findFirst({
    where: { id: eventId, project: companyScope(session) },
    include: { participants: { include: { attendances: { where: { eventId } } }, orderBy: { name: "asc" } } },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const headers = ["Name", "Aadhaar", "Mobile", "Trade", "Status", "Check-in", "Check-out", "Check-in Photo"];
  const rows = event.participants.map((p) => {
    const att = p.attendances[0];
    return [
      p.name,
      maskAadhaar(p.aadhaarLast4),
      p.mobile,
      p.tradeCategory ?? "",
      p.status,
      att?.checkInAt ? att.checkInAt.toISOString() : "",
      att?.checkOutAt ? att.checkOutAt.toISOString() : "",
      att?.checkInPhoto ? `${process.env.APP_URL}/api/files/${att.checkInPhoto}` : "",
    ];
  });

  const filename = `attendance-${event.name.replace(/[^a-z0-9]+/gi, "-")}`;

  if (format === "xlsx") {
    const photoColumn = headers.indexOf("Check-in Photo");
    const images: XlsxImage[] = [];
    for (const [row, p] of event.participants.entries()) {
      const checkInPhoto = p.attendances[0]?.checkInPhoto;
      if (!checkInPhoto) continue;
      const extension = path.extname(checkInPhoto).slice(1).toLowerCase();
      if (extension !== "jpeg" && extension !== "png") continue;
      try {
        const buffer = await readFile(resolveUploadPath(checkInPhoto));
        images.push({ row, col: photoColumn, buffer, extension });
      } catch {}
    }

    // Leave the photo cell blank in Excel — the embedded image covers it, so the link text would otherwise show alongside it.
    const xlsxRows = rows.map((row) => row.map((cell, i) => (i === photoColumn ? "" : cell)));
    const buffer = await toXlsxBuffer("Attendance", headers, xlsxRows, [], images);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
