"use client";

import { useRef } from "react";
import { switchCompanyAction } from "@/app/dashboard/switch-company-action";

export function CompanySwitcher({ companies, selectedCompanyId }: { companies: { id: string; name: string }[]; selectedCompanyId: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={switchCompanyAction} className="flex items-center gap-2">
      <select
        name="companyId"
        defaultValue={selectedCompanyId ?? "ALL"}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      >
        <option value="ALL">All companies</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </form>
  );
}
