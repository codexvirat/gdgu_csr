import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, companyScope } from "@/lib/auth";
import { can, canViewParticipantPin, isGlobalRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { canAccessEvent } from "@/lib/event-access";
import { isEventBehindTarget } from "@/lib/event-status";
import { maskAadhaar, decryptPin } from "@/lib/crypto";
import { removeTrainerFromEvent } from "../../trainers/actions";
import { publishEventAssessment, unpublishEventAssessment } from "../../assessments/actions";
import { AllotAssessmentForm } from "../../assessments/allot-assessment-form";
import { publishEventFeedback, unpublishEventFeedback } from "../../feedback/actions";
import { AllotFeedbackForm } from "../../feedback/allot-feedback-form";
import { publishEventCertificate, unpublishEventCertificate } from "../../certificates/actions";
import { AllotCertificateForm } from "../../certificates/allot-certificate-form";
import { removePaFromEvent, deleteEvent } from "../actions";
import { AssignTrainerForm } from "../assign-trainer-form";
import { AddVolunteerForm } from "../add-volunteer-form";
import { AssignPaForm } from "../assign-pa-form";
import { SetEventPinForm } from "../set-pin-form";
import { DeleteButton } from "@/components/delete-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Badge, Button, Card, PageHeader, Table, Td, Th } from "@/components/ui";

const STATUS_TONE: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  SCHEDULED: "slate",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  CANCELLED: "red",
  REGISTERED: "slate",
  TRAINED: "blue",
  CERTIFIED: "green",
  DROPPED: "red",
};

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;

  if (!(await canAccessEvent(session, id))) notFound();

  const event = await db.event.findFirst({
    where: { id, project: companyScope(session) },
    include: {
      project: true,
      projectCity: true,
      venue: { include: { bookings: { include: { event: { include: { project: true } } } } } },
      opsManager: true,
      participants: { include: { attendances: true }, orderBy: { createdAt: "desc" } },
      trainers: { include: { trainer: true } },
      volunteers: { select: { id: true, name: true, email: true, status: true } },
      pas: { include: { user: { select: { id: true, name: true, email: true, status: true } } } },
      eventAssessments: { include: { assessment: true }, orderBy: { allottedAt: "asc" } },
      eventFeedbacks: { include: { feedbackForm: true }, orderBy: { allottedAt: "asc" } },
      eventCertificates: { include: { certificateTemplate: true, certificates: true }, orderBy: { allottedAt: "asc" } },
    },
  });
  if (!event) notFound();

  const behind = isEventBehindTarget(event, event.participants.length);
  const manage = can(session.role, "manageEvents");
  const canRegister = can(session.role, "registerParticipants");
  const canMarkAttendance = can(session.role, "markAttendance");
  const canAssignTrainers = can(session.role, "assignTrainersManagers");
  const canSeePin = canViewParticipantPin(session.role);
  const isSuperAdmin = isGlobalRole(session.role);
  const canPublishAssessments = can(session.role, "publishAssessments");
  const canDownloadAssessmentResults = can(session.role, "viewReports") || can(session.role, "conductScoreAssessments");
  const canPublishFeedback = can(session.role, "publishFeedback");
  const canDownloadFeedbackResponses = can(session.role, "viewReports") || can(session.role, "viewFeedback") || can(session.role, "manageFeedback");
  const canPublishCertificates = can(session.role, "publishCertificates");

  const assignableTrainers = canAssignTrainers
    ? await db.trainer.findMany({
        where: { ...companyScope(session), status: "ACTIVE", id: { notIn: event.trainers.map((t) => t.trainerId) } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const assignablePas = canAssignTrainers
    ? await db.user.findMany({
        where: { ...companyScope(session), role: "PA", status: "ACTIVE", id: { notIn: event.pas.map((p) => p.userId) } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const candidateAssessments = canPublishAssessments && event.requiresAssessment
    ? await db.assessment.findMany({
        where: { projectId: event.projectId, id: { notIn: event.eventAssessments.map((ea) => ea.assessmentId) } },
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      })
    : [];

  const candidateFeedbackForms = canPublishFeedback
    ? await db.feedbackForm.findMany({
        where: { projectId: event.projectId, id: { notIn: event.eventFeedbacks.map((ef) => ef.feedbackFormId) } },
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      })
    : [];

  const candidateCertificateTemplates = canPublishCertificates
    ? await db.certificateTemplate.findMany({
        where: { projectId: event.projectId, id: { notIn: event.eventCertificates.map((ec) => ec.certificateTemplateId) } },
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      })
    : [];

  const otherBookings = event.venue?.bookings.filter((b) => b.eventId !== event.id) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.name}
        description={
          <span className="flex items-center gap-2">
            {event.project.name} · {event.projectCity.city}
            <Badge tone={event.requiresAssessment ? "blue" : "slate"}>{event.requiresAssessment ? "Assessment + Feedback" : "Feedback only"}</Badge>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <CopyLinkButton link={`${process.env.APP_URL}/trainee-login`} />
            {manage && (
              <Link href={`/dashboard/events/${event.id}/edit`}>
                <Button variant="secondary">Edit event</Button>
              </Link>
            )}
            {can(session.role, "deleteRecords") && (
              <DeleteButton
                action={deleteEvent}
                hiddenFields={{ id: event.id }}
                confirmText={event.name}
                label="Delete event"
                description="This permanently deletes the event, its trainer/PA/volunteer assignments, attendance records, and ratings. Participants are unassigned from it rather than deleted."
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
          <div className="mt-1 space-x-1">
            <Badge tone={STATUS_TONE[event.status]}>{event.status}</Badge>
            {behind && <Badge tone="red">Behind target</Badge>}
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dates</p>
          <p className="mt-1 text-sm text-slate-800">
            {event.eventDateStart.toLocaleDateString()} – {event.eventDateEnd.toLocaleDateString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Venue</p>
          <p className="mt-1 text-sm text-slate-800">
            {event.venue ? (
              <Link href={`/dashboard/venues/${event.venue.id}`} className="hover:underline">
                {event.venue.name} ({event.venue.city})
              </Link>
            ) : (
              "Not set"
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Manager / headcount</p>
          <p className="mt-1 text-sm text-slate-800">
            {event.opsManager?.name ?? "Unassigned"} · {event.participants.length}/{event.targetCount}
          </p>
        </Card>
      </div>

      {event.venue && otherBookings.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">{event.venue.name} — prior bookings</h2>
          <Table>
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>Project</Th>
                <Th>Date</Th>
                <Th>Cost incurred</Th>
              </tr>
            </thead>
            <tbody>
              {otherBookings.map((b) => (
                <tr key={b.id}>
                  <Td>{b.event.name}</Td>
                  <Td>{b.event.project.name}</Td>
                  <Td>{b.bookingDate.toLocaleDateString()}</Td>
                  <Td>{b.costIncurred ? `₹${b.costIncurred.toLocaleString("en-IN")}` : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {canAssignTrainers && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Trainers</h2>
          {event.trainers.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>Trainer</Th>
                  <Th>Role</Th>
                  <Th>Fee</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {event.trainers.map((et) => (
                  <tr key={et.id}>
                    <Td>
                      <Link href={`/dashboard/trainers/${et.trainerId}`} className="font-medium text-slate-900 hover:underline">
                        {et.trainer.name}
                      </Link>
                    </Td>
                    <Td>{et.roleInEvent ?? "—"}</Td>
                    <Td>{et.feeAmount ? `₹${et.feeAmount.toLocaleString("en-IN")}` : "—"}</Td>
                    <Td className="text-right">
                      <form action={removeTrainerFromEvent}>
                        <input type="hidden" name="id" value={et.id} />
                        <input type="hidden" name="eventId" value={event.id} />
                        <button type="submit" className="text-sm text-red-600 hover:underline">
                          Remove
                        </button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <div className="mt-3">
            <AssignTrainerForm eventId={event.id} trainers={assignableTrainers} />
          </div>
        </Card>
      )}

      {manage && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Volunteers</h2>
          {event.volunteers.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Login email</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {event.volunteers.map((v) => (
                  <tr key={v.id}>
                    <Td>{v.name}</Td>
                    <Td>{v.email}</Td>
                    <Td>
                      <Badge tone={v.status === "ACTIVE" ? "green" : "slate"}>{v.status}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <div className="mt-3">
            <AddVolunteerForm eventId={event.id} />
          </div>
        </Card>
      )}

      {canAssignTrainers && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">PAs</h2>
          {event.pas.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Login email</Th>
                  <Th>Status</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {event.pas.map((p) => (
                  <tr key={p.id}>
                    <Td>{p.user.name}</Td>
                    <Td>{p.user.email}</Td>
                    <Td>
                      <Badge tone={p.user.status === "ACTIVE" ? "green" : "slate"}>{p.user.status}</Badge>
                    </Td>
                    <Td className="text-right">
                      <form action={removePaFromEvent}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="eventId" value={event.id} />
                        <button type="submit" className="text-sm text-red-600 hover:underline">
                          Remove
                        </button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <div className="mt-3">
            <AssignPaForm eventId={event.id} pas={assignablePas} />
          </div>
        </Card>
      )}

      {event.requiresAssessment && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Assessments</h2>
            {canDownloadAssessmentResults && event.eventAssessments.length > 0 && (
              <div className="flex gap-2">
                <a href={`/api/export/assessment-results?eventId=${event.id}&format=csv`}>
                  <Button variant="ghost">Download results (CSV)</Button>
                </a>
                <a href={`/api/export/assessment-results?eventId=${event.id}&format=xlsx`}>
                  <Button variant="ghost">Download results (Excel)</Button>
                </a>
              </div>
            )}
          </div>
          {event.eventAssessments.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>Paper</Th>
                  <Th>Pass mark</Th>
                  <Th>Status</Th>
                  {canPublishAssessments && <Th> </Th>}
                </tr>
              </thead>
              <tbody>
                {event.eventAssessments.map((ea) => (
                  <tr key={ea.id}>
                    <Td>
                      <Link href={`/dashboard/assessments/${ea.assessmentId}`} className="font-medium text-slate-900 hover:underline">
                        {ea.assessment.title}
                      </Link>
                    </Td>
                    <Td>
                      {ea.assessment.passMark} / {ea.assessment.totalMarks}
                    </Td>
                    <Td>
                      <Badge tone={ea.isPublished ? "green" : "slate"}>{ea.isPublished ? "Published" : "Draft"}</Badge>
                    </Td>
                    {canPublishAssessments && (
                      <Td className="text-right">
                        <form action={ea.isPublished ? unpublishEventAssessment : publishEventAssessment}>
                          <input type="hidden" name="id" value={ea.id} />
                          <button type="submit" className="text-sm text-slate-600 hover:underline">
                            {ea.isPublished ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {canPublishAssessments && (
            <div className="mt-3">
              <AllotAssessmentForm fixedEventId={event.id} options={candidateAssessments.map((a) => ({ id: a.id, label: a.title }))} />
            </div>
          )}
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Feedback</h2>
          {canDownloadFeedbackResponses && event.eventFeedbacks.length > 0 && (
            <div className="flex gap-2">
              <a href={`/api/export/feedback-responses?eventId=${event.id}&format=csv`}>
                <Button variant="ghost">Download responses (CSV)</Button>
              </a>
              <a href={`/api/export/feedback-responses?eventId=${event.id}&format=xlsx`}>
                <Button variant="ghost">Download responses (Excel)</Button>
              </a>
            </div>
          )}
        </div>
        {event.eventFeedbacks.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Form</Th>
                <Th>Status</Th>
                {canPublishFeedback && <Th> </Th>}
              </tr>
            </thead>
            <tbody>
              {event.eventFeedbacks.map((ef) => (
                <tr key={ef.id}>
                  <Td>
                    <Link href={`/dashboard/feedback/${ef.feedbackFormId}`} className="font-medium text-slate-900 hover:underline">
                      {ef.feedbackForm.title}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={ef.isPublished ? "green" : "slate"}>{ef.isPublished ? "Published" : "Draft"}</Badge>
                  </Td>
                  {canPublishFeedback && (
                    <Td className="text-right">
                      <form action={ef.isPublished ? unpublishEventFeedback : publishEventFeedback}>
                        <input type="hidden" name="id" value={ef.id} />
                        <button type="submit" className="text-sm text-slate-600 hover:underline">
                          {ef.isPublished ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {canPublishFeedback && (
          <div className="mt-3">
            <AllotFeedbackForm fixedEventId={event.id} options={candidateFeedbackForms.map((f) => ({ id: f.id, label: f.title }))} />
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Certificates</h2>
        {event.eventCertificates.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Template</Th>
                <Th>Status</Th>
                <Th>Issued</Th>
                {canPublishCertificates && <Th> </Th>}
              </tr>
            </thead>
            <tbody>
              {event.eventCertificates.map((ec) => (
                <tr key={ec.id}>
                  <Td>
                    <Link href={`/dashboard/certificates/${ec.certificateTemplateId}`} className="font-medium text-slate-900 hover:underline">
                      {ec.certificateTemplate.title}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={ec.isPublished ? "green" : "slate"}>{ec.isPublished ? "Published" : "Draft"}</Badge>
                  </Td>
                  <Td>{ec.certificates.length}</Td>
                  {canPublishCertificates && (
                    <Td className="text-right">
                      <form action={ec.isPublished ? unpublishEventCertificate : publishEventCertificate}>
                        <input type="hidden" name="id" value={ec.id} />
                        <button type="submit" className="text-sm text-slate-600 hover:underline">
                          {ec.isPublished ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {canPublishCertificates && (
          <div className="mt-3">
            <AllotCertificateForm fixedEventId={event.id} options={candidateCertificateTemplates.map((t) => ({ id: t.id, label: t.title }))} />
          </div>
        )}
      </Card>

      {event.requiresAssessment && canSeePin && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Trainee login PIN</h2>
          {isSuperAdmin ? (
            <SetEventPinForm
              eventId={event.id}
              currentPin={event.eventPinEncrypted ? decryptPin(event.eventPinEncrypted) : null}
            />
          ) : (
            <p className="text-sm text-slate-600">
              Event PIN:{" "}
              <span className="font-mono font-semibold text-slate-900">
                {event.eventPinEncrypted ? decryptPin(event.eventPinEncrypted) : "Not set — ask Super Admin to set one."}
              </span>
            </p>
          )}
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Participants</h2>
          <div className="flex gap-2">
            <a href={`/api/export/attendance?eventId=${event.id}&format=csv`}>
              <Button variant="ghost">Export CSV</Button>
            </a>
            <a href={`/api/export/attendance?eventId=${event.id}&format=xlsx`}>
              <Button variant="ghost">Export Excel</Button>
            </a>
            {canMarkAttendance && (
              <Link href={`/dashboard/attendance/${event.id}/scan`}>
                <Button variant="secondary">Scan attendance</Button>
              </Link>
            )}
            {canRegister && (
              <>
                <Link href={`/dashboard/participants/bulk-import?eventId=${event.id}`}>
                  <Button variant="secondary">Bulk import</Button>
                </Link>
                <Link href={`/dashboard/participants/new?eventId=${event.id}`}>
                  <Button variant="secondary">Register participant</Button>
                </Link>
              </>
            )}
          </div>
        </div>
        {canSeePin && (
          <p className="mb-2 text-xs text-slate-500">
            {event.requiresAssessment
              ? "Participants log in at the trainee link above using their mobile number and the event PIN shown above."
              : "Feedback only — PIN not required for trainee login on this event."}
          </p>
        )}
        {event.participants.length === 0 ? (
          <p className="text-sm text-slate-500">No participants registered yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Aadhaar</Th>
                <Th>Mobile</Th>
                <Th>Status</Th>
                <Th>Check-in</Th>
                <Th>Check-out</Th>
              </tr>
            </thead>
            <tbody>
              {event.participants.map((p) => {
                const att = p.attendances[0];
                return (
                  <tr key={p.id}>
                    <Td>
                      <Link href={`/dashboard/participants/${p.id}`} className="font-medium text-slate-900 hover:underline">
                        {p.name}
                      </Link>
                    </Td>
                    <Td>{maskAadhaar(p.aadhaarLast4)}</Td>
                    <Td>{p.mobile}</Td>
                    <Td>
                      <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                    </Td>
                    <Td>{att?.checkInAt ? att.checkInAt.toLocaleString() : "—"}</Td>
                    <Td>{att?.checkOutAt ? att.checkOutAt.toLocaleString() : "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
