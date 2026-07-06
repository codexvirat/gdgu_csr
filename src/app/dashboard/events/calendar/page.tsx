import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, companyScope } from "@/lib/auth";
import { isEventScopedRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Button, Card, PageHeader } from "@/components/ui";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function EventsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await requireUser();
  if (isEventScopedRole(session.role)) redirect("/dashboard");
  const { year: yearParam, month: monthParam } = await searchParams;

  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth(); // 0-indexed

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();
  const startWeekday = firstOfMonth.getDay();

  const events = await db.event.findMany({
    where: {
      project: companyScope(session),
      eventDateStart: { lte: lastOfMonth },
      eventDateEnd: { gte: firstOfMonth },
    },
    include: { projectCity: true },
  });

  const byDay = new Map<number, typeof events>();
  for (const e of events) {
    const from = e.eventDateStart < firstOfMonth ? 1 : e.eventDateStart.getDate();
    const to = e.eventDateEnd > lastOfMonth ? daysInMonth : e.eventDateEnd.getDate();
    for (let d = from; d <= to; d++) {
      byDay.set(d, [...(byDay.get(d) ?? []), e]);
    }
  }

  const prev = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const next = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <PageHeader
        title={firstOfMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        description="Events across all projects and cities."
        actions={
          <div className="flex gap-2">
            <Link href={`/dashboard/events/calendar?year=${prev.year}&month=${prev.month}`}>
              <Button variant="secondary">Prev</Button>
            </Link>
            <Link href={`/dashboard/events/calendar?year=${next.year}&month=${next.month}`}>
              <Button variant="secondary">Next</Button>
            </Link>
            <Link href="/dashboard/events">
              <Button variant="ghost">List view</Button>
            </Link>
          </div>
        }
      />
      <Card className="p-4">
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-xs font-semibold uppercase text-slate-500">
              {w}
            </div>
          ))}
          {cells.map((day, i) => (
            <div key={i} className="min-h-24 rounded-md border border-slate-100 p-1.5 text-xs">
              {day && (
                <>
                  <p className="mb-1 font-medium text-slate-500">{day}</p>
                  <div className="space-y-1">
                    {(byDay.get(day) ?? []).map((e) => (
                      <Link
                        key={e.id}
                        href={`/dashboard/events/${e.id}`}
                        className="block truncate rounded bg-slate-900 px-1.5 py-0.5 text-white hover:bg-slate-700"
                        title={`${e.name} — ${e.projectCity.city}`}
                      >
                        {e.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
