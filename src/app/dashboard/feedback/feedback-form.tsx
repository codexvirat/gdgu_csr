"use client";

import { useActionState } from "react";
import { createFeedbackForm } from "./actions";
import { FeedbackQuestionBuilder } from "./feedback-question-builder";
import { Button, Field, FormError, Input, Select } from "@/components/ui";

export function FeedbackForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createFeedbackForm, undefined);

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
      <Field label="Feedback form title" htmlFor="title">
        <Input id="title" name="title" required placeholder="e.g. Post-training feedback" />
      </Field>
      <Field label="Trade / category (optional)" htmlFor="tradeCategory">
        <Input id="tradeCategory" name="tradeCategory" />
      </Field>
      <Field label="Questions" htmlFor="questionsJson">
        <FeedbackQuestionBuilder />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create feedback form"}
      </Button>
    </form>
  );
}
