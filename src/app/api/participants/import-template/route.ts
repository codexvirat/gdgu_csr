import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { toXlsxBuffer } from "@/lib/export";

export async function GET() {
  const session = await requireUser();
  if (!can(session.role, "registerParticipants")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const headers = ["name", "aadhaar", "mobile", "address", "tradeCategory", "experienceYears"];
  const rows = [["Ramesh Kumar", "234567890123", "9876543210", "Rohini, Delhi", "Electrician", "3"]];
  // Aadhaar (1) and mobile (2) must stay text columns, or Excel shows long digit-only values in scientific notation.
  const buffer = await toXlsxBuffer("Participants", headers, rows, [1, 2]);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="participant-import-template.xlsx"`,
    },
  });
}
