import crypto from "node:crypto";
import QRCode from "qrcode";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not configured");
  return value;
}

function checksum(participantId: string, eventId: string) {
  return crypto.createHmac("sha256", secret()).update(`${participantId}.${eventId}`).digest("hex").slice(0, 8);
}

/** Embeds a non-secret integrity checksum so a scanner can sanity-check the code's shape offline; the server re-verifies on sync. */
export function buildAttendanceQrValue(participantId: string, eventId: string) {
  return `${participantId}.${eventId}.${checksum(participantId, eventId)}`;
}

/** Sentinel used by the manual-entry fallback (no physical QR available). Authorization still comes from
 * the caller's session + the DB scope check at sync time, not from this checksum. */
const MANUAL_SENTINEL = "manual";

export function buildManualAttendanceValue(participantId: string, eventId: string) {
  return `${participantId}.${eventId}.${MANUAL_SENTINEL}`;
}

export function parseAttendanceQrValue(value: string): { participantId: string; eventId: string } | null {
  const parts = value.trim().split(".");
  if (parts.length !== 3) return null;
  const [participantId, eventId, sum] = parts;
  if (!participantId || !eventId) return null;
  if (sum !== MANUAL_SENTINEL && sum !== checksum(participantId, eventId)) return null;
  return { participantId, eventId };
}

export async function qrPngDataUrl(value: string) {
  return QRCode.toDataURL(value, { margin: 1, width: 220 });
}

export async function qrPngBuffer(value: string) {
  return QRCode.toBuffer(value, { margin: 1, width: 220, type: "png" });
}
