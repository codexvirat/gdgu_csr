"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

export type DraftQuestion = { id: number; text: string; options: string[]; correctIndex: number };

function emptyQuestion(id: number): DraftQuestion {
  return { id, text: "", options: ["", "", "", ""], correctIndex: 0 };
}

export function QuestionBuilder({ initial }: { initial?: DraftQuestion[] }) {
  const [questions, setQuestions] = useState<DraftQuestion[]>(initial?.length ? initial : [emptyQuestion(0)]);
  const [nextId, setNextId] = useState(questions.length);

  function update(id: number, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }
  function updateOption(id: number, idx: number, value: string) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, options: q.options.map((o, i) => (i === idx ? value : o)) } : q)));
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="questionsJson" value={JSON.stringify(questions)} />
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-md border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Question {qi + 1}</span>
            <Button
              type="button"
              variant="ghost"
              className="px-2 py-1 text-xs"
              onClick={() => setQuestions((qs) => (qs.length > 1 ? qs.filter((x) => x.id !== q.id) : qs))}
            >
              Remove
            </Button>
          </div>
          <Input
            placeholder="Question text"
            value={q.text}
            onChange={(e) => update(q.id, { text: e.target.value })}
            className="mb-2"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((opt, oi) => (
              <label key={oi} className="flex items-center gap-2 text-sm">
                <input type="radio" checked={q.correctIndex === oi} onChange={() => update(q.id, { correctIndex: oi })} />
                <Input
                  placeholder={`Option ${oi + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(q.id, oi, e.target.value)}
                  required
                />
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">Select the radio button next to the correct option.</p>
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
