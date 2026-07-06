"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function CopyLinkButton({ link, label = "Copy trainee link" }: { link: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied!" : label}
    </Button>
  );
}
