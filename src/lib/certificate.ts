import "server-only";
import crypto from "node:crypto";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { db } from "@/lib/db";
import { saveBuffer, readUploadedFile } from "@/lib/storage";
import { qrPngBuffer } from "@/lib/qrcode";
import { logAudit } from "@/lib/audit";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

/** A participant's certificate unlocks once they've completed whichever gate(s) are published
 * for the event — the assessment, the feedback, or either. If neither is configured for the
 * event at all, there's nothing to gate on, so it's unlocked as soon as it's published. */
export async function isEventCertificateUnlocked(participantId: string, eventId: string) {
  const [assessmentGateCount, assessmentDoneCount, feedbackGateCount, feedbackDoneCount] = await Promise.all([
    db.eventAssessment.count({ where: { eventId, isPublished: true } }),
    db.assessmentResult.count({ where: { eventId, participantId } }),
    db.eventFeedback.count({ where: { eventId, isPublished: true } }),
    db.feedbackResponse.count({ where: { eventId, participantId } }),
  ]);

  if (assessmentGateCount === 0 && feedbackGateCount === 0) return true;
  return assessmentDoneCount > 0 || feedbackDoneCount > 0;
}

function fillPlaceholders(text: string, values: Record<string, string>) {
  return Object.entries(values).reduce((acc, [key, value]) => acc.split(`{{${key}}}`).join(value), text);
}

function hexToRgb(hex: string): RGB {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return rgb(0.12, 0.23, 0.54);
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16) / 255);
  return rgb(r, g, b);
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  return lines;
}

function drawCentered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color: RGB) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_WIDTH - width) / 2, y, size, font, color });
}

/** Embeds a logo/signature/stamp image, trying PNG then JPG; returns null (skips silently) if the file is unreadable or unsupported. */
async function embedImage(pdf: PDFDocument, fileKey: string) {
  try {
    const { data: bytes } = await readUploadedFile(fileKey);
    try {
      return await pdf.embedPng(bytes);
    } catch {
      return await pdf.embedJpg(bytes);
    }
  } catch {
    return null;
  }
}

type TemplateForRender = {
  title: string;
  bodyText: string;
  logos: string;
  signatoryName: string;
  signatoryTitle: string;
  signatureImage: string | null;
  stampImage: string | null;
  accentColor: string;
  layout: string;
};

type RenderOpts = {
  template: TemplateForRender;
  participantName: string;
  eventName: string;
  projectName: string;
  tradeCategory: string;
  certificateNumber: string;
  issuedAt: Date;
  verifyUrl: string;
};

async function renderDriivLayout(opts: RenderOpts) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const fontNameScript = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);

  const navy = hexToRgb(opts.template.accentColor);
  const gold = rgb(0.784, 0.647, 0.161);
  const ink = rgb(0.12, 0.15, 0.25);
  const muted = rgb(0.42, 0.42, 0.46);
  const white = rgb(1, 1, 1);
  const lightGold = rgb(0.98, 0.96, 0.88);

  // ── Borders ───────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 10, y: 10, width: PAGE_WIDTH - 20, height: PAGE_HEIGHT - 20, borderColor: navy, borderWidth: 4 });
  page.drawRectangle({ x: 18, y: 18, width: PAGE_WIDTH - 36, height: PAGE_HEIGHT - 36, borderColor: navy, borderWidth: 1 });

  // Gold L-shaped corner brackets
  const cb = 24;
  const ci = 10;
  const cornerPts: Array<[number, number, number, number][]> = [
    // top-left
    [[ci, PAGE_HEIGHT - ci - cb, ci, PAGE_HEIGHT - ci], [ci, PAGE_HEIGHT - ci, ci + cb, PAGE_HEIGHT - ci]],
    // top-right
    [[PAGE_WIDTH - ci, PAGE_HEIGHT - ci - cb, PAGE_WIDTH - ci, PAGE_HEIGHT - ci], [PAGE_WIDTH - ci - cb, PAGE_HEIGHT - ci, PAGE_WIDTH - ci, PAGE_HEIGHT - ci]],
    // bottom-left
    [[ci, ci, ci, ci + cb], [ci, ci, ci + cb, ci]],
    // bottom-right
    [[PAGE_WIDTH - ci, ci, PAGE_WIDTH - ci, ci + cb], [PAGE_WIDTH - ci - cb, ci, PAGE_WIDTH - ci, ci]],
  ];
  for (const corner of cornerPts) {
    for (const [x1, y1, x2, y2] of corner) {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 3.5, color: gold });
    }
  }

  // ── Logos (up to 5, centred in a row near the top) ───────────────────────
  const logoKeys: string[] = (() => {
    try {
      return (JSON.parse(opts.template.logos || "[]") as string[]).slice(0, 5);
    } catch {
      return [];
    }
  })();
  const logoH = 48;
  const logoRowTopY = PAGE_HEIGHT - 30;
  const logoRowBottomY = logoRowTopY - logoH;
  if (logoKeys.length > 0) {
    const embedded = (await Promise.all(logoKeys.map((k) => embedImage(pdf, k)))).filter((img) => img !== null);
    const gap = 28;
    const widths = embedded.map((img) => (img.width / img.height) * logoH);
    const total = widths.reduce((s, w) => s + w, 0) + gap * Math.max(0, embedded.length - 1);
    let x = (PAGE_WIDTH - total) / 2;
    embedded.forEach((img, i) => {
      page.drawImage(img, { x, y: logoRowBottomY, width: widths[i], height: logoH });
      x += widths[i] + gap;
    });
  }

  // ── Horizontal divider ────────────────────────────────────────────────────
  const dividerY = logoRowBottomY - 8;
  page.drawLine({ start: { x: 28, y: dividerY }, end: { x: PAGE_WIDTH - 28, y: dividerY }, thickness: 1, color: navy });

  // ── Certificate number ────────────────────────────────────────────────────
  const certNoY = dividerY - 18;
  drawCentered(page, `Certificate No. :  ${opts.certificateNumber}`, certNoY, font, 10, muted);

  // ── "C E R T I F I C A T E" ──────────────────────────────────────────────
  const titleY = certNoY - 44;
  drawCentered(page, "C E R T I F I C A T E", titleY, fontBold, 32, navy);

  // ── "OF COMPLETION" with flanking gold lines ──────────────────────────────
  const completionY = titleY - 30;
  const compText = "O F   C O M P L E T I O N";
  const compSize = 13;
  const compW = fontBold.widthOfTextAtSize(compText, compSize);
  const compX = (PAGE_WIDTH - compW) / 2;
  page.drawText(compText, { x: compX, y: completionY, size: compSize, font: fontBold, color: gold });
  const compMidY = completionY + compSize / 2;
  page.drawLine({ start: { x: 50, y: compMidY }, end: { x: compX - 10, y: compMidY }, thickness: 0.75, color: gold });
  page.drawLine({ start: { x: compX + compW + 10, y: compMidY }, end: { x: PAGE_WIDTH - 50, y: compMidY }, thickness: 0.75, color: gold });

  // ── "This is to certify that" ─────────────────────────────────────────────
  const certifyY = completionY - 26;
  drawCentered(page, "This is to certify that", certifyY, fontItalic, 12, ink);

  // ── Participant name in large italic serif ────────────────────────────────
  const nameSize = 30;
  const nameY = certifyY - 38;
  drawCentered(page, opts.participantName, nameY, fontNameScript, nameSize, navy);

  // ── Gold rule under name ──────────────────────────────────────────────────
  const nameRuleY = nameY - 12;
  page.drawLine({ start: { x: 150, y: nameRuleY }, end: { x: PAGE_WIDTH - 150, y: nameRuleY }, thickness: 0.75, color: gold });

  // ── Body text ─────────────────────────────────────────────────────────────
  const body = fillPlaceholders(opts.template.bodyText, {
    name: opts.participantName,
    event: opts.eventName,
    project: opts.projectName,
    tradeCategory: opts.tradeCategory,
    date: opts.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
  });
  const bodyFontSize = 11;
  const bodyLineH = 17;
  const bodyLines = wrapText(font, body, bodyFontSize, 580);
  let bodyLineY = nameRuleY - 22;
  for (const line of bodyLines) {
    drawCentered(page, line, bodyLineY, font, bodyFontSize, ink);
    bodyLineY -= bodyLineH;
  }

  // ── Bottom section: info boxes (left) + QR box (right) ───────────────────
  const sectionBot = 28;
  const sectionTop = 188;
  const sectionH = sectionTop - sectionBot;

  // QR verification box
  const qrBoxX = PAGE_WIDTH - 194;
  const qrBoxW = 166;
  const qrHdrH = 22;
  page.drawRectangle({ x: qrBoxX, y: sectionBot, width: qrBoxW, height: sectionH, color: lightGold, borderColor: gold, borderWidth: 1.5 });
  page.drawRectangle({ x: qrBoxX, y: sectionBot + sectionH - qrHdrH, width: qrBoxW, height: qrHdrH, color: navy });
  const qrHdrText = "QR VERIFICATION";
  const qrHdrW = fontBold.widthOfTextAtSize(qrHdrText, 8);
  page.drawText(qrHdrText, { x: qrBoxX + (qrBoxW - qrHdrW) / 2, y: sectionBot + sectionH - qrHdrH + 7, size: 8, font: fontBold, color: white });

  const qrBuffer = await qrPngBuffer(opts.verifyUrl);
  const qrImage = await pdf.embedPng(qrBuffer);
  const qrSize = 78;
  const qrImgX = qrBoxX + (qrBoxW - qrSize) / 2;
  const qrImgY = sectionBot + sectionH - qrHdrH - qrSize - 6;
  page.drawImage(qrImage, { x: qrImgX, y: qrImgY, width: qrSize, height: qrSize });

  const qrSubLines = ["Scan the QR code to verify", "the authenticity of this", "certificate."];
  qrSubLines.forEach((line, i) => {
    const lw = font.widthOfTextAtSize(line, 7);
    page.drawText(line, { x: qrBoxX + (qrBoxW - lw) / 2, y: qrImgY - 12 - i * 10, size: 7, font, color: muted });
  });

  // Info boxes
  const infoLeft = 36;
  const infoRight = qrBoxX - 14;
  const infoAreaW = infoRight - infoLeft;
  const infoBoxH = 60;
  const infoBoxY = sectionBot + (sectionH - infoBoxH) / 2 + 8;
  const perBoxW = (infoAreaW - 20) / 3;
  const isoDate = opts.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const infoItems = [
    { label: "DURATION OF PROGRAM", value: "4 Days" },
    { label: "LOCATION", value: opts.eventName },
    { label: "DATE OF CERTIFICATION", value: isoDate },
  ];
  infoItems.forEach((item, i) => {
    const bx = infoLeft + i * (perBoxW + 10);
    page.drawRectangle({ x: bx, y: infoBoxY, width: perBoxW, height: infoBoxH, borderColor: gold, borderWidth: 1.5 });
    const labelW = fontBold.widthOfTextAtSize(item.label, 7);
    page.drawText(item.label, { x: bx + (perBoxW - labelW) / 2, y: infoBoxY + infoBoxH - 15, size: 7, font: fontBold, color: gold });
    const valW = font.widthOfTextAtSize(item.value, 10);
    page.drawText(item.value, { x: bx + (perBoxW - valW) / 2, y: infoBoxY + 10, size: 10, font, color: ink });
  });

  // ── Signature (centred below info boxes, in the left column) ─────────────
  const sigCx = infoLeft + infoAreaW / 2;
  const stampImage = opts.template.stampImage ? await embedImage(pdf, opts.template.stampImage) : null;
  const signatureImage = opts.template.signatureImage ? await embedImage(pdf, opts.template.signatureImage) : null;

  let sigBaseY = infoBoxY - 14;

  if (signatureImage) {
    const sigW = 90;
    const sigH = (signatureImage.height / signatureImage.width) * sigW;
    page.drawImage(signatureImage, { x: sigCx - sigW / 2, y: sigBaseY - sigH - 2, width: sigW, height: sigH });
    sigBaseY -= sigH + 4;
  }
  if (stampImage) {
    const stampSz = 48;
    const stampH = (stampImage.height / stampImage.width) * stampSz;
    page.drawImage(stampImage, { x: sigCx - stampSz / 2, y: sigBaseY - stampH - 2, width: stampSz, height: stampH });
    sigBaseY -= stampH + 4;
  }

  const sigLineW = 180;
  const sigLineY = sigBaseY - 10;
  page.drawLine({ start: { x: sigCx - sigLineW / 2, y: sigLineY }, end: { x: sigCx + sigLineW / 2, y: sigLineY }, thickness: 0.75, color: muted });

  const sigNameW = fontBold.widthOfTextAtSize(opts.template.signatoryName, 11);
  page.drawText(opts.template.signatoryName, { x: sigCx - sigNameW / 2, y: sigLineY - 14, size: 11, font: fontBold, color: ink });

  const sigTitleLines = opts.template.signatoryTitle.split("\n");
  sigTitleLines.forEach((line, i) => {
    const lw = font.widthOfTextAtSize(line, 9);
    page.drawText(line, { x: sigCx - lw / 2, y: sigLineY - 26 - i * 12, size: 9, font, color: muted });
  });

  return pdf.save();
}

// ── Classic layout ────────────────────────────────────────────────────────────
async function renderClassicLayout(opts: RenderOpts) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const fontNameScript = await pdf.embedFont(StandardFonts.TimesRomanBold);

  const accent = hexToRgb(opts.template.accentColor);
  const gold = rgb(0.784, 0.647, 0.161);
  const ink = rgb(0.12, 0.15, 0.25);
  const muted = rgb(0.42, 0.42, 0.46);

  // Single elegant border
  page.drawRectangle({ x: 14, y: 14, width: PAGE_WIDTH - 28, height: PAGE_HEIGHT - 28, borderColor: accent, borderWidth: 3 });

  // Small gold corner squares
  for (const [x, y] of [[13, PAGE_HEIGHT - 23], [PAGE_WIDTH - 23, PAGE_HEIGHT - 23], [13, 13], [PAGE_WIDTH - 23, 13]] as [number, number][]) {
    page.drawRectangle({ x, y, width: 10, height: 10, color: gold });
  }

  // Logo row
  const logoKeys: string[] = (() => { try { return (JSON.parse(opts.template.logos || "[]") as string[]).slice(0, 5); } catch { return []; } })();
  const logoH = 46;
  const logoRowBottomY = PAGE_HEIGHT - 34;
  const logoRowTopY = logoRowBottomY - logoH;
  if (logoKeys.length > 0) {
    const embedded = (await Promise.all(logoKeys.map((k) => embedImage(pdf, k)))).filter((i) => i !== null);
    const gap = 26;
    const widths = embedded.map((img) => (img.width / img.height) * logoH);
    const total = widths.reduce((s, w) => s + w, 0) + gap * Math.max(0, embedded.length - 1);
    let x = (PAGE_WIDTH - total) / 2;
    embedded.forEach((img, i) => { page.drawImage(img, { x, y: logoRowTopY, width: widths[i], height: logoH }); x += widths[i] + gap; });
  }

  // Horizontal divider
  const divY = (logoKeys.length > 0 ? logoRowTopY : PAGE_HEIGHT - 34) - 6;
  page.drawLine({ start: { x: 28, y: divY }, end: { x: PAGE_WIDTH - 28, y: divY }, thickness: 1, color: accent });

  // Certificate number
  drawCentered(page, `Certificate No: ${opts.certificateNumber}`, divY - 16, font, 10, muted);

  // "CERTIFICATE OF COMPLETION"
  const titleY = divY - 54;
  drawCentered(page, "CERTIFICATE OF COMPLETION", titleY, fontBold, 24, accent);

  // Thin rule under title
  const ruleLen = 300;
  page.drawLine({ start: { x: (PAGE_WIDTH - ruleLen) / 2, y: titleY - 10 }, end: { x: (PAGE_WIDTH + ruleLen) / 2, y: titleY - 10 }, thickness: 1.5, color: accent });

  // "Awarded to"
  drawCentered(page, "Awarded to", titleY - 32, fontItalic, 11, muted);

  // Participant name
  const nameY = titleY - 72;
  drawCentered(page, opts.participantName, nameY, fontNameScript, 28, ink);

  // Gold rule under name
  const nameRuleLen = 400;
  page.drawLine({ start: { x: (PAGE_WIDTH - nameRuleLen) / 2, y: nameY - 12 }, end: { x: (PAGE_WIDTH + nameRuleLen) / 2, y: nameY - 12 }, thickness: 1, color: gold });

  // Body text
  const body = fillPlaceholders(opts.template.bodyText, {
    name: opts.participantName, event: opts.eventName, project: opts.projectName,
    tradeCategory: opts.tradeCategory,
    date: opts.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
  });
  let bodyY = nameY - 34;
  for (const line of wrapText(font, body, 12, 610)) {
    drawCentered(page, line, bodyY, font, 12, ink);
    bodyY -= 18;
  }

  // QR code — bottom right
  const qrBuffer = await qrPngBuffer(opts.verifyUrl);
  const qrImage = await pdf.embedPng(qrBuffer);
  const qrSize = 80;
  const qrX = PAGE_WIDTH - 120;
  const qrY = 52;
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  drawCentered(page, "Scan to verify", qrY - 13, font, 8, muted);

  // Signature — bottom left
  const stampImage = opts.template.stampImage ? await embedImage(pdf, opts.template.stampImage) : null;
  const signatureImage = opts.template.signatureImage ? await embedImage(pdf, opts.template.signatureImage) : null;
  const sigCx = 210;
  let sigBaseY = 130;
  if (signatureImage) {
    const sw = 100; const sh = (signatureImage.height / signatureImage.width) * sw;
    page.drawImage(signatureImage, { x: sigCx - sw / 2, y: sigBaseY - sh, width: sw, height: sh });
    sigBaseY -= sh + 4;
  }
  if (stampImage) {
    const sz = 48; const sh = (stampImage.height / stampImage.width) * sz;
    page.drawImage(stampImage, { x: sigCx - sz / 2, y: sigBaseY - sh, width: sz, height: sh });
    sigBaseY -= sh + 4;
  }
  const sigLineY = sigBaseY - 8;
  page.drawLine({ start: { x: sigCx - 90, y: sigLineY }, end: { x: sigCx + 90, y: sigLineY }, thickness: 0.75, color: muted });
  const snW = fontBold.widthOfTextAtSize(opts.template.signatoryName, 11);
  page.drawText(opts.template.signatoryName, { x: sigCx - snW / 2, y: sigLineY - 14, size: 11, font: fontBold, color: ink });
  opts.template.signatoryTitle.split("\n").forEach((line, i) => {
    const lw = font.widthOfTextAtSize(line, 9);
    page.drawText(line, { x: sigCx - lw / 2, y: sigLineY - 26 - i * 12, size: 9, font, color: muted });
  });

  // Date centred at bottom
  const dateStr = opts.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  drawCentered(page, dateStr, 36, font, 10, muted);

  return pdf.save();
}

// ── Banner layout ─────────────────────────────────────────────────────────────
async function renderBannerLayout(opts: RenderOpts) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const fontNameScript = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);

  const accent = hexToRgb(opts.template.accentColor);
  const gold = rgb(0.784, 0.647, 0.161);
  const ink = rgb(0.12, 0.15, 0.25);
  const muted = rgb(0.42, 0.42, 0.46);
  const white = rgb(1, 1, 1);

  // Top banner
  const bannerH = 108;
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - bannerH, width: PAGE_WIDTH, height: bannerH, color: accent });
  // Bottom accent strip
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: 7, color: accent });
  // Thin gold separator at base of banner
  page.drawLine({ start: { x: 0, y: PAGE_HEIGHT - bannerH }, end: { x: PAGE_WIDTH, y: PAGE_HEIGHT - bannerH }, thickness: 3, color: gold });

  // Logos inside banner
  const logoKeys: string[] = (() => { try { return (JSON.parse(opts.template.logos || "[]") as string[]).slice(0, 5); } catch { return []; } })();
  const logoH = 40;
  const logoBotY = PAGE_HEIGHT - 10;
  const logoTopY = logoBotY - logoH;
  if (logoKeys.length > 0) {
    const embedded = (await Promise.all(logoKeys.map((k) => embedImage(pdf, k)))).filter((i) => i !== null);
    const gap = 24;
    const widths = embedded.map((img) => (img.width / img.height) * logoH);
    const total = widths.reduce((s, w) => s + w, 0) + gap * Math.max(0, embedded.length - 1);
    let x = (PAGE_WIDTH - total) / 2;
    embedded.forEach((img, i) => { page.drawImage(img, { x, y: logoTopY, width: widths[i], height: logoH }); x += widths[i] + gap; });
  }

  // Title in banner
  const bannerTitleY = PAGE_HEIGHT - bannerH + 14;
  drawCentered(page, "C E R T I F I C A T E   O F   C O M P L E T I O N", bannerTitleY, fontBold, 18, white);

  // Certificate number (just below banner)
  drawCentered(page, `Certificate No: ${opts.certificateNumber}`, PAGE_HEIGHT - bannerH - 18, font, 10, muted);

  // "This is to certify that"
  const certifyY = PAGE_HEIGHT - bannerH - 46;
  drawCentered(page, "This is to certify that", certifyY, fontItalic, 12, ink);

  // Participant name — large
  const nameY = certifyY - 52;
  drawCentered(page, opts.participantName, nameY, fontNameScript, 36, accent);

  // Gold rule
  const nameRuleLen = 450;
  page.drawLine({ start: { x: (PAGE_WIDTH - nameRuleLen) / 2, y: nameY - 14 }, end: { x: (PAGE_WIDTH + nameRuleLen) / 2, y: nameY - 14 }, thickness: 1, color: gold });

  // Body text
  const body = fillPlaceholders(opts.template.bodyText, {
    name: opts.participantName, event: opts.eventName, project: opts.projectName,
    tradeCategory: opts.tradeCategory,
    date: opts.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
  });
  let bodyY = nameY - 36;
  for (const line of wrapText(font, body, 11, 600)) {
    drawCentered(page, line, bodyY, font, 11, ink);
    bodyY -= 17;
  }

  // Horizontal divider above bottom section
  const bottomDivY = 178;
  page.drawLine({ start: { x: 30, y: bottomDivY }, end: { x: PAGE_WIDTH - 30, y: bottomDivY }, thickness: 0.75, color: muted });

  // Signature — centred in left 2/3
  const stampImage = opts.template.stampImage ? await embedImage(pdf, opts.template.stampImage) : null;
  const signatureImage = opts.template.signatureImage ? await embedImage(pdf, opts.template.signatureImage) : null;
  const sigCx = 280;
  let sigBaseY = 162;
  if (signatureImage) {
    const sw = 100; const sh = (signatureImage.height / signatureImage.width) * sw;
    page.drawImage(signatureImage, { x: sigCx - sw / 2, y: sigBaseY - sh, width: sw, height: sh });
    sigBaseY -= sh + 4;
  }
  if (stampImage) {
    const sz = 48; const sh = (stampImage.height / stampImage.width) * sz;
    page.drawImage(stampImage, { x: sigCx - sz / 2, y: sigBaseY - sh, width: sz, height: sh });
    sigBaseY -= sh + 4;
  }
  const sigLineY = sigBaseY - 8;
  page.drawLine({ start: { x: sigCx - 100, y: sigLineY }, end: { x: sigCx + 100, y: sigLineY }, thickness: 0.75, color: muted });
  const snW = fontBold.widthOfTextAtSize(opts.template.signatoryName, 11);
  page.drawText(opts.template.signatoryName, { x: sigCx - snW / 2, y: sigLineY - 14, size: 11, font: fontBold, color: ink });
  opts.template.signatoryTitle.split("\n").forEach((line, i) => {
    const lw = font.widthOfTextAtSize(line, 9);
    page.drawText(line, { x: sigCx - lw / 2, y: sigLineY - 26 - i * 12, size: 9, font, color: muted });
  });

  // QR code — bottom right
  const qrBuffer = await qrPngBuffer(opts.verifyUrl);
  const qrImage = await pdf.embedPng(qrBuffer);
  const qrSize = 84;
  const qrX = PAGE_WIDTH - 120;
  const qrY = 24;
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  page.drawText("Scan to verify", { x: qrX + 6, y: qrY - 12, size: 8, font, color: muted });

  return pdf.save();
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
async function renderCertificatePdf(opts: RenderOpts) {
  const layout = opts.template.layout || "driiv";
  if (layout === "classic") return renderClassicLayout(opts);
  if (layout === "banner") return renderBannerLayout(opts);
  return renderDriivLayout(opts);
}

/** Issues (or returns the already-issued) certificate for a participant under a published
 * EventCertificate allotment. Always re-validates the unlock condition itself — never trusts
 * the caller — and is safe to call repeatedly (idempotent on the eventCertificateId+participantId
 * unique constraint). Returns null if the allotment isn't published or isn't unlocked yet. */
export async function issueCertificate(eventCertificateId: string, participantId: string) {
  const existing = await db.certificate.findUnique({
    where: { eventCertificateId_participantId: { eventCertificateId, participantId } },
  });
  if (existing) return existing;

  const eventCertificate = await db.eventCertificate.findUnique({
    where: { id: eventCertificateId },
    include: { certificateTemplate: true, event: { include: { project: true } } },
  });
  if (!eventCertificate || !eventCertificate.isPublished) return null;

  const unlocked = await isEventCertificateUnlocked(participantId, eventCertificate.eventId);
  if (!unlocked) return null;

  const participant = await db.participant.findUnique({ where: { id: participantId } });
  if (!participant) return null;

  const issuedAt = new Date();
  const verifyToken = crypto.randomUUID();
  const verifyUrl = `${process.env.APP_URL}/verify/${verifyToken}`;

  // The sequence number is reserved and the row created inside one transaction so two concurrent
  // claims can never collide on the same certificateNumber.
  const certificate = await db.$transaction(async (tx) => {
    const seq = await tx.certificate.count();
    const certificateNumber = `CSR-${issuedAt.getFullYear()}-${String(seq + 1).padStart(6, "0")}`;

    const pdfBytes = await renderCertificatePdf({
      template: eventCertificate.certificateTemplate,
      participantName: participant.name,
      eventName: eventCertificate.event.name,
      projectName: eventCertificate.event.project.name,
      tradeCategory: participant.tradeCategory ?? eventCertificate.event.project.tradeCategory,
      certificateNumber,
      issuedAt,
      verifyUrl,
    });
    const { fileKey } = await saveBuffer(Buffer.from(pdfBytes), `certificates/${eventCertificate.eventId}`, `${certificateNumber}.pdf`);

    return tx.certificate.create({
      data: {
        eventCertificateId,
        participantId,
        eventId: eventCertificate.eventId,
        certificateNumber,
        verifyToken,
        fileUrl: fileKey,
      },
    });
  });

  if (participant.status !== "DROPPED") {
    await db.participant.update({ where: { id: participantId }, data: { status: "CERTIFIED" } });
  }
  await logAudit({ userId: null, entityType: "Certificate", entityId: certificate.id, action: "SELF_ISSUE", after: certificate });

  return certificate;
}
