import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, companyScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { canAccessEvent } from "@/lib/event-access";
import { toCsv, toXlsxBuffer } from "@/lib/export";

export async function GET(request: NextRequest) {
  const session = await requireUser();
  if (!can(session.role, "viewReports") && !can(session.role, "conductScoreAssessments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const eventId = request.nextUrl.searchParams.get("eventId");
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  if (!(await canAccessEvent(session, eventId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await db.event.findFirst({ where: { id: eventId, project: companyScope(session) } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const results = await db.assessmentResult.findMany({
    where: { eventId },
    include: { participant: true, assessment: true },
    orderBy: [{ assessment: { title: "asc" } }, { participant: { name: "asc" } }],
  });

  const headers = ["Participant", "Assessment", "Total Questions", "Attempted", "Correct", "Score", "Total Marks", "Status", "Mode", "Attempted At"];
  const rows = results.map((r) => [
    r.participant.name,
    r.assessment.title,
    r.totalQuestions,
    r.attemptedCount,
    r.correctCount,
    r.score,
    r.assessment.totalMarks,
    r.status,
    r.mode,
    r.attemptedAt.toISOString(),
  ]);

  const filename = `assessment-results-${event.name.replace(/[^a-z0-9]+/gi, "-")}`;

  if (format === "xlsx") {
    const buffer = await toXlsxBuffer("Assessment Results", headers, rows);
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
