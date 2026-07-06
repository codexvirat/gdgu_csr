import Link from "next/link";
import { requireUser, companyScope, type SessionPayload } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, isGlobalRole } from "@/lib/permissions";
import { isEventBehindTarget } from "@/lib/event-status";
import {
  Badge,
  Button,
  Card,
  DistributionBar,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui";

type Tone = "slate" | "green" | "amber" | "red" | "blue";

const EVENT_STATUS_TONE: Record<string, Tone> = {
  SCHEDULED: "slate",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  CANCELLED: "red",
};

const PROJECT_STATUS_TONE: Record<string, Tone> = {
  DRAFT: "slate",
  ACTIVE: "green",
  ON_HOLD: "amber",
  COMPLETED: "blue",
  CANCELLED: "red",
};

const ACTION_LABEL: Record<string, string> = {
  CREATE: "created",
  UPDATE: "updated",
  DELETE: "deleted",
  STATUS_CHANGE: "changed the status of",
  CREATE_VOLUNTEER: "added a volunteer to",
  REGENERATE_PIN: "regenerated the PIN for",
  BULK_IMPORT: "bulk-imported",
  UNMASK_AADHAAR: "unmasked Aadhaar on",
  SELF_SUBMIT: "self-submitted",
};

function splitCamel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export default async function DashboardHome() {
  const session = await requireUser();

  if (session.role === "CLIENT") {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-600">
          The client reporting portal is planned for a later phase. Reach out to your project contact for status updates in the meantime.
        </p>
      </Card>
    );
  }

  if (session.role === "TRAINER") {
    return <TrainerDashboard session={session} />;
  }

  if (session.role === "VOLUNTEER") {
    return <VolunteerDashboard session={session} />;
  }

  if (session.role === "PA") {
    return <PaDashboard session={session} />;
  }

  return <OrgDashboard session={session} />;
}

async function OrgDashboard({ session }: { session: SessionPayload }) {
  const scope = companyScope(session);
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const showActivity = isGlobalRole(session.role);
  const showTrainerBoard = can(session.role, "assignTrainersManagers");

  const [
    projects,
    registeredCount,
    trainedCount,
    certifiedCount,
    droppedCount,
    upcomingOrOngoingEvents,
    eventsThisWeek,
    activeTrainersCount,
    recentParticipantsScheduled,
    recentCheckIns,
  ] = await Promise.all([
    db.project.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, targetCount: true, status: true, _count: { select: { participants: true } } },
    }),
    db.participant.count({ where: { project: scope, status: "REGISTERED" } }),
    db.participant.count({ where: { project: scope, status: "TRAINED" } }),
    db.participant.count({ where: { project: scope, status: "CERTIFIED" } }),
    db.participant.count({ where: { project: scope, status: "DROPPED" } }),
    db.event.count({ where: { project: scope, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } }),
    db.event.count({ where: { project: scope, eventDateStart: { gte: now, lte: weekFromNow } } }),
    db.trainer.count({ where: { ...scope, status: "ACTIVE" } }),
    db.participant.count({ where: { project: scope, event: { eventDateStart: { gte: thirtyDaysAgo, lte: now } } } }),
    db.attendance.count({ where: { checkInAt: { not: null }, event: { project: scope, eventDateStart: { gte: thirtyDaysAgo, lte: now } } } }),
  ]);

  let upcomingEvents = await db.event.findMany({
    where: { project: scope, eventDateStart: { gte: now } },
    orderBy: { eventDateStart: "asc" },
    take: 6,
    include: { project: true, projectCity: true, _count: { select: { participants: true } } },
  });
  let eventsAreUpcoming = true;
  if (upcomingEvents.length === 0) {
    upcomingEvents = await db.event.findMany({
      where: { project: scope },
      orderBy: { eventDateStart: "desc" },
      take: 6,
      include: { project: true, projectCity: true, _count: { select: { participants: true } } },
    });
    eventsAreUpcoming = false;
  }

  const [recentActivity, trainersWithRatings] = await Promise.all([
    showActivity
      ? db.auditLog.findMany({
          where: isGlobalRole(session.role) ? (session.viewCompanyId ? { user: { companyId: session.viewCompanyId } } : {}) : { user: { companyId: session.companyId } },
          orderBy: { timestamp: "desc" },
          take: 8,
          include: { user: { select: { name: true } } },
        })
      : Promise.resolve([]),
    showTrainerBoard ? db.trainer.findMany({ where: scope, include: { ratings: true } }) : Promise.resolve([]),
  ]);

  const participantsTotal = registeredCount + trainedCount + certifiedCount + droppedCount;
  const targetTotal = projects.reduce((sum, p) => sum + p.targetCount, 0);
  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const trainedOrCertified = trainedCount + certifiedCount;
  const attendanceRate = recentParticipantsScheduled > 0 ? Math.round((recentCheckIns / recentParticipantsScheduled) * 100) : null;

  const topTrainers = trainersWithRatings
    .filter((t) => t.ratings.length > 0)
    .map((t) => ({ id: t.id, name: t.name, avgRating: t.ratings.reduce((s, r) => s + r.rating, 0) / t.ratings.length, count: t.ratings.length }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${session.name}`} description="Here's how your training programs are tracking today." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Active projects" value={activeProjects} hint={`${projects.length} total`} />
        <StatCard label="Participants registered" value={participantsTotal} hint={`target ${targetTotal}`} />
        <StatCard
          label="Trained / certified"
          value={trainedOrCertified}
          hint={`${participantsTotal ? Math.round((trainedOrCertified / participantsTotal) * 100) : 0}% of registered`}
        />
        <StatCard label="Upcoming / ongoing events" value={upcomingOrOngoingEvents} hint={`${eventsThisWeek} in the next 7 days`} />
        <StatCard label="Attendance rate (30d)" value={attendanceRate === null ? "—" : `${attendanceRate}%`} hint={`${recentCheckIns}/${recentParticipantsScheduled} checked in`} />
        <StatCard label="Active trainers" value={activeTrainersCount} hint="available for assignment" />
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          {can(session.role, "manageProjects") && (
            <Link href="/dashboard/projects/new">
              <Button variant="secondary">New project</Button>
            </Link>
          )}
          {can(session.role, "manageEvents") && (
            <Link href="/dashboard/events/new">
              <Button variant="secondary">New event</Button>
            </Link>
          )}
          {can(session.role, "registerParticipants") && (
            <Link href="/dashboard/participants/new">
              <Button variant="secondary">Register participant</Button>
            </Link>
          )}
          {can(session.role, "markAttendance") && (
            <Link href="/dashboard/attendance">
              <Button variant="secondary">Mark attendance</Button>
            </Link>
          )}
          {can(session.role, "manageAssessments") && (
            <Link href="/dashboard/assessments/new">
              <Button variant="secondary">New assessment</Button>
            </Link>
          )}
          {can(session.role, "manageClients") && (
            <Link href="/dashboard/clients/new">
              <Button variant="secondary">Add client</Button>
            </Link>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Project progress</h2>
              <Link href="/dashboard/projects" className="text-sm text-slate-500 hover:text-slate-900">
                View all
              </Link>
            </div>
            {projects.length === 0 ? (
              <p className="text-sm text-slate-500">No projects yet.</p>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 6).map((p) => {
                  const pct = p.targetCount > 0 ? Math.round((p._count.participants / p.targetCount) * 100) : 0;
                  return (
                    <div key={p.id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <Link href={`/dashboard/projects/${p.id}`} className="font-medium text-slate-800 hover:underline">
                          {p.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          <Badge tone={PROJECT_STATUS_TONE[p.status]}>{p.status}</Badge>
                          <span className="text-slate-500">
                            {p._count.participants} / {p.targetCount} ({pct}%)
                          </span>
                        </div>
                      </div>
                      <ProgressBar value={pct} />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{eventsAreUpcoming ? "Upcoming events" : "Recent events"}</h2>
              <Link href="/dashboard/events" className="text-sm text-slate-500 hover:text-slate-900">
                View all
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No events scheduled yet.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Event</Th>
                    <Th>City</Th>
                    <Th>Dates</Th>
                    <Th>Status</Th>
                    <Th>Headcount</Th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingEvents.map((e) => {
                    const behind = isEventBehindTarget(e, e._count.participants);
                    return (
                      <tr key={e.id}>
                        <Td>
                          <Link href={`/dashboard/events/${e.id}`} className="font-medium text-slate-900 hover:underline">
                            {e.name}
                          </Link>
                          <div className="text-xs text-slate-500">{e.project.name}</div>
                        </Td>
                        <Td>{e.projectCity.city}</Td>
                        <Td>
                          {e.eventDateStart.toLocaleDateString()} – {e.eventDateEnd.toLocaleDateString()}
                        </Td>
                        <Td className="space-x-1">
                          <Badge tone={EVENT_STATUS_TONE[e.status]}>{e.status}</Badge>
                          {behind && <Badge tone="red">Behind target</Badge>}
                        </Td>
                        <Td>
                          {e._count.participants} / {e.targetCount}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Participant funnel</h2>
            {participantsTotal === 0 ? (
              <p className="text-sm text-slate-500">No participants registered yet.</p>
            ) : (
              <DistributionBar
                segments={[
                  { label: "Registered", value: registeredCount, tone: "slate" },
                  { label: "Trained", value: trainedCount, tone: "blue" },
                  { label: "Certified", value: certifiedCount, tone: "green" },
                  { label: "Dropped", value: droppedCount, tone: "red" },
                ]}
              />
            )}
          </Card>

          {showTrainerBoard && (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Top rated trainers</h2>
                <Link href="/dashboard/trainers" className="text-sm text-slate-500 hover:text-slate-900">
                  View all
                </Link>
              </div>
              {topTrainers.length === 0 ? (
                <p className="text-sm text-slate-500">No ratings recorded yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {topTrainers.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-sm">
                      <Link href={`/dashboard/trainers/${t.id}`} className="font-medium text-slate-800 hover:underline">
                        {t.name}
                      </Link>
                      <span className="text-slate-500">
                        ★ {t.avgRating.toFixed(1)} <span className="text-xs">({t.count})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {showActivity && (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent activity</h2>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500">No activity recorded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recentActivity.map((log) => (
                    <li key={log.id} className="text-sm">
                      <p className="text-slate-800">
                        <span className="font-medium">{log.user?.name ?? "System"}</span> {ACTION_LABEL[log.action] ?? log.action.toLowerCase().replace(/_/g, " ")}{" "}
                        <span className="font-medium">{splitCamel(log.entityType)}</span>
                      </p>
                      <p className="text-xs text-slate-500">{log.timestamp.toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

async function TrainerDashboard({ session }: { session: SessionPayload }) {
  const trainer = await db.trainer.findUnique({ where: { userId: session.sub }, select: { id: true, name: true } });

  if (!trainer) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-600">Your login isn&apos;t linked to a trainer profile yet. Ask an Admin/Ops Manager to link it under Trainers.</p>
      </Card>
    );
  }

  const now = new Date();

  const [assignments, ratingAgg, recentFeedback, assignedParticipants, certifiedParticipants] = await Promise.all([
    db.eventTrainer.findMany({
      where: { trainerId: trainer.id },
      include: { event: { include: { project: true, projectCity: true, venue: true, _count: { select: { participants: true } } } } },
      orderBy: { event: { eventDateStart: "asc" } },
    }),
    db.trainerRating.aggregate({ where: { trainerId: trainer.id }, _avg: { rating: true }, _count: { rating: true } }),
    db.trainerRating.findMany({ where: { trainerId: trainer.id }, orderBy: { createdAt: "desc" }, take: 5, include: { event: { select: { name: true } } } }),
    db.participant.count({ where: { trainerId: trainer.id } }),
    db.participant.count({ where: { trainerId: trainer.id, status: "CERTIFIED" } }),
  ]);

  const upcoming = assignments.filter((a) => a.event.eventDateEnd >= now && a.event.status !== "CANCELLED");
  const avgRating = ratingAgg._avg.rating;

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${trainer.name}`} description="Your upcoming sessions, ratings, and trained participants." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Upcoming sessions" value={upcoming.length} hint={`${assignments.length} total assignments`} />
        <StatCard label="Average rating" value={avgRating === null ? "—" : avgRating.toFixed(1)} hint={`${ratingAgg._count.rating} ratings`} />
        <StatCard label="Participants assigned" value={assignedParticipants} hint={`${certifiedParticipants} certified`} />
        <StatCard
          label="Certification rate"
          value={assignedParticipants > 0 ? `${Math.round((certifiedParticipants / assignedParticipants) * 100)}%` : "—"}
          hint="of assigned participants"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Upcoming sessions</h2>
            <Link href="/dashboard/my-schedule" className="text-sm text-slate-500 hover:text-slate-900">
              Full schedule
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming sessions" description="New assignments will appear here." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>City</Th>
                  <Th>Venue</Th>
                  <Th>Dates</Th>
                  <Th>Status</Th>
                  <Th>Participants</Th>
                </tr>
              </thead>
              <tbody>
                {upcoming.slice(0, 6).map((a) => (
                  <tr key={a.id}>
                    <Td>
                      <Link href={`/dashboard/events/${a.event.id}`} className="font-medium text-slate-900 hover:underline">
                        {a.event.name}
                      </Link>
                      <div className="text-xs text-slate-500">{a.event.project.name}</div>
                    </Td>
                    <Td>{a.event.projectCity.city}</Td>
                    <Td>{a.event.venue?.name ?? "—"}</Td>
                    <Td>
                      {a.event.eventDateStart.toLocaleDateString()} – {a.event.eventDateEnd.toLocaleDateString()}
                    </Td>
                    <Td>
                      <Badge tone={EVENT_STATUS_TONE[a.event.status]}>{a.event.status}</Badge>
                    </Td>
                    <Td>{a.event._count.participants}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent feedback</h2>
          {recentFeedback.length === 0 ? (
            <p className="text-sm text-slate-500">No feedback recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentFeedback.map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{r.event.name}</span>
                    <span className="text-amber-600">★ {r.rating}</span>
                  </div>
                  {r.feedbackText && <p className="mt-0.5 text-xs text-slate-500">{r.feedbackText}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

async function PaDashboard({ session }: { session: SessionPayload }) {
  const now = new Date();

  const assignments = await db.eventPA.findMany({
    where: { userId: session.sub },
    include: { event: { include: { project: true, projectCity: true, venue: true, _count: { select: { participants: true } } } } },
    orderBy: { event: { eventDateStart: "asc" } },
  });

  const upcoming = assignments.filter((a) => a.event.eventDateEnd >= now && a.event.status !== "CANCELLED");
  const assignedEventIds = assignments.map((a) => a.event.id);

  const [assignedParticipants, certifiedParticipants] = await Promise.all([
    db.participant.count({ where: { eventId: { in: assignedEventIds } } }),
    db.participant.count({ where: { eventId: { in: assignedEventIds }, status: "CERTIFIED" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${session.name}`} description="Your assigned events and participants." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Upcoming events" value={upcoming.length} hint={`${assignments.length} total assignments`} />
        <StatCard label="Participants assigned" value={assignedParticipants} hint={`${certifiedParticipants} certified`} />
        <StatCard
          label="Certification rate"
          value={assignedParticipants > 0 ? `${Math.round((certifiedParticipants / assignedParticipants) * 100)}%` : "—"}
          hint="of assigned participants"
        />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Upcoming events</h2>
          <Link href="/dashboard/my-schedule" className="text-sm text-slate-500 hover:text-slate-900">
            Full schedule
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState title="No upcoming events" description="New assignments will appear here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>City</Th>
                <Th>Venue</Th>
                <Th>Dates</Th>
                <Th>Status</Th>
                <Th>Participants</Th>
              </tr>
            </thead>
            <tbody>
              {upcoming.slice(0, 6).map((a) => (
                <tr key={a.id}>
                  <Td>
                    <Link href={`/dashboard/events/${a.event.id}`} className="font-medium text-slate-900 hover:underline">
                      {a.event.name}
                    </Link>
                    <div className="text-xs text-slate-500">{a.event.project.name}</div>
                  </Td>
                  <Td>{a.event.projectCity.city}</Td>
                  <Td>{a.event.venue?.name ?? "—"}</Td>
                  <Td>
                    {a.event.eventDateStart.toLocaleDateString()} – {a.event.eventDateEnd.toLocaleDateString()}
                  </Td>
                  <Td>
                    <Badge tone={EVENT_STATUS_TONE[a.event.status]}>{a.event.status}</Badge>
                  </Td>
                  <Td>{a.event._count.participants}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

async function VolunteerDashboard({ session }: { session: SessionPayload }) {
  if (!session.volunteerEventId) {
    return <EmptyState title="No event assigned yet" description="Ask your Ops Manager to assign you to an event." />;
  }

  const event = await db.event.findUnique({
    where: { id: session.volunteerEventId },
    include: { project: true, projectCity: true, venue: true, _count: { select: { participants: true } } },
  });

  if (!event) {
    return <EmptyState title="No event assigned yet" description="Ask your Ops Manager to assign you to an event." />;
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [checkedInTotal, checkedInToday] = await Promise.all([
    db.attendance.count({ where: { eventId: event.id, checkInAt: { not: null } } }),
    db.attendance.count({ where: { eventId: event.id, checkInAt: { gte: startOfToday } } }),
  ]);

  const behind = isEventBehindTarget(event, event._count.participants);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${session.name}`} description="Your assigned event at a glance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered" value={event._count.participants} hint={`target ${event.targetCount}`} />
        <StatCard label="Checked in" value={checkedInTotal} hint="all-time for this event" />
        <StatCard label="Checked in today" value={checkedInToday} hint={startOfToday.toLocaleDateString()} />
        <StatCard label="Status" value={<Badge tone={EVENT_STATUS_TONE[event.status]}>{event.status}</Badge>} hint={behind ? "Behind target" : undefined} />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{event.name}</h2>
          {behind && <Badge tone="red">Behind target</Badge>}
        </div>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Project</dt>
            <dd className="text-slate-800">{event.project.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">City</dt>
            <dd className="text-slate-800">{event.projectCity.city}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Venue</dt>
            <dd className="text-slate-800">{event.venue?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Dates</dt>
            <dd className="text-slate-800">
              {event.eventDateStart.toLocaleDateString()} – {event.eventDateEnd.toLocaleDateString()}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/dashboard/events/${event.id}`}>
            <Button variant="secondary">Open event</Button>
          </Link>
          <Link href={`/dashboard/attendance/${event.id}/scan`}>
            <Button>Scan attendance</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
