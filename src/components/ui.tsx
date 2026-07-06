import { clsx } from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-slate-900 text-white hover:bg-slate-700",
        variant === "secondary" && "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-500",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100",
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={clsx("mb-1 block text-sm font-medium text-slate-700", className)} {...props} />;
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-16 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</th>;
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx("border-b border-slate-100 px-4 py-3 text-slate-700", className)}>{children}</td>;
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={clsx("h-full rounded-full", pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

const TONE_DOT: Record<string, string> = {
  slate: "bg-slate-400",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
};

export function DistributionBar({
  segments,
}: {
  segments: { label: string; value: number; tone: "slate" | "green" | "amber" | "red" | "blue" }[];
}) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((seg) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          if (pct <= 0) return null;
          return <div key={seg.label} className={clsx("h-full", TONE_DOT[seg.tone])} style={{ width: `${pct}%` }} />;
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={clsx("h-2 w-2 rounded-full", TONE_DOT[seg.tone])} />
            {seg.label} <span className="font-medium text-slate-900">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
