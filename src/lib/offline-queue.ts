"use client";

import { get, set } from "idb-keyval";

const QUEUE_KEY = "attendance-queue";

export type QueuedAttendance = {
  clientUuid: string;
  participantId: string;
  eventId: string;
  type: "in" | "out";
  qrValue: string;
  timestamp: string;
  photoBase64?: string;
};

export async function enqueueAttendance(record: QueuedAttendance) {
  const queue = ((await get<QueuedAttendance[]>(QUEUE_KEY)) ?? []).filter((r) => r.clientUuid !== record.clientUuid);
  queue.push(record);
  await set(QUEUE_KEY, queue);
}

export async function getQueue(): Promise<QueuedAttendance[]> {
  return (await get<QueuedAttendance[]>(QUEUE_KEY)) ?? [];
}

export async function removeFromQueue(clientUuids: string[]) {
  const queue = (await get<QueuedAttendance[]>(QUEUE_KEY)) ?? [];
  await set(QUEUE_KEY, queue.filter((r) => !clientUuids.includes(r.clientUuid)));
}

/** Pushes whatever is queued to the server; entries the server accepts are removed locally. Safe to call repeatedly (e.g. on reconnect). */
export async function syncAttendanceQueue(): Promise<{ synced: number; remaining: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  try {
    const res = await fetch("/api/attendance/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: queue }),
    });
    if (!res.ok) return { synced: 0, remaining: queue.length };

    const { accepted } = (await res.json()) as { accepted: string[] };
    await removeFromQueue(accepted);
    return { synced: accepted.length, remaining: queue.length - accepted.length };
  } catch {
    return { synced: 0, remaining: queue.length };
  }
}
