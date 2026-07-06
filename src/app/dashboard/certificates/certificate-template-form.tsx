"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createCertificateTemplate } from "./actions";
import { Button, Field, FormError, Input, Select, Textarea } from "@/components/ui";

const LAYOUTS = [
  {
    value: "driiv",
    label: "DRIIV",
    description: "Double navy border, gold corners, info boxes & QR panel",
    thumbnail: (color: string) => (
      <svg viewBox="0 0 84 60" className="h-full w-full">
        <rect x="1" y="1" width="82" height="58" fill="white" stroke={color} strokeWidth="2.5" rx="0.5" />
        <rect x="3.5" y="3.5" width="77" height="53" fill="none" stroke={color} strokeWidth="0.5" />
        {/* Gold corners */}
        {([[1,1],[75,1],[1,53],[75,53]] as [number,number][]).map(([x,y],i)=>(
          <rect key={i} x={x} y={y} width="7" height="7" fill="#c8a529" />
        ))}
        {/* Logo bar */}
        <rect x="8" y="5" width="68" height="8" fill="#f1f5f9" rx="1" />
        {/* Divider */}
        <line x1="6" y1="14" x2="78" y2="14" stroke={color} strokeWidth="0.5" />
        {/* Title spaced */}
        <text x="42" y="22" textAnchor="middle" fontSize="5" fontWeight="bold" fill={color} letterSpacing="2">CERTIFICATE</text>
        {/* Gold OF COMPLETION */}
        <text x="42" y="28" textAnchor="middle" fontSize="3.5" fontWeight="bold" fill="#c8a529" letterSpacing="1">OF COMPLETION</text>
        {/* Name */}
        <text x="42" y="35" textAnchor="middle" fontSize="5.5" fontStyle="italic" fontFamily="serif" fill={color}>Participant Name</text>
        {/* Gold rule */}
        <line x1="20" y1="38" x2="64" y2="38" stroke="#c8a529" strokeWidth="0.5" />
        {/* Body text lines */}
        <rect x="14" y="40" width="56" height="1.5" fill="#cbd5e1" rx="0.5" />
        <rect x="20" y="43" width="44" height="1.5" fill="#cbd5e1" rx="0.5" />
        {/* Info boxes */}
        <rect x="5" y="47" width="18" height="8" fill="none" stroke="#c8a529" strokeWidth="0.7" />
        <rect x="25" y="47" width="18" height="8" fill="none" stroke="#c8a529" strokeWidth="0.7" />
        <rect x="45" y="47" width="18" height="8" fill="none" stroke="#c8a529" strokeWidth="0.7" />
        {/* QR box */}
        <rect x="65" y="47" width="14" height="8" fill="#f8f6e8" stroke="#c8a529" strokeWidth="0.7" />
        <rect x="65" y="47" width="14" height="3" fill={color} />
      </svg>
    ),
  },
  {
    value: "classic",
    label: "Classic",
    description: "Single formal border, bold title, signature left & QR right",
    thumbnail: (color: string) => (
      <svg viewBox="0 0 84 60" className="h-full w-full">
        <rect x="1" y="1" width="82" height="58" fill="white" stroke={color} strokeWidth="2" rx="0.5" />
        {/* Gold corner squares */}
        {([[1,1],[77,1],[1,53],[77,53]] as [number,number][]).map(([x,y],i)=>(
          <rect key={i} x={x} y={y} width="5" height="5" fill="#c8a529" />
        ))}
        {/* Logo bar */}
        <rect x="10" y="5" width="64" height="7" fill="#f1f5f9" rx="1" />
        {/* Divider */}
        <line x1="6" y1="13" x2="78" y2="13" stroke={color} strokeWidth="0.5" />
        {/* Title */}
        <text x="42" y="22" textAnchor="middle" fontSize="5" fontWeight="bold" fill={color}>CERTIFICATE OF COMPLETION</text>
        {/* Rule under title */}
        <line x1="22" y1="25" x2="62" y2="25" stroke={color} strokeWidth="0.8" />
        {/* Awarded to */}
        <text x="42" y="30" textAnchor="middle" fontSize="3.5" fontStyle="italic" fill="#6b7280">Awarded to</text>
        {/* Name */}
        <text x="42" y="37" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="serif" fill="#1e2040">Participant Name</text>
        {/* Gold rule */}
        <line x1="18" y1="40" x2="66" y2="40" stroke="#c8a529" strokeWidth="0.5" />
        {/* Body */}
        <rect x="14" y="42" width="56" height="1.5" fill="#cbd5e1" rx="0.5" />
        <rect x="20" y="45" width="44" height="1.5" fill="#cbd5e1" rx="0.5" />
        {/* Signature bottom-left */}
        <line x1="6" y1="53" x2="26" y2="53" stroke="#9ca3af" strokeWidth="0.7" />
        <rect x="8" y="54.5" width="16" height="1.5" fill="#cbd5e1" rx="0.5" />
        {/* QR bottom-right */}
        <rect x="68" y="48" width="10" height="10" fill="#e5e7eb" />
      </svg>
    ),
  },
  {
    value: "banner",
    label: "Banner",
    description: "Colored header band with title in white, clean modern body",
    thumbnail: (color: string) => (
      <svg viewBox="0 0 84 60" className="h-full w-full">
        <rect x="0" y="0" width="84" height="60" fill="white" />
        {/* Top banner */}
        <rect x="0" y="0" width="84" height="18" fill={color} />
        {/* Gold separator */}
        <line x1="0" y1="18" x2="84" y2="18" stroke="#c8a529" strokeWidth="1.5" />
        {/* Bottom strip */}
        <rect x="0" y="58" width="84" height="2" fill={color} />
        {/* Logo placeholders in banner */}
        <rect x="20" y="2" width="12" height="7" fill="white" fillOpacity="0.3" rx="1" />
        <rect x="36" y="2" width="12" height="7" fill="white" fillOpacity="0.3" rx="1" />
        <rect x="52" y="2" width="12" height="7" fill="white" fillOpacity="0.3" rx="1" />
        {/* Title in banner */}
        <text x="42" y="15" textAnchor="middle" fontSize="4" fontWeight="bold" fill="white" letterSpacing="1">CERTIFICATE OF COMPLETION</text>
        {/* Cert no */}
        <text x="42" y="23" textAnchor="middle" fontSize="3" fill="#9ca3af">Certificate No: CSR-2026-000001</text>
        {/* This is to certify that */}
        <text x="42" y="28" textAnchor="middle" fontSize="3.5" fontStyle="italic" fill="#374151">This is to certify that</text>
        {/* Participant name */}
        <text x="42" y="37" textAnchor="middle" fontSize="7" fontWeight="bold" fontStyle="italic" fontFamily="serif" fill={color}>Participant Name</text>
        {/* Gold rule */}
        <line x1="18" y1="40" x2="66" y2="40" stroke="#c8a529" strokeWidth="0.5" />
        {/* Body */}
        <rect x="14" y="42" width="56" height="1.5" fill="#cbd5e1" rx="0.5" />
        <rect x="20" y="45" width="44" height="1.5" fill="#cbd5e1" rx="0.5" />
        {/* Divider */}
        <line x1="6" y1="49" x2="78" y2="49" stroke="#d1d5db" strokeWidth="0.5" />
        {/* Signature */}
        <line x1="16" y1="55" x2="40" y2="55" stroke="#9ca3af" strokeWidth="0.7" />
        <rect x="18" y="56.5" width="16" height="1.5" fill="#cbd5e1" rx="0.5" />
        {/* QR */}
        <rect x="68" y="50" width="10" height="8" fill="#e5e7eb" />
      </svg>
    ),
  },
  {
    value: "jsp",
    label: "JSP / GDGU",
    description: "Clean white cert with multi-logo header, NSDC colour stripes at base",
    thumbnail: (_color: string) => (
      <svg viewBox="0 0 84 60" className="h-full w-full">
        <rect x="0" y="0" width="84" height="60" fill="white" />
        <rect x="0" y="0" width="84" height="60" fill="none" stroke="#111" strokeWidth="2.5" />
        {/* Logo row */}
        <rect x="4" y="4" width="14" height="8" fill="#f5f5f5" rx="1" />
        <rect x="20" y="4" width="14" height="8" fill="#f5f5f5" rx="1" />
        <rect x="36" y="4" width="14" height="8" fill="#f5f5f5" rx="1" />
        <rect x="52" y="4" width="14" height="8" fill="#f5f5f5" rx="1" />
        <rect x="68" y="4" width="12" height="8" fill="#f5f5f5" rx="1" />
        {/* Separators */}
        <line x1="18.5" y1="4" x2="18.5" y2="12" stroke="#ccc" strokeWidth="0.7" />
        <line x1="34.5" y1="4" x2="34.5" y2="12" stroke="#ccc" strokeWidth="0.7" />
        <line x1="50.5" y1="4" x2="50.5" y2="12" stroke="#ccc" strokeWidth="0.7" />
        <line x1="66.5" y1="4" x2="66.5" y2="12" stroke="#ccc" strokeWidth="0.7" />
        {/* Cert no */}
        <rect x="4" y="15" width="30" height="2" fill="#cbd5e1" rx="0.5" />
        {/* Title */}
        <text x="42" y="24" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#111">CERTIFICATE OF PARTICIPATION</text>
        <text x="42" y="29" textAnchor="middle" fontSize="3" fill="#444">This is to certify that</text>
        {/* Name line */}
        <line x1="16" y1="34" x2="68" y2="34" stroke="#111" strokeWidth="1" />
        {/* Program name */}
        <text x="42" y="39" textAnchor="middle" fontSize="3" fill="#555">has successfully participated in the</text>
        <text x="42" y="44" textAnchor="middle" fontSize="4" fontWeight="bold" fill="#111">JSP Mason Training Program</text>
        {/* Meta */}
        <rect x="14" y="48" width="56" height="1.5" fill="#cbd5e1" rx="0.5" />
        {/* Bottom: QR + sig */}
        <rect x="4" y="51" width="12" height="5" fill="#e5e5e5" />
        <rect x="60" y="51" width="20" height="5" fill="#f1f5f9" rx="0.5" />
        {/* Colour stripes */}
        <rect x="0" y="57.5" width="84" height="0.7" fill="#f5821f" />
        <rect x="0" y="58.2" width="84" height="0.7" fill="#3aa64b" />
        <rect x="0" y="58.9" width="84" height="0.7" fill="#1a3fae" />
        <rect x="0" y="59.6" width="84" height="0.7" fill="#d81f26" />
      </svg>
    ),
  },
] as const;

export function CertificateTemplateForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createCertificateTemplate, undefined);
  const [selectedLayout, setSelectedLayout] = useState<string>("driiv");
  const [accentColor, setAccentColor] = useState("#1e3a8a");

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

      {/* Layout picker */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Certificate design</legend>
        <div className="grid grid-cols-3 gap-3">
          {LAYOUTS.map((layout) => {
            const active = selectedLayout === layout.value;
            return (
              <label
                key={layout.value}
                className={`flex cursor-pointer flex-col overflow-hidden rounded-lg border-2 transition-colors ${active ? "border-blue-600 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
              >
                <input
                  type="radio"
                  name="layout"
                  value={layout.value}
                  checked={active}
                  onChange={() => setSelectedLayout(layout.value)}
                  className="sr-only"
                />
                <div className="aspect-[842/595] w-full bg-slate-50 p-1">
                  {layout.thumbnail(accentColor)}
                </div>
                <div className="p-2">
                  <p className={`text-sm font-semibold ${active ? "text-blue-700" : "text-slate-800"}`}>{layout.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{layout.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field label="Certificate title" htmlFor="title">
        <Input id="title" name="title" required placeholder="e.g. Certificate of Completion" />
      </Field>
      <Field label="Trade / category (optional)" htmlFor="tradeCategory">
        <Input id="tradeCategory" name="tradeCategory" />
      </Field>
      <Field
        label="Body text"
        htmlFor="bodyText"
        hint="Use {{name}}, {{event}}, {{project}}, {{tradeCategory}} and {{date}} — they're filled in per participant when the certificate is issued."
      >
        <Textarea
          id="bodyText"
          name="bodyText"
          rows={3}
          placeholder='This is to certify that {{name}} has successfully completed training in {{tradeCategory}} under the "{{project}}" program at {{event}}, issued on {{date}}.'
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Signatory name" htmlFor="signatoryName">
          <Input id="signatoryName" name="signatoryName" required placeholder="e.g. Rohan Mehta" />
        </Field>
        <Field label="Signatory designation" htmlFor="signatoryTitle">
          <Input id="signatoryTitle" name="signatoryTitle" required placeholder="e.g. Programme Director" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Signature image (optional)" htmlFor="signatureImage">
          <Input id="signatureImage" name="signatureImage" type="file" accept="image/png,image/jpeg" />
        </Field>
        <Field label="Stamp / seal image (optional)" htmlFor="stampImage">
          <Input id="stampImage" name="stampImage" type="file" accept="image/png,image/jpeg" />
        </Field>
      </div>

      <Field label="Accent color" htmlFor="accentColor" hint="Used for the border, title, and name. Updates the design preview above.">
        <input
          id="accentColor"
          name="accentColor"
          type="color"
          value={accentColor}
          onChange={(e) => setAccentColor(e.target.value)}
          className="h-9 w-16 rounded-md border border-slate-300"
        />
      </Field>

      <Field label="Logos (optional, up to 5)" htmlFor="logo1" hint="Shown in a row across the top of the certificate.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <input key={i} name={`logo${i}`} type="file" accept="image/png,image/jpeg" className="text-xs" />
          ))}
        </div>
      </Field>

      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create certificate template"}
      </Button>
    </form>
  );
}
