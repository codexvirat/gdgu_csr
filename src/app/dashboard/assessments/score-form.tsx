"use client";

import { useActionState, useMemo, useState } from "react";
import { recordOnlineResult, recordOfflineResult } from "./actions";
import { Button, Field, FormError, Input, Select } from "@/components/ui";

type ParticipantOption = { id: string; name: string; eventId: string | null };
type QuestionOption = { id: string; questionText: string; options: string[] };

export function ScoreForm({
  assessmentId,
  participants,
  questions,
  passMark,
  totalMarks,
}: {
  assessmentId: string;
  participants: ParticipantOption[];
  questions: QuestionOption[];
  passMark: number;
  totalMarks: number;
}) {
  const [mode, setMode] = useState<"online" | "offline">(questions.length > 0 ? "online" : "offline");
  const [participantId, setParticipantId] = useState(participants[0]?.id ?? "");
  const eventId = useMemo(() => participants.find((p) => p.id === participantId)?.eventId ?? "", [participants, participantId]);

  const [onlineState, onlineAction, onlinePending] = useActionState(recordOnlineResult, undefined);
  const [offlineState, offlineAction, offlinePending] = useActionState(recordOfflineResult, undefined);

  if (participants.length === 0) {
    return <p className="text-sm text-slate-500">No participants registered under this project yet.</p>;
  }

  const participantSelect = (
    <Field label="Participant" htmlFor="participantId">
      <Select id="participantId" value={participantId} onChange={(e) => setParticipantId(e.target.value)} className="w-64">
        {participants.map((p) => (
          <option key={p.id} value={p.id} disabled={!p.eventId}>
            {p.name}
            {!p.eventId ? " (no event assigned)" : ""}
          </option>
        ))}
      </Select>
    </Field>
  );

  const modeToggle = (
    <div className="flex gap-2 text-sm">
      <button type="button" onClick={() => setMode("online")} className={mode === "online" ? "font-semibold text-slate-900" : "text-slate-500"}>
        Online (in-app)
      </button>
      <span className="text-slate-300">|</span>
      <button type="button" onClick={() => setMode("offline")} className={mode === "offline" ? "font-semibold text-slate-900" : "text-slate-500"}>
        Offline (paper, manual entry)
      </button>
    </div>
  );

  if (mode === "online") {
    return (
      <form action={onlineAction} className="space-y-3">
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <input type="hidden" name="participantId" value={participantId} />
        <input type="hidden" name="eventId" value={eventId} />
        <div className="flex items-end justify-between">
          {participantSelect}
          {modeToggle}
        </div>
        {questions.length === 0 ? (
          <p className="text-sm text-slate-500">This assessment has no questions yet — use offline entry instead.</p>
        ) : (
          <div className="space-y-3">
            {questions.map((q, qi) => (
              <div key={q.id} className="rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-sm font-medium text-slate-800">
                  {qi + 1}. {q.questionText}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name={`answer_${q.id}`} value={String(oi)} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <FormError message={onlineState?.error} />
        <Button type="submit" disabled={onlinePending || questions.length === 0}>
          {onlinePending ? "Submitting…" : "Submit & auto-score"}
        </Button>
      </form>
    );
  }

  return (
    <form action={offlineAction} className="space-y-3">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="participantId" value={participantId} />
      <input type="hidden" name="eventId" value={eventId} />
      <div className="flex items-end justify-between">
        {participantSelect}
        {modeToggle}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Total questions" htmlFor="totalQuestions">
          <Input id="totalQuestions" name="totalQuestions" type="number" min={0} required />
        </Field>
        <Field label="Attempted" htmlFor="attemptedCount">
          <Input id="attemptedCount" name="attemptedCount" type="number" min={0} required />
        </Field>
        <Field label="Correct" htmlFor="correctCount">
          <Input id="correctCount" name="correctCount" type="number" min={0} required />
        </Field>
      </div>
      <Field label={`Score (out of ${totalMarks}, pass at ${passMark})`} htmlFor="score">
        <Input id="score" name="score" type="number" min={0} max={totalMarks} required className="w-40" />
      </Field>
      <FormError message={offlineState?.error} />
      <Button type="submit" disabled={offlinePending}>
        {offlinePending ? "Saving…" : "Save result"}
      </Button>
    </form>
  );
}
