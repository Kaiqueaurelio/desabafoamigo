import type { CaptionSegment } from "@/components/SyncedAudioPlayer";

export type TranscriptExport = {
  title: string;
  createdAt: string;
  original?: { label: string; text: string; segments?: CaptionSegment[] };
  translations: { lang: string; label: string; text: string; segments?: CaptionSegment[] }[];
};

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "00:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function renderBlock(label: string, text: string, segments?: CaptionSegment[]): string {
  const header = `--- ${label} ---`;
  if (segments && segments.length > 0) {
    const body = segments.map((s) => `[${fmtTime(s.start)} - ${fmtTime(s.end)}] ${s.text.trim()}`).join("\n");
    return `${header}\n${body}`;
  }
  return `${header}\n${text.trim()}`;
}

export function buildTranscriptText(data: TranscriptExport): string {
  const parts: string[] = [];
  parts.push(data.title);
  parts.push(`Gerado em: ${new Date(data.createdAt).toLocaleString()}`);
  parts.push("");
  if (data.original) parts.push(renderBlock(data.original.label, data.original.text, data.original.segments));
  for (const t of data.translations) {
    parts.push("");
    parts.push(renderBlock(`Tradução — ${t.label}`, t.text, t.segments));
  }
  parts.push("");
  parts.push("— Desabafa Amigo · escuta acolhedora");
  return parts.join("\n");
}

function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "transcricao";
}

export function downloadTxt(data: TranscriptExport): void {
  const blob = new Blob([buildTranscriptText(data)], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, `${slug(data.title)}.txt`);
}

export async function downloadPdf(data: TranscriptExport): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const writeLine = (text: string, size: number, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      if (y > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += size * 1.25;
    }
  };

  writeLine(data.title, 16, "bold");
  writeLine(`Gerado em: ${new Date(data.createdAt).toLocaleString()}`, 10, "italic");
  y += 8;

  const writeBlock = (label: string, text: string, segments?: CaptionSegment[]) => {
    writeLine(label, 12, "bold");
    if (segments && segments.length > 0) {
      for (const s of segments) writeLine(`[${fmtTime(s.start)} - ${fmtTime(s.end)}] ${s.text.trim()}`, 11);
    } else {
      writeLine(text.trim(), 11);
    }
    y += 8;
  };

  if (data.original) writeBlock(data.original.label, data.original.text, data.original.segments);
  for (const t of data.translations) writeBlock(`Tradução — ${t.label}`, t.text, t.segments);

  writeLine("— Desabafa Amigo · escuta acolhedora", 9, "italic");
  doc.save(`${slug(data.title)}.pdf`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
