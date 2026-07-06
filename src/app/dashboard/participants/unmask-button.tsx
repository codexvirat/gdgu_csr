"use client";

import { useState } from "react";
import { unmaskAadhaarAction } from "./actions";
import { Button } from "@/components/ui";

export function UnmaskButton({ participantId, masked }: { participantId: string; masked: string }) {
  const [value, setValue] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (value) {
    return <span className="font-mono text-sm text-slate-900">{value}</span>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-sm text-slate-900">{masked}</span>
      <Button
        type="button"
        variant="ghost"
        className="px-2 py-1 text-xs"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const res = await unmaskAadhaarAction(participantId);
          if (res.value) setValue(res.value);
          setPending(false);
        }}
      >
        {pending ? "…" : "Unmask"}
      </Button>
    </span>
  );
}
