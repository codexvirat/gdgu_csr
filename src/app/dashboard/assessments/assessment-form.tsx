"use client";

import { useActionState } from "react";
import { createAssessment } from "./actions";
import { QuestionBuilder } from "./question-builder";
import { Button, Field, FormError, Input, Select } from "@/components/ui";

export function AssessmentForm({ projects }: { projects: { id: string; name: string; tradeCategory: string }[] }) {
  const [state, formAction, pending] = useActionState(createAssessment, undefined);

  return (
    <form action={formAction} className="max-w-3xl space-y-4">
      <Field label="Project" htmlFor="projectId">
        <Select id="projectId" name="projectId" required>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Assessment title" htmlFor="title">
        <Input id="title" name="title" required placeholder="e.g. Electrician Safety MCQ" />
      </Field>
      <Field label="Trade / category" htmlFor="tradeCategory">
        <Input id="tradeCategory" name="tradeCategory" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Total marks" htmlFor="totalMarks">
          <Input id="totalMarks" name="totalMarks" type="number" min={1} required />
        </Field>
        <Field label="Pass mark" htmlFor="passMark">
          <Input id="passMark" name="passMark" type="number" min={1} required />
        </Field>
      </div>
      <Field label="Questions" htmlFor="questionsJson">
        <QuestionBuilder />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create assessment"}
      </Button>
    </form>
  );
}
