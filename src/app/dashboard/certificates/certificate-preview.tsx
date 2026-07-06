import React from "react";
import type { CertificateTemplate } from "@/generated/prisma/client";

type PreviewTemplate = Pick<
  CertificateTemplate,
  "title" | "bodyText" | "logos" | "signatoryName" | "signatoryTitle" | "accentColor" | "signatureImage" | "stampImage" | "layout"
>;

type PreviewProps = {
  template: PreviewTemplate;
  participantName?: string;
  eventName?: string;
  certificateNumber?: string;
};

const SCALE = 0.84;
const W = 842;
const H = 595;
const GOLD = "#c8a529";

function fillBody(template: PreviewTemplate, participantName: string, eventName: string) {
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return template.bodyText
    .replace(/\{\{name\}\}/g, participantName)
    .replace(/\{\{event\}\}/g, eventName)
    .replace(/\{\{project\}\}/g, "Project")
    .replace(/\{\{tradeCategory\}\}/g, "Trade Category")
    .replace(/\{\{date\}\}/g, dateStr);
}

function parseLogos(template: PreviewTemplate): string[] {
  try {
    return JSON.parse(template.logos || "[]") as string[];
  } catch {
    return [];
  }
}

// ── DRIIV static logo paths (served from public/) ─────────────────────────────
const DRIIV_LOGOS = {
  stc:   "/logos/driiv/stc-logo.png",
  driiv: "/logos/driiv/driiv-logo.png",
  oppo:  "/logos/driiv/oppo-logo.jpg",
} as const;

function DriivLaurelSvg({ side, gold }: { side: "left" | "right"; gold: string }) {
  return (
    <svg
      viewBox="0 0 150 230"
      width="150"
      height="230"
      style={{
        position: "absolute",
        top: 340,
        ...(side === "left" ? { left: 0 } : { right: 0, transform: "scaleX(-1)" }),
        opacity: 0.9,
        zIndex: 1,
        display: "block",
      }}
    >
      <g stroke={gold} strokeWidth="2.5" fill="none">
        <path d="M60 220 C40 180 30 140 35 100 C40 60 55 25 70 5" />
        <g>
          <path d="M40 210 Q10 200 5 185 Q25 190 40 205" fill={gold} stroke="none" opacity="0.85" />
          <path d="M40 185 Q10 172 8 155 Q28 162 42 180" fill={gold} stroke="none" opacity="0.85" />
          <path d="M42 160 Q15 145 15 128 Q34 137 46 155" fill={gold} stroke="none" opacity="0.85" />
          <path d="M46 135 Q22 118 24 100 Q41 111 50 130" fill={gold} stroke="none" opacity="0.85" />
          <path d="M50 110 Q28 92 32 74 Q48 86 56 105" fill={gold} stroke="none" opacity="0.85" />
          <path d="M55 85 Q36 66 42 48 Q57 62 62 80" fill={gold} stroke="none" opacity="0.85" />
          <path d="M62 60 Q46 42 54 25 Q66 40 68 58" fill={gold} stroke="none" opacity="0.85" />
        </g>
      </g>
    </svg>
  );
}

// ── DRIIV layout ──────────────────────────────────────────────────────────────
function DriivPreview({ template, participantName, eventName, certificateNumber }: Required<PreviewProps>) {
  const navy = "#132a63";
  const navyDeep = "#0d1f4c";
  const gold = "#c8892c";
  const paper = "#fdfcf9";
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const sigLines = template.signatoryTitle.split("\n");
  const body = fillBody(template, participantName, eventName);

  return (
    <div style={{
      width: 1500,
      height: 1000,
      position: "relative",
      background: paper,
      fontFamily: "'EB Garamond', Georgia, serif",
      color: navy,
      overflow: "hidden",
      borderRadius: "26px 90px 26px 90px",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Great+Vibes&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap');`}</style>

      {/* Outer navy border */}
      <div style={{ position: "absolute", inset: 14, border: `6px solid ${navy}`, borderRadius: "18px 80px 18px 80px", pointerEvents: "none", zIndex: 10 }} />
      {/* Gold inner border */}
      <div style={{ position: "absolute", inset: 26, border: `2px solid ${gold}`, borderRadius: "14px 70px 14px 70px", pointerEvents: "none", zIndex: 10 }} />

      {/* Corner greek-key TL */}
      <div style={{
        position: "absolute", top: 16, left: 16, width: 120, height: 120,
        backgroundImage: `repeating-linear-gradient(0deg, ${gold} 0 3px, transparent 3px 14px), repeating-linear-gradient(90deg, ${gold} 0 3px, transparent 3px 14px)`,
        opacity: 0.55, zIndex: 2, clipPath: "polygon(0 0, 100% 0, 0 100%)",
      }} />
      {/* Corner greek-key BR */}
      <div style={{
        position: "absolute", bottom: 16, right: 16, width: 120, height: 120,
        backgroundImage: `repeating-linear-gradient(0deg, ${gold} 0 3px, transparent 3px 14px), repeating-linear-gradient(90deg, ${gold} 0 3px, transparent 3px 14px)`,
        opacity: 0.55, zIndex: 2, clipPath: "polygon(100% 100%, 0 100%, 100% 0)",
      }} />

      {/* Corner squares */}
      <div style={{ position: "absolute", top: 34, left: 34, width: 16, height: 16, border: `2px solid ${gold}`, zIndex: 3 }} />
      <div style={{ position: "absolute", top: 60, left: 60, width: 10, height: 10, border: `2px solid ${gold}`, zIndex: 3 }} />
      <div style={{ position: "absolute", bottom: 34, right: 34, width: 16, height: 16, border: `2px solid ${gold}`, zIndex: 3 }} />
      <div style={{ position: "absolute", bottom: 60, right: 60, width: 10, height: 10, border: `2px solid ${gold}`, zIndex: 3 }} />

      {/* Laurels */}
      <DriivLaurelSvg side="left" gold={gold} />
      <DriivLaurelSvg side="right" gold={gold} />

      {/* Content area */}
      <div style={{ position: "absolute", top: 60, left: 70, right: 70, bottom: 50, zIndex: 5, display: "flex", flexDirection: "column" }}>

        {/* Top section — 3 columns with vertical gold separators */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 0, height: 240 }}>

          {/* LEFT: STC logo above, text below (vertical stack) */}
          <div style={{ flex: "0 0 300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingRight: 24, gap: 7 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DRIIV_LOGOS.stc} alt="STC" style={{ height: 120, maxWidth: 160, objectFit: "contain" }} />
            <div style={{ textAlign: "center", fontSize: 17, fontWeight: 600, color: navy, lineHeight: 1.4 }}>
              <div>Office of the Principal Scientific Adviser</div>
              <div>to the Government of India</div>
            </div>
            <div style={{ width: "85%", height: 1.5, background: gold }} />
            <div style={{ fontSize: 20, color: gold, lineHeight: 1 }}>◆</div>
            <div style={{ fontSize: 16, color: navy, letterSpacing: "0.3px" }}>Science &amp; Technology Cluster</div>
          </div>

          {/* Vertical gold separator */}
          <div style={{ width: 2, background: gold, opacity: 0.8, flexShrink: 0 }} />

          {/* CENTER: cert no + DRIIV name & badge + italic */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: navy, letterSpacing: "0.5px" }}>
              Certificate No. :&nbsp;&nbsp;{certificateNumber}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 58, color: navy, letterSpacing: 2, lineHeight: 1 }}>DRIIV</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 7, color: navy }}>
                  (Delhi Research Implementation<br />and Innovation Initiative)
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DRIIV_LOGOS.driiv} alt="DRIIV" style={{ height: 130, width: 130, objectFit: "contain", flexShrink: 0 }} />
            </div>
            <div style={{ fontStyle: "italic", fontSize: 15, color: navy, textAlign: "center", lineHeight: 1.5 }}>
              An initiative under the Office of the Principal Scientific Adviser<br />to the Government of India
            </div>
          </div>

          {/* Vertical gold separator */}
          <div style={{ width: 2, background: gold, opacity: 0.8, flexShrink: 0 }} />

          {/* RIGHT: OPPO logo */}
          <div style={{ flex: "0 0 280px", display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DRIIV_LOGOS.oppo} alt="OPPO" style={{ maxHeight: 130, maxWidth: 260, objectFit: "contain" }} />
          </div>
        </div>

        {/* CERTIFICATE title */}
        <div style={{ textAlign: "center", marginTop: 26 }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 72, letterSpacing: 18, color: navy, lineHeight: 1 }}>
            CERTIFICATE
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 10 }}>
            <div style={{ height: 1.5, width: 180, background: gold }} />
            <div style={{ fontSize: 19, letterSpacing: 6, color: gold, fontWeight: 600 }}>OF COMPLETION</div>
            <div style={{ height: 1.5, width: 180, background: gold }} />
          </div>
        </div>

        {/* "This is to certify that" */}
        <div style={{ textAlign: "center", fontStyle: "italic", fontSize: 22, marginTop: 26, color: navy }}>
          This is to certify that
        </div>

        {/* Participant name */}
        <div style={{ textAlign: "center", fontFamily: "'Great Vibes', cursive", fontSize: 72, color: navyDeep, margin: "4px 0 0 0", lineHeight: 1.2 }}>
          {participantName}
        </div>

        {/* Name divider */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "10px auto 0" }}>
          <div style={{ height: 1.5, width: 220, background: gold }} />
          <div style={{ width: 9, height: 9, background: gold, transform: "rotate(45deg)", flexShrink: 0 }} />
        </div>

        {/* Body text */}
        <div style={{ textAlign: "center", fontSize: 18, lineHeight: 1.6, maxWidth: 920, margin: "20px auto 0", color: "#1c2f5e" }}>
          {body}
        </div>

        {/* Info row */}
        <div style={{ marginTop: "auto", display: "flex", gap: 28, alignItems: "stretch" }}>
          {[
            { label: "DURATION OF PROGRAM", value: "4 Days", icon: "📅" },
            { label: "LOCATION", value: eventName, icon: "📍" },
            { label: "DATE OF CERTIFICATION", value: dateStr, icon: "📅" },
          ].map((item) => (
            <div key={item.label} style={{ flex: 1, border: `1.5px solid ${gold}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
              <div style={{ width: 38, height: 38, border: `2px solid ${gold}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: gold, letterSpacing: "0.5px" }}>{item.label}</div>
                <div style={{ fontSize: 15, color: navy, marginTop: 2 }}>{item.value}</div>
              </div>
            </div>
          ))}
          <div style={{ flex: "0 0 230px" }} />
        </div>

        {/* Bottom row: signature + QR */}
        <div style={{ display: "flex", gap: 28, marginTop: 16, alignItems: "stretch" }}>
          <div style={{ flex: 1, border: `1.5px solid ${gold}`, borderRadius: 10, padding: "16px 24px 14px", textAlign: "center" }}>
            <div style={{ borderBottom: `1.5px solid ${navy}`, width: 280, margin: "0 auto 10px", height: 1 }} />
            <div style={{ fontWeight: 700, fontSize: 18, color: navy }}>{template.signatoryName}</div>
            {sigLines.map((line, i) => (
              <div key={i} style={{ fontSize: 15, color: navy, marginTop: 2 }}>{line}</div>
            ))}
          </div>

          <div style={{ flex: "0 0 230px", border: `1.5px solid ${gold}`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 700, color: navy, letterSpacing: "0.5px", marginBottom: 8 }}>
              <div style={{ width: 14, height: 14, background: gold, borderRadius: 3 }} />
              QR VERIFICATION
            </div>
            <div style={{ width: 100, height: 100, margin: "0 auto 8px", background: "#e5e5e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#aaa" }}>
              QR Code
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.4, color: navy }}>
              Scan the QR code to verify the authenticity of this certificate.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── JSP layout ───────────────────────────────────────────────────────────────
function JspPreview({ template, participantName, eventName, certificateNumber }: Required<PreviewProps>) {
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const sigLines = template.signatoryTitle.split("\n");
  const orange = "#f5821f";
  const green  = "#3aa64b";
  const blue   = "#1a3fae";
  const red    = "#d81f26";
  const panther = "#f0a11e";

  return (
    <div style={{ width: 1340, height: 750, position: "relative", background: "#fff", border: "5px solid #111", fontFamily: "'Poppins', Arial, sans-serif", color: "#111", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Inner content */}
      <div style={{ padding: "26px 40px 0 40px", height: "calc(100% - 22px)", display: "flex", flexDirection: "column" }}>

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>

          {/* Jindal Steel */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="42" viewBox="0 0 18 42">
              <path d="M2 40 C2 30 14 26 14 16 C14 8 6 4 4 2" stroke="#e8752c" strokeWidth="3" fill="none" />
            </svg>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, fontStyle: "italic", color: "#444", letterSpacing: "0.5px", lineHeight: 1 }}>
                JINDAL<span style={{ color: "#e8752c" }}>&apos;</span>
              </div>
              <div style={{ fontSize: 12, letterSpacing: 2, color: "#444", textAlign: "center", marginTop: 2 }}>STEEL</div>
            </div>
          </div>

          <div style={{ width: 1.5, height: 60, background: "#999", flexShrink: 0 }} />

          {/* Jindal Panther */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
              <polygon points="32,2 60,18 60,46 32,62 4,46 4,18" fill={panther} />
              <path d="M20 40 Q20 24 32 20 Q44 24 44 40 Q38 34 32 34 Q26 34 20 40 Z" fill="#111" />
              <circle cx="26" cy="28" r="2" fill={panther} />
              <circle cx="38" cy="28" r="2" fill={panther} />
            </svg>
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontSize: 17, fontWeight: 700, fontStyle: "italic", color: "#222" }}>JINDAL&apos;</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: "0.5px" }}>PANTHER<sup style={{ fontSize: 11 }}>®</sup></div>
            </div>
          </div>

          <div style={{ width: 1.5, height: 60, background: "#999", flexShrink: 0 }} />

          {/* NSDC */}
          <div style={{ textAlign: "center" }}>
            <svg width="110" height="34" viewBox="0 0 110 34">
              <circle cx="55" cy="7" r="5" fill={blue} />
              <path d="M22 30 L34 12 L40 22 L46 8" stroke={green} strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M50 30 L55 14 L60 30" stroke={blue} strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M68 30 L76 10 L84 22 L90 8" stroke={red} strokeWidth="4" fill="none" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, color: "#222" }}>N&nbsp;·&nbsp;S&nbsp;·&nbsp;D&nbsp;·&nbsp;C</div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: "#555", marginTop: 2 }}>RE ▶ IMAGINE FUTURE</div>
          </div>

          <div style={{ width: 1.5, height: 60, background: "#999", flexShrink: 0 }} />

          {/* GD Goenka */}
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#16305c" }}>
              <span style={{ color: "#c9a227" }}>GD</span> GOENKA UNIVERSITY
            </div>
            <div style={{ fontSize: 11.5, color: "#555", letterSpacing: "0.5px", marginTop: 2 }}>Thrive. For Life.</div>
          </div>

          <div style={{ width: 1.5, height: 60, background: "#999", flexShrink: 0 }} />

          {/* NAAC */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ lineHeight: 1, textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#16305c" }}>NAAC</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#16305c" }}>GRADE</div>
              <div style={{ fontSize: 8, color: "#666", letterSpacing: "0.5px" }}>ACCREDITED UNIVERSITY</div>
            </div>
            <div style={{ background: red, color: "#fff", fontWeight: 800, fontSize: 20, padding: "2px 8px", borderRadius: 2 }}>A+</div>
          </div>
        </div>

        {/* Certificate number */}
        <div style={{ marginTop: 26, fontSize: 17, fontWeight: 700 }}>
          Certificate&nbsp;&nbsp;No.&nbsp; {certificateNumber}
        </div>

        {/* Title block */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <div style={{ fontSize: 33, fontWeight: 700, letterSpacing: "0.5px" }}>CERTIFICATE OF PARTICIPATION</div>
          <div style={{ fontSize: 19, fontWeight: 400, marginTop: 8 }}>This is to certify that</div>
        </div>

        {/* Participant name */}
        <div style={{ textAlign: "center", marginTop: 34 }}>
          <div style={{ display: "inline-block", borderBottom: "2px solid #111", width: 600, paddingBottom: 6, fontSize: 24, fontWeight: 600 }}>
            {participantName}
          </div>
        </div>

        {/* Body */}
        <div style={{ textAlign: "center", fontSize: 19, marginTop: 14 }}>has successfully participated in the</div>
        <div style={{ textAlign: "center", fontSize: 26, fontWeight: 700, marginTop: 2 }}>{template.title}</div>
        <div style={{ textAlign: "center", fontSize: 19, marginTop: 14 }}>
          conducted by <strong>GD Goenka University</strong> in collaboration with <strong>Jindal Steel Ltd.</strong>
        </div>

        {/* Meta line */}
        <div style={{ textAlign: "center", fontSize: 19, fontWeight: 700, marginTop: 40 }}>
          Held on:
          <span style={{ display: "inline-block", borderBottom: "2px solid #111", width: 160, margin: "0 6px", verticalAlign: "bottom", paddingBottom: 2, fontWeight: 400 }}>
            {dateStr}
          </span>
          &nbsp;|&nbsp; Location:
          <span style={{ display: "inline-block", borderBottom: "2px solid #111", width: 200, margin: "0 6px", verticalAlign: "bottom", paddingBottom: 2, fontWeight: 400 }}>
            {eventName}
          </span>
        </div>

        {/* Bottom row */}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 28 }}>
          {/* QR code */}
          <svg width="150" height="150" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#fff" />
            <g fill="#000">
              <rect x="4" y="4" width="26" height="26" /><rect x="70" y="4" width="26" height="26" /><rect x="4" y="70" width="26" height="26" />
              <rect x="11" y="11" width="12" height="12" fill="#fff" /><rect x="77" y="11" width="12" height="12" fill="#fff" /><rect x="11" y="77" width="12" height="12" fill="#fff" />
              <rect x="38" y="6" width="6" height="6" /><rect x="50" y="6" width="6" height="6" /><rect x="60" y="10" width="6" height="6" />
              <rect x="38" y="18" width="6" height="6" /><rect x="56" y="18" width="6" height="6" />
              <rect x="34" y="38" width="6" height="6" /><rect x="46" y="38" width="6" height="6" /><rect x="58" y="38" width="6" height="6" />
              <rect x="66" y="44" width="6" height="6" /><rect x="78" y="44" width="6" height="6" /><rect x="90" y="38" width="6" height="6" />
              <rect x="38" y="52" width="6" height="6" /><rect x="50" y="58" width="6" height="6" /><rect x="62" y="52" width="6" height="6" />
              <rect x="34" y="64" width="6" height="6" /><rect x="46" y="66" width="6" height="6" />
              <rect x="60" y="70" width="6" height="6" /><rect x="72" y="64" width="6" height="6" /><rect x="84" y="70" width="6" height="6" />
              <rect x="38" y="80" width="6" height="6" /><rect x="50" y="84" width="6" height="6" /><rect x="62" y="80" width="6" height="6" />
              <rect x="76" y="86" width="6" height="6" /><rect x="88" y="80" width="6" height="6" />
            </g>
          </svg>

          {/* Signature */}
          <div style={{ textAlign: "center", fontSize: 19, fontWeight: 700, lineHeight: 1.5 }}>
            <div>{template.signatoryName}</div>
            {sigLines.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>
      </div>

      {/* Bottom NSDC colour stripes */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 20, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, background: orange }} />
        <div style={{ flex: 1, background: green }} />
        <div style={{ flex: 1, background: blue }} />
        <div style={{ flex: 1, background: red }} />
      </div>
    </div>
  );
}

// ── Classic layout ────────────────────────────────────────────────────────────
function ClassicPreview({ template, participantName, eventName, certificateNumber }: Required<PreviewProps>) {
  const logos = parseLogos(template);
  const accent = template.accentColor || "#1e3a8a";
  const ink = "#1e2040";
  const muted = "#6b7280";
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const body = fillBody(template, participantName, eventName);
  const sigLines = template.signatoryTitle.split("\n");

  const LOGO_H = 46;
  const LOGO_TOP = 28;
  const hasLogos = logos.length > 0;
  const DIVIDER_Y = LOGO_TOP + (hasLogos ? LOGO_H + 6 : 0);
  const CERT_NO_Y = DIVIDER_Y + 10;
  const TITLE_Y = CERT_NO_Y + 40;
  const RULE_Y = TITLE_Y + 30;
  const AWARD_Y = RULE_Y + 24;
  const NAME_Y = AWARD_Y + 36;
  const NAME_RULE_Y = NAME_Y + 38;
  const BODY_Y = NAME_RULE_Y + 14;

  return (
    <div style={{ width: W, height: H, position: "relative", background: "white", fontFamily: "Helvetica Neue, Arial, sans-serif" }}>
      <div style={{ position: "absolute", inset: 14, border: `3px solid ${accent}`, pointerEvents: "none", zIndex: 2 }} />
      {([{ top: 13, left: 13 }, { top: 13, right: 13 }, { bottom: 13, left: 13 }, { bottom: 13, right: 13 }] as React.CSSProperties[]).map((pos, i) => (
        <div key={i} style={{ position: "absolute", width: 10, height: 10, background: GOLD, zIndex: 3, ...pos }} />
      ))}
      {hasLogos && (
        <div style={{ position: "absolute", top: LOGO_TOP, left: 28, right: 28, height: LOGO_H, display: "flex", alignItems: "center", justifyContent: "center", gap: 26 }}>
          {logos.map((key) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={key} src={`/api/files/${key}`} alt="" style={{ height: LOGO_H, maxWidth: 150, objectFit: "contain" }} />
          ))}
        </div>
      )}
      <div style={{ position: "absolute", top: DIVIDER_Y, left: 28, right: 28, height: 1, background: accent }} />
      <p style={{ position: "absolute", top: CERT_NO_Y, left: 0, right: 0, textAlign: "center", margin: 0, fontSize: 10, color: muted }}>Certificate No: {certificateNumber}</p>
      <p style={{ position: "absolute", top: TITLE_Y, left: 0, right: 0, textAlign: "center", margin: 0, fontSize: 24, fontWeight: "bold", color: accent }}>CERTIFICATE OF COMPLETION</p>
      <div style={{ position: "absolute", top: RULE_Y, left: (W - 300) / 2, width: 300, height: 1.5, background: accent }} />
      <p style={{ position: "absolute", top: AWARD_Y, left: 0, right: 0, textAlign: "center", margin: 0, fontSize: 11, fontStyle: "italic", color: muted }}>Awarded to</p>
      <p style={{ position: "absolute", top: NAME_Y, left: 60, right: 60, textAlign: "center", margin: 0, fontSize: 28, fontWeight: "bold", color: ink, fontFamily: "Times New Roman, Georgia, serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{participantName}</p>
      <div style={{ position: "absolute", top: NAME_RULE_Y, left: (W - 400) / 2, width: 400, height: 1, background: GOLD }} />
      <p style={{ position: "absolute", top: BODY_Y, left: 60, right: 60, margin: 0, textAlign: "center", fontSize: 12, lineHeight: 1.7, color: ink }}>{body}</p>
      <div style={{ position: "absolute", bottom: 28, left: 80, width: 200 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          {template.signatureImage && <img src={`/api/files/${template.signatureImage}`} alt="" style={{ height: 30, objectFit: "contain" }} />}
          <div style={{ width: 180, height: 1, background: muted }} />
          <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: "bold", color: ink }}>{template.signatoryName}</p>
          {sigLines.map((l, i) => <p key={i} style={{ margin: 0, fontSize: 9, color: muted }}>{l}</p>)}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 28, right: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ width: 80, height: 80, background: "#e5e5e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#aaa" }}>QR Code</div>
        <p style={{ margin: 0, fontSize: 8, color: muted }}>Scan to verify</p>
      </div>
      <p style={{ position: "absolute", bottom: 30, left: 0, right: 0, textAlign: "center", margin: 0, fontSize: 10, color: muted }}>{dateStr}</p>
    </div>
  );
}

// ── Banner layout ─────────────────────────────────────────────────────────────
function BannerPreview({ template, participantName, eventName, certificateNumber }: Required<PreviewProps>) {
  const logos = parseLogos(template);
  const accent = template.accentColor || "#1e3a8a";
  const ink = "#1e2040";
  const muted = "#6b7280";
  const body = fillBody(template, participantName, eventName);
  const sigLines = template.signatoryTitle.split("\n");

  const BANNER_H = 108;
  const CERT_NO_Y = BANNER_H + 14;
  const CERTIFY_Y = CERT_NO_Y + 22;
  const NAME_Y = CERTIFY_Y + 30;
  const RULE_Y = NAME_Y + 52;
  const BODY_Y = RULE_Y + 14;

  return (
    <div style={{ width: W, height: H, position: "relative", background: "white", fontFamily: "Helvetica Neue, Arial, sans-serif" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: BANNER_H, background: accent }} />
      <div style={{ position: "absolute", top: BANNER_H, left: 0, right: 0, height: 3, background: GOLD }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 7, background: accent }} />
      <div style={{ position: "absolute", top: 8, left: 30, right: 30, height: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
        {logos.map((key) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={key} src={`/api/files/${key}`} alt="" style={{ height: 40, maxWidth: 120, objectFit: "contain" }} />
        ))}
      </div>
      <p style={{ position: "absolute", top: BANNER_H - 36, left: 0, right: 0, textAlign: "center", margin: 0, fontSize: 18, fontWeight: "bold", letterSpacing: "0.15em", color: "white" }}>C E R T I F I C A T E &nbsp; O F &nbsp; C O M P L E T I O N</p>
      <p style={{ position: "absolute", top: CERT_NO_Y, left: 0, right: 0, textAlign: "center", margin: 0, fontSize: 10, color: muted }}>Certificate No: {certificateNumber}</p>
      <p style={{ position: "absolute", top: CERTIFY_Y, left: 0, right: 0, textAlign: "center", margin: 0, fontSize: 12, fontStyle: "italic", color: ink }}>This is to certify that</p>
      <p style={{ position: "absolute", top: NAME_Y, left: 60, right: 60, textAlign: "center", margin: 0, fontSize: 36, fontWeight: "bold", fontStyle: "italic", color: accent, fontFamily: "Times New Roman, Georgia, serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{participantName}</p>
      <div style={{ position: "absolute", top: RULE_Y, left: (W - 450) / 2, width: 450, height: 1, background: GOLD }} />
      <p style={{ position: "absolute", top: BODY_Y, left: 60, right: 60, margin: 0, textAlign: "center", fontSize: 11, lineHeight: 1.65, color: ink, overflow: "hidden", maxHeight: 100 }}>{body}</p>
      <div style={{ position: "absolute", bottom: 175, left: 30, right: 30, height: 1, background: "#d1d5db" }} />
      <div style={{ position: "absolute", bottom: 30, left: 130 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          {template.signatureImage && <img src={`/api/files/${template.signatureImage}`} alt="" style={{ height: 28, objectFit: "contain" }} />}
          <div style={{ width: 180, height: 1, background: muted }} />
          <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: "bold", color: ink }}>{template.signatoryName}</p>
          {sigLines.map((l, i) => <p key={i} style={{ margin: 0, fontSize: 9, color: muted }}>{l}</p>)}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 22, right: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ width: 84, height: 84, background: "#e5e5e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#aaa" }}>QR Code</div>
        <p style={{ margin: 0, fontSize: 8, color: muted }}>Scan to verify</p>
      </div>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export function CertificatePreview({
  template,
  participantName = "Participant Name",
  eventName = "Event / Location",
  certificateNumber = "CSR-2026-000001",
}: PreviewProps) {
  const layout = template.layout || "driiv";
  const props = { template, participantName, eventName, certificateNumber };

  const CANVAS: Record<string, [number, number]> = {
    driiv: [1500, 1000],
    jsp:   [1340, 750],
  };
  const [innerW, innerH] = CANVAS[layout] ?? [W, H];
  const scale = layout in CANVAS ? (W * SCALE) / innerW : SCALE;

  return (
    <div
      style={{
        width: innerW * scale,
        height: innerH * scale,
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        borderRadius: 14,
      }}
    >
      <div style={{ width: innerW, height: innerH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {layout === "classic" ? (
          <ClassicPreview {...props} />
        ) : layout === "banner" ? (
          <BannerPreview {...props} />
        ) : layout === "jsp" ? (
          <JspPreview {...props} />
        ) : (
          <DriivPreview {...props} />
        )}
      </div>
    </div>
  );
}
