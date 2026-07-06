import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, companyScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { canAccessEvent } from "@/lib/event-access";
import { toCsv, toXlsxBuffer } from "@/lib/export";

export async function GET(request: NextRequest) {
  const session = await requireUser();
  if (!can(session.role, "viewReports") && !can(session.role, "viewFeedback") && !can(session.role, "manageFeedback")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const eventId = request.nextUrl.searchParams.get("eventId");
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  if (!(await canAccessEvent(session, eventId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await db.event.findFirst({ where: { id: eventId, project: companyScope(session) } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const responses = await db.feedbackResponse.findMany({
    where: { eventId },
    include: { participant: true, feedbackForm: true, answers: { include: { question: true } } },
    orderBy: [{ feedbackForm: { title: "asc" } }, { participant: { name: "asc" } }],
  });

  const headers = ["Participant", "Feedback Form", "Question", "Answer Type", "Answer", "Submitted At"];
  const rows = responses.flatMap((r) =>
    r.answers.map((a) => [
      r.participant.name,
      r.feedbackForm.title,
      a.question.questionText,
      a.question.type,
      a.question.type === "RATING" ? (a.ratingValue ?? "") : (a.textValue ?? ""),
      r.submittedAt.toISOString(),
    ]),
  );

  const filename = `feedback-responses-${event.name.replace(/[^a-z0-9]+/gi, "-")}`;

  if (format === "xlsx") {
    const buffer = await toXlsxBuffer("Feedback Responses", headers, rows);
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
