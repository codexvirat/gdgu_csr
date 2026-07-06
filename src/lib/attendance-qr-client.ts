/** Client-safe helpers for the scan UI. No secret material here — the server re-validates
 * the checksum (see lib/qrcode.ts) before any attendance record is accepted at sync time. */

export function buildManualAttendanceValue(participantId: string, eventId: string) {
  return `${participantId}.${eventId}.manual`;
}

export function splitQrValue(value: string): { participantId: string; eventId: string } | null {
  const parts = value.trim().split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1]) return null;
  return { participantId: parts[0], eventId: parts[1] };
}
