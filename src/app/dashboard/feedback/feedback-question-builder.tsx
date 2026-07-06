"use client";

import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";

export type DraftFeedbackQuestion = { id: number; text: string; type: "RATING" | "TEXT" };

function emptyQuestion(id: number): DraftFeedbackQuestion {
  return { id, text: "", type: "RATING" };
}

export function FeedbackQuestionBuilder({ initial }: { initial?: DraftFeedbackQuestion[] }) {
  const [questions, setQuestions] = useState<DraftFeedbackQuestion[]>(initial?.length ? initial : [emptyQuestion(0)]);
  const [nextId, setNextId] = useState(questions.length);

  function update(id: number, patch: Partial<DraftFeedbackQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="questionsJson" value={JSON.stringify(questions.map((q) => ({ text: q.text, type: q.type })))} />
      {questions.map((q, qi) => (
        <div key={q.id} className="flex items-end gap-2 rounded-md border border-slate-200 p-3">
          <div className="flex-1">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Question {qi + 1}</span>
            <Input placeholder="Question text" value={q.text} onChange={(e) => update(q.id, { text: e.target.value })} required />
          </div>
          <Select value={q.type} onChange={(e) => update(q.id, { type: e.target.value as "RATING" | "TEXT" })} className="w-36">
            <option value="RATING">Rating (1–5)</option>
            <option value="TEXT">Text answer</option>
          </Select>
          <Button
            type="button"
            variant="ghost"
            className="px-2 py-1 text-xs"
            onClick={() => setQuestions((qs) => (qs.length > 1 ? qs.filter((x) => x.id !== q.id) : qs))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setQuestions((qs) => [...qs, emptyQuestion(nextId)]);
          setNextId((n) => n + 1);
        }}
      >
        Add question
      </Button>
    </div>
  );
}
