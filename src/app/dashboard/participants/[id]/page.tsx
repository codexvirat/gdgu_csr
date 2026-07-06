import { notFound } from "next/navigation";
import { requireUser, companyScope } from "@/lib/auth";
import { can, canViewParticipantPin, isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { accessibleEventIds, eventWhereFragment } from "@/lib/event-access";
import { maskAadhaar, decryptPin } from "@/lib/crypto";
import { buildAttendanceQrValue, qrPngDataUrl } from "@/lib/qrcode";
import { uploadParticipantDocument, updateParticipantStatus, deleteParticipant } from "../actions";
import { UnmaskButton } from "../unmask-button";
import { DeleteButton } from "@/components/delete-button";
import { Badge, Button, Card, Input, PageHeader, Select } from "@/components/ui";

export default async function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;

  const eventAccess = await accessibleEventIds(session);
  const participant = await db.participant.findFirst({
    where: { id, project: companyScope(session), ...(isEventScopedRole(session.role) ? { event: eventWhereFragment(eventAccess) } : {}) },
    include: {
      project: true,
      event: { include: { projectCity: true } },
      manager: true,
      documents: { orderBy: { uploadedAt: "desc" } },
      attendances: true,
    },
  });
  if (!participant) notFound();

  const canUnmask = can(session.role, "unmaskAadhaar");
  const canEdit = can(session.role, "editParticipants");
  const canSeePin = canViewParticipantPin(session.role);
  const qrValue = participant.eventId ? buildAttendanceQrValue(participant.id, participant.eventId) : null;
  const qrImage = qrValue ? await qrPngDataUrl(qrValue) : null;
  const attendance = participant.attendances[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={participant.name}
        description={`${participant.project.name}${participant.event ? ` · ${participant.event.projectCity.city} — ${participant.event.name}` : ""}`}
        actions={
          can(session.role, "deleteRecords") ? (
            <DeleteButton
              action={deleteParticipant}
              hiddenFields={{ id: participant.id }}
              confirmText={participant.name}
              label="Delete participant"
              description="This permanently deletes the participant, their documents, attendance, assessment results, and feedback responses."
            />
          ) : undefined
        }
      />


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Details</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-slate-500">Aadhaar</dt>
              <dd>{canUnmask ? <UnmaskButton participantId={participant.id} masked={maskAadhaar(participant.aadhaarLast4)} /> : maskAadhaar(participant.aadhaarLast4)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Mobile</dt>
              <dd>{participant.mobile}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Address</dt>
              <dd>{participant.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Trade</dt>
              <dd>{participant.tradeCategory ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Experience</dt>
              <dd>{participant.experienceYears != null ? `${participant.experienceYears} yrs` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Manager</dt>
              <dd>{participant.manager?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Status</dt>
              <dd>
                <Badge tone={participant.status === "CERTIFIED" ? "green" : participant.status === "DROPPED" ? "red" : "slate"}>{participant.status}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Attendance</dt>
              <dd>
                {attendance?.checkInAt ? `In: ${attendance.checkInAt.toLocaleString()}` : "Not checked in"}
                {attendance?.checkOutAt ? ` · Out: ${attendance.checkOutAt.toLocaleString()}` : ""}
              </dd>
              {attendance?.checkInPhoto && (
                <a href={`/api/files/${attendance.checkInPhoto}`} target="_blank" rel="noreferrer" className="mt-1 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/files/${attendance.checkInPhoto}`} alt="Check-in photo" className="h-20 w-20 rounded-md object-cover" />
                </a>
              )}
            </div>
          </dl>

          {canEdit && (
            <form action={updateParticipantStatus} className="mt-4 flex items-end gap-2">
              <input type="hidden" name="id" value={participant.id} />
              <Select name="status" defaultValue={participant.status} className="w-48">
                <option value="REGISTERED">Registered</option>
                <option value="TRAINED">Trained</option>
                <option value="CERTIFIED">Certified</option>
                <option value="DROPPED">Dropped</option>
              </Select>
              <Button type="submit" variant="secondary">
                Update status
              </Button>
            </form>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Attendance QR</h2>
            {qrImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrImage} alt="Attendance QR code" className="mx-auto h-44 w-44" />
            ) : (
              <p className="text-sm text-slate-500">Assign this participant to an event to generate a check-in QR code.</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Trainee login</h2>
            <p className="text-sm text-slate-600">Mobile: {participant.mobile}</p>
            {participant.event?.requiresAssessment ? (
              canSeePin ? (
                <p className="mt-1 text-sm text-slate-600">
                  Event PIN:{" "}
                  <span className="font-mono text-base font-semibold text-slate-900">
                    {participant.event.eventPinEncrypted ? decryptPin(participant.event.eventPinEncrypted) : "Not set — ask Super Admin to set one."}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-400">PIN hidden for your role.</p>
              )
            ) : (
              <p className="mt-1 text-xs text-slate-500">Feedback only — PIN not required for trainee login on this event.</p>
            )}
          </Card>
        </div>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Documents</h2>
        {participant.documents.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">No documents uploaded yet.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {participant.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm">
                <a href={`/api/files/${d.fileUrl}`} target="_blank" rel="noreferrer" className="font-medium text-slate-700 hover:underline">
                  {d.docType}
                </a>
                <span className="text-xs text-slate-500">{d.uploadedAt.toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <form action={uploadParticipantDocument} className="flex items-end gap-2">
            <input type="hidden" name="participantId" value={participant.id} />
            <Input name="docType" placeholder="Document type (e.g. Aadhaar copy)" className="w-56" />
            <Input name="file" type="file" required />
            <Button type="submit" variant="secondary">
              Upload
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
