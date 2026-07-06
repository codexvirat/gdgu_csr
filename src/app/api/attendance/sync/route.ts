import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability, companyScope } from "@/lib/auth";
import { canAccessEvent } from "@/lib/event-access";
import { parseAttendanceQrValue } from "@/lib/qrcode";
import { saveBase64Image } from "@/lib/storage";

type IncomingRecord = {
  clientUuid: string;
  participantId: string;
  eventId: string;
  type: "in" | "out";
  qrValue: string;
  timestamp: string;
  photoBase64?: string;
};

export async function POST(request: NextRequest) {
  const session = await requireCapability("markAttendance");
  const { records } = (await request.json()) as { records: IncomingRecord[] };

  const accepted: string[] = [];

  for (const record of records) {
    const parsed = parseAttendanceQrValue(record.qrValue);
    if (!parsed || parsed.participantId !== record.participantId || parsed.eventId !== record.eventId) {
      continue;
    }

    const participant = await db.participant.findFirst({
      where: { id: record.participantId, eventId: record.eventId, project: companyScope(session) },
    });
    if (!participant) continue;
    if (!(await canAccessEvent(session, record.eventId))) continue;

    const when = new Date(record.timestamp);
    const existing = await db.attendance.findUnique({
      where: { participantId_eventId: { participantId: record.participantId, eventId: record.eventId } },
    });

    if (record.type === "in") {
      if (!existing) {
        let checkInPhoto: string | undefined;
        if (record.photoBase64) {
          try {
            checkInPhoto = (await saveBase64Image(record.photoBase64, `attendance/${record.eventId}`)).fileKey;
          } catch {
            checkInPhoto = undefined;
          }
        }
        await db.attendance.create({
          data: {
            participantId: record.participantId,
            eventId: record.eventId,
            checkInAt: when,
            checkInPhoto,
            qrCodeValue: record.qrValue,
            clientUuid: record.clientUuid,
          },
        });
      } else if (!existing.checkInPhoto && record.photoBase64) {
        // Existing check-in has no photo — add the photo without overwriting the original timestamp.
        try {
          const checkInPhoto = (await saveBase64Image(record.photoBase64, `attendance/${record.eventId}`)).fileKey;
          await db.attendance.update({ where: { id: existing.id }, data: { checkInPhoto } });
        } catch {}
      }
    } else {
      if (existing) {
        await db.attendance.update({ where: { id: existing.id }, data: { checkOutAt: when } });
      } else {
        await db.attendance.create({
          data: {
            participantId: record.participantId,
            eventId: record.eventId,
            checkOutAt: when,
            qrCodeValue: record.qrValue,
            clientUuid: record.clientUuid,
          },
        });
      }
    }

    accepted.push(record.clientUuid);
  }

  return NextResponse.json({ accepted });
}
