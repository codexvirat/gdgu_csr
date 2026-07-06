/** Behind-target is derived, not stored, so it always reflects current attendance (PRD FR-2.4). */
export function isEventBehindTarget(event: { status: string; eventDateEnd: Date; targetCount: number }, achieved: number) {
  if (event.status === "COMPLETED" || event.status === "CANCELLED") return false;
  if (achieved >= event.targetCount) return false;
  return new Date() > event.eventDateEnd;
}
