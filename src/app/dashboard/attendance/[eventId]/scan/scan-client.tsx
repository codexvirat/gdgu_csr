"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Select } from "@/components/ui";
import { enqueueAttendance, getQueue, syncAttendanceQueue } from "@/lib/offline-queue";
import { buildManualAttendanceValue, splitQrValue } from "@/lib/attendance-qr-client";

type RosterEntry = { id: string; name: string; mobile: string; checkInAt: string | null; checkOutAt: string | null };

const SCAN_DEBOUNCE_MS = 4000;

export function ScanClient({ eventId, roster: initialRoster }: { eventId: string; roster: RosterEntry[] }) {
  const [roster, setRoster] = useState(initialRoster);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "warn" | "error" } | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [manualId, setManualId] = useState(initialRoster[0]?.id ?? "");
  const [capture, setCapture] = useState<{ participant: RosterEntry; qrValue: string } | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const scannerStartTokenRef = useRef(0);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const captureVideoRef = useRef<HTMLVideoElement | null>(null);
  const captureStreamRef = useRef<MediaStream | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const refreshQueueCount = async () => setQueueCount((await getQueue()).length);

  useEffect(() => {
    void syncAttendanceQueue().then(refreshQueueCount);
    const onOnline = () => void syncAttendanceQueue().then(refreshQueueCount);
    window.addEventListener("online", onOnline);
    const interval = setInterval(() => void syncAttendanceQueue().then(refreshQueueCount), 15000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, []);

  function startQrScanner() {
    const token = ++scannerStartTokenRef.current;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (token !== scannerStartTokenRef.current) return;
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      scanner
        .start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (decodedText) => handleScan(decodedText), () => {})
        .catch(() => {
          setMessage({ text: "Could not access the camera. Use manual entry below instead.", tone: "error" });
          setScanning(false);
        });
    });
  }

  async function stopQrScanner() {
    scannerStartTokenRef.current++;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch {}
    }
  }

  useEffect(() => {
    if (!scanning) return;
    startQrScanner();
    return () => void stopQrScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  // Captures the check-in photo using its own camera stream, separate from the QR scanner above.
  useEffect(() => {
    if (!capture) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        captureStreamRef.current = stream;
        if (captureVideoRef.current) {
          captureVideoRef.current.srcObject = stream;
          void captureVideoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        setMessage({ text: "Could not access the camera for the check-in photo.", tone: "error" });
        setCapture(null);
      });
    return () => {
      cancelled = true;
      captureStreamRef.current?.getTracks().forEach((t) => t.stop());
      captureStreamRef.current = null;
    };
  }, [capture]);

  function handleScan(decodedText: string) {
    if (capture) return;

    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.code === decodedText && now - lastScanRef.current.at < SCAN_DEBOUNCE_MS) {
      return;
    }
    lastScanRef.current = { code: decodedText, at: now };

    const parsed = splitQrValue(decodedText);
    if (!parsed) {
      setMessage({ text: "Unrecognized code.", tone: "error" });
      return;
    }
    if (parsed.eventId !== eventId) {
      setMessage({ text: "This QR code belongs to a different event.", tone: "error" });
      return;
    }
    const participant = roster.find((p) => p.id === parsed.participantId);
    if (!participant) {
      setMessage({ text: "Participant not found in this event's roster.", tone: "error" });
      return;
    }

    const type = !participant.checkInAt ? "in" : !participant.checkOutAt ? "out" : null;
    if (!type) {
      setMessage({ text: `${participant.name} has already been checked in and out.`, tone: "warn" });
      return;
    }
    if (type === "out") {
      void record(participant, "out", decodedText);
      return;
    }
    void openCapture(participant, decodedText);
  }

  async function openCapture(participant: RosterEntry, qrValue: string) {
    if (scanning) await stopQrScanner();
    setCapturedPhoto(null);
    setCapture({ participant, qrValue });
  }

  function closeCapture() {
    setCapture(null);
    setCapturedPhoto(null);
    if (scanning) startQrScanner();
  }

  function takeSnapshot() {
    const video = captureVideoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.7));
  }

  async function confirmCheckIn() {
    if (!capture || !capturedPhoto) return;
    await record(capture.participant, "in", capture.qrValue, capturedPhoto);
    closeCapture();
  }

  async function record(participant: RosterEntry, type: "in" | "out", qrValue: string, photoBase64?: string) {
    const timestamp = new Date().toISOString();
    await enqueueAttendance({
      clientUuid: crypto.randomUUID(),
      participantId: participant.id,
      eventId,
      type,
      qrValue,
      timestamp,
      photoBase64,
    });

    setRoster((prev) =>
      prev.map((p) => (p.id === participant.id ? { ...p, [type === "in" ? "checkInAt" : "checkOutAt"]: timestamp } : p))
    );

    const result = await syncAttendanceQueue();
    await refreshQueueCount();

    setMessage(
      result.remaining > 0
        ? { text: `${participant.name} — queued offline, will sync automatically.`, tone: "warn" }
        : { text: `${participant.name} — checked ${type === "in" ? "in" : "out"}.`, tone: "ok" }
    );
  }

  const manualParticipant = roster.find((p) => p.id === manualId);

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={
            "rounded-md px-3 py-2 text-sm " +
            (message.tone === "ok" ? "bg-emerald-50 text-emerald-700" : message.tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700")
          }
        >
          {message.text}
        </div>
      )}

      {capture && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Check-in photo — {capture.participant.name}</h2>
          {!capturedPhoto ? (
            <>
              <video ref={captureVideoRef} className="mx-auto w-full max-w-sm rounded-md bg-slate-900" autoPlay muted playsInline />
              <div className="mt-3 flex justify-center gap-2">
                <Button type="button" onClick={takeSnapshot}>
                  Capture
                </Button>
                <Button type="button" variant="ghost" onClick={closeCapture}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedPhoto} alt="Captured check-in photo" className="mx-auto w-full max-w-sm rounded-md" />
              <div className="mt-3 flex justify-center gap-2">
                <Button type="button" onClick={() => void confirmCheckIn()}>
                  Confirm check-in
                </Button>
                <Button type="button" variant="secondary" onClick={() => setCapturedPhoto(null)}>
                  Retake
                </Button>
                <Button type="button" variant="ghost" onClick={closeCapture}>
                  Cancel
                </Button>
              </div>
            </>
          )}
          <canvas ref={captureCanvasRef} className="hidden" />
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Camera scan</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {queueCount > 0 && <span>{queueCount} pending sync</span>}
            <Button type="button" variant="secondary" disabled={!!capture} onClick={() => setScanning((s) => !s)}>
              {scanning ? "Stop camera" : "Start camera"}
            </Button>
          </div>
        </div>
        {scanning && !capture && <div id="qr-reader" className="mx-auto max-w-sm" />}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Manual entry</h2>
        <div className="flex flex-wrap items-end gap-2">
          <Select value={manualId} onChange={(e) => setManualId(e.target.value)} className="max-w-xs">
            {roster.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.mobile}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            disabled={!manualParticipant || !!capture}
            onClick={() => manualParticipant && void openCapture(manualParticipant, buildManualAttendanceValue(manualParticipant.id, eventId))}
          >
            Check in
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!manualParticipant || !!capture}
            onClick={() => manualParticipant && record(manualParticipant, "out", buildManualAttendanceValue(manualParticipant.id, eventId))}
          >
            Check out
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Roster status</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {roster.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>{p.name}</span>
              <span className="text-xs text-slate-500">
                {p.checkInAt ? `In: ${new Date(p.checkInAt).toLocaleTimeString()}` : "Not checked in"}
                {p.checkOutAt ? ` · Out: ${new Date(p.checkOutAt).toLocaleTimeString()}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
