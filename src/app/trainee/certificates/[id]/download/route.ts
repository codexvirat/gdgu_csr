import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { requireTrainee } from "@/lib/trainee-auth";
import { db } from "@/lib/db";
import { resolveUploadPath } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const trainee = await requireTrainee();
  const { id } = await params;

  const certificate = await db.certificate.findFirst({ where: { id, participantId: trainee.sub } });
  if (!certificate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const data = await readFile(resolveUploadPath(certificate.fileUrl));
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificate.certificateNumber}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
