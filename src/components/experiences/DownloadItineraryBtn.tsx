"use client";

import { useState } from "react";
import { Download, Loader2, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Constants & Brand Colors ────────────────────────────
const COLORS = {
  orange: [233, 122, 43] as [number, number, number],       // #E97A2B — primary accent
  navy: [26, 26, 46] as [number, number, number],           // #1a1a2e — dark headers
  teal: [20, 184, 166] as [number, number, number],         // #14B8A6 — secondary accent
  warmGray: [245, 243, 240] as [number, number, number],    // #F5F3F0 — soft background
  darkText: [30, 30, 30] as [number, number, number],       // #1E1E1E
  mutedText: [120, 120, 120] as [number, number, number],   // #787878
  white: [255, 255, 255] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],         // #22C55E
  red: [239, 68, 68] as [number, number, number],           // #EF4444
  lightOrange: [254, 243, 230] as [number, number, number], // #FEF3E6
};

interface ItineraryBookingData {
  title: string;
  location: string;
  durationDays: number;
  difficulty?: string;
  maxAltitude?: string;
  trekDistance?: string;
  bestTimeToVisit?: string;
  maxGroupSize?: number | null;
  highlights?: string[];
  description?: string;
  itinerary?: {
    title?: string;
    description?: string;
    meals?: string | string[];
    accommodation?: string;
  }[];
  inclusions?: string[];
  exclusions?: string[];
  thingsToCarry?: string[];
  meetingPoint?: string;
  meetingTime?: string;
  dropoffTime?: string;
  networkConnectivity?: string;
  lastAtm?: string;
  fitnessRequirement?: string;
  ageRange?: string;
  minAge?: number | null;
  cancellationPolicy?: string;
  company: {
    name: string;
    email: string;
    phone: string;
    website: string;
  };
}

// ─── Helpers ──────────────────────────────────────────
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/proxy-image?url=${encodeURIComponent(url)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.dataUrl || null;
  } catch {
    return null;
  }
}

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(...COLORS.orange);
  doc.rect(0, pageHeight - 12, pageWidth, 12, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.white);
  doc.text("www.paramadventures.com", 14, pageHeight - 4.5);
  doc.text(
    `Page ${pageNum} of ${totalPages}`,
    pageWidth - 14,
    pageHeight - 4.5,
    { align: "right" }
  );
}

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.teal);
  doc.rect(14, y, 4, 10, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.navy);
  doc.text(title, 22, y + 7.5);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(14, y + 13, pageWidth - 14, y + 13);
  return y + 18;
}

function checkPageBreak(doc: jsPDF, currentY: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + needed > pageHeight - 20) {
    doc.addPage();
    return 20;
  }
  return currentY;
}

// ─── Page Drawing Fragments ────────────────────────────

function drawCoverPage(doc: jsPDF, data: ItineraryBookingData, logoBase64: string | null, coverBase64: string | null) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

      if (coverBase64) {
        try {
          const coverHeight = pageHeight * 0.55;
          doc.addImage(coverBase64, "JPEG", 0, 0, pageWidth, coverHeight, undefined, "FAST");

          const GState = (doc as unknown as { GState: new (options: { opacity: number }) => unknown }).GState;
          for (let i = 0; i < 60; i++) {
            const alpha = i / 60;
            doc.setFillColor(26, 26, 46);
            const gState = new GState({ opacity: alpha });
            doc.setGState(gState);
            doc.rect(0, coverHeight - 60 + i, pageWidth, 1, "F");
          }
          doc.setGState(new GState({ opacity: 1 }));
        } catch { /* skip image */ }
      }

  doc.setFillColor(...COLORS.orange);
  doc.rect(0, pageHeight * 0.58, pageWidth, 3, "F");

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 14, pageHeight * 0.64, 22, 22);
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.orange);
  doc.text("PARAM ADVENTURES", 40, pageHeight * 0.64 + 10);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Your Gateway to Unforgettable Adventures", 40, pageHeight * 0.64 + 16);

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  const titleLines = doc.splitTextToSize(data.title.toUpperCase(), pageWidth - 28);
  doc.text(titleLines, 14, pageHeight * 0.76);

  const badgeY = pageHeight * 0.76 + titleLines.length * 12 + 4;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.orange);
  doc.text(`Location: ${data.location}`, 14, badgeY);
  doc.text(`Duration: ${data.durationDays} Days / ${Math.max(data.durationDays - 1, 0)} Nights`, 14, badgeY + 7);

  if (data.difficulty) {
    doc.text(`Difficulty: ${data.difficulty.charAt(0) + data.difficulty.slice(1).toLowerCase()}`, 14, badgeY + 14);
  }

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.mutedText);
  doc.text("DETAILED TRIP ITINERARY", pageWidth / 2, pageHeight - 18, { align: "center" });

  doc.setFillColor(...COLORS.orange);
  doc.rect(0, pageHeight - 8, pageWidth, 8, "F");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.white);
  doc.text(data.company.website, pageWidth / 2, pageHeight - 3, { align: "center" });
}

function drawStatsOverview(doc: jsPDF, data: ItineraryBookingData, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  y = drawSectionHeader(doc, "TRIP AT A GLANCE", y);
  y += 2;

  const stats = [
    { label: "Duration", value: `${data.durationDays} Days` },
    { label: "Max Altitude", value: data.maxAltitude || "N/A" },
    { label: "Trek Distance", value: data.trekDistance || "N/A" },
    { label: "Difficulty", value: data.difficulty ? data.difficulty.charAt(0) + data.difficulty.slice(1).toLowerCase() : "N/A" },
    { label: "Best Season", value: data.bestTimeToVisit || "Year Round" },
    { label: "Group Size", value: data.maxGroupSize ? `Max ${data.maxGroupSize}` : "N/A" },
  ];

  const cardW = (pageWidth - 28 - 10) / 2;
  const cardH = 20;

  stats.forEach((stat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 14 + col * (cardW + 10);
    const cy = y + row * (cardH + 6);

    doc.setFillColor(...COLORS.lightOrange);
    doc.roundedRect(cx, cy, cardW, cardH, 3, 3, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.mutedText);
    doc.text(stat.label, cx + 5, cy + 7);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text(stat.value, cx + 5, cy + 15);
  });

  return y + Math.ceil(stats.length / 2) * (cardH + 6) + 6;
}

function drawHighlightsAndAbout(doc: jsPDF, data: ItineraryBookingData, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  if (data.highlights && data.highlights.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "HIGHLIGHTS", y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    data.highlights.forEach((h: string) => {
      y = checkPageBreak(doc, y, 8);
      doc.setTextColor(...COLORS.green);
      doc.text("+", 18, y + 4);
      doc.setTextColor(...COLORS.darkText);
      const lines = doc.splitTextToSize(h, pageWidth - 40);
      doc.text(lines, 26, y + 4);
      y += lines.length * 5 + 3;
    });
    y += 4;
  }

  if (data.description) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "ABOUT THE EXPERIENCE", y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.darkText);
    const descLines = doc.splitTextToSize(data.description, pageWidth - 28);
    for (const line of descLines) {
      y = checkPageBreak(doc, y, 6);
      doc.text(line, 14, y + 4);
      y += 5;
    }
    y += 6;
  }
  return y;
}

function drawItinerary(doc: jsPDF, data: ItineraryBookingData, y: number): number {
  if (!Array.isArray(data.itinerary) || data.itinerary.length === 0) return y;

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.addPage();
  y = 20;
  y = drawSectionHeader(doc, "DAY-BY-DAY ITINERARY", y);
  y += 2;

  data.itinerary.forEach((day, index) => {
    const dayNum = index + 1;
    const descLen = day.description?.length ?? 0;
    const neededHeight = 35 + (descLen / 5); // rough estimate
    y = checkPageBreak(doc, y, neededHeight);

    doc.setFillColor(...COLORS.orange);
    doc.circle(22, y + 6, 5, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(`D${dayNum}`, 22, y + 7.5, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text(day.title || `Day ${dayNum}`, 30, y + 7.5);

    if (day.description) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.darkText);
      const dayDescLines = doc.splitTextToSize(day.description, pageWidth - 44);
      doc.text(dayDescLines, 30, y + 14);
      y += 14 + dayDescLines.length * 4.5;
    } else {
      y += 14;
    }

    if (day.meals || day.accommodation) {
      const midX = 30 + (pageWidth - 44) / 2;
      y += 2;
      if (day.meals) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.teal);
        doc.text("Meals: ", 30, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.mutedText);
        const mealsStr = Array.isArray(day.meals) ? day.meals.join(", ") : (day.meals || "");
        const ml = doc.splitTextToSize(mealsStr, midX - 30 - 12);
        doc.text(ml, 42, y);
      }
      if (day.accommodation) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.teal);
        doc.text("Stay: ", midX, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.mutedText);
        const sl = doc.splitTextToSize(day.accommodation, pageWidth - 14 - midX - 10);
        doc.text(sl, midX + 10, y);
      }
      y += 8;
    }

    y += 3;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(30, y, pageWidth - 14, y);
    y += 6;
  });

  return y;
}

function drawInclusionsExclusionsPacking(doc: jsPDF, data: ItineraryBookingData, galleryImages: (string | null)[], y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const inclusions = Array.isArray(data.inclusions) ? data.inclusions : [];
  const exclusions = Array.isArray(data.exclusions) ? data.exclusions : [];
  const thingsToCarry = Array.isArray(data.thingsToCarry) ? data.thingsToCarry : [];

  if (inclusions.length > 0 || exclusions.length > 0 || thingsToCarry.length > 0) {
    doc.addPage();
    y = 20;

    if (inclusions.length > 0) {
      y = drawSectionHeader(doc, "WHAT'S INCLUDED", y);
      doc.setFontSize(9);
      inclusions.forEach((item: string) => {
        y = checkPageBreak(doc, y, 8);
        doc.setTextColor(...COLORS.green).setFont("helvetica", "bold").text("+", 18, y + 4);
        doc.setTextColor(...COLORS.darkText).setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(item, pageWidth - 40);
        doc.text(lines, 26, y + 4);
        y += lines.length * 5 + 2;
      });
      y += 8;
    }

    if (exclusions.length > 0) {
      y = checkPageBreak(doc, y, 20);
      y = drawSectionHeader(doc, "WHAT'S NOT INCLUDED", y);
      doc.setFontSize(9);
      exclusions.forEach((item: string) => {
        y = checkPageBreak(doc, y, 8);
        doc.setTextColor(...COLORS.red).setFont("helvetica", "bold").text("x", 18, y + 4);
        doc.setTextColor(...COLORS.darkText).setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(item, pageWidth - 40);
        doc.text(lines, 26, y + 4);
        y += lines.length * 5 + 2;
      });
      y += 8;
    }

    if (thingsToCarry.length > 0) {
      y = checkPageBreak(doc, y, 20);
      y = drawSectionHeader(doc, "THINGS TO CARRY", y);
      doc.setFontSize(9);
      const colWidth = (pageWidth - 28) / 2;
      thingsToCarry.forEach((item: string, i: number) => {
        if (i % 2 === 0) y = checkPageBreak(doc, y, 7);
        const cx = i % 2 === 0 ? 18 : 14 + colWidth;
        doc.setTextColor(...COLORS.orange).setFont("helvetica", "bold").text(">", cx, y + 4);
        doc.setTextColor(...COLORS.darkText).setFont("helvetica", "normal");
        doc.text(doc.splitTextToSize(item, colWidth - 14)[0] || item, cx + 6, y + 4);
        if (i % 2 === 1) y += 7;
      });
      if (thingsToCarry.length % 2 !== 0) y += 7;
      y += 12;
    }

    // Gallery
    const validGallery = galleryImages.filter((img): img is string => !!img);
    if (validGallery.length > 0) {
      y = checkPageBreak(doc, y, 60);
      y = drawSectionHeader(doc, "TRIP GALLERY", y);
      y += 5;
      const imgW = (pageWidth - 28 - 15) / 4;
      const imgH = 30;
      validGallery.forEach((img, i) => {
        const ix = 14 + i * (imgW + 5);
        try { doc.addImage(img, "JPEG", ix, y, imgW, imgH, undefined, "FAST"); } catch { /* skip */ }
      });
      y += imgH + 10;
    }
  }
  return y;
}

function drawEssentialInfoAndContact(doc: jsPDF, data: ItineraryBookingData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.addPage();
  const startY = 20;
  let y = startY;

  const logistics = [
    { label: "Meeting Point", value: data.meetingPoint },
    { label: "Meeting Time", value: data.meetingTime },
    { label: "Drop-off Time", value: data.dropoffTime },
    { label: "Network/WiFi", value: data.networkConnectivity },
    { label: "Last ATM", value: data.lastAtm },
    { label: "Fitness Requirement", value: data.fitnessRequirement },
    { label: "Age Range", value: data.ageRange || (data.minAge ? `${data.minAge}+` : null) },
  ].filter((l): l is { label: string; value: string } => !!l.value);

  if (logistics.length > 0) {
    y = drawSectionHeader(doc, "ESSENTIAL INFORMATION", y);
    y += 2;
    autoTable(doc, {
      startY: y, head: [["", ""]], body: logistics.map((l) => [l.label, l.value]), theme: "plain", showHead: false,
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 } },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 50, textColor: COLORS.navy }, 1: { textColor: COLORS.darkText } },
      alternateRowStyles: { fillColor: COLORS.warmGray },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY ?? y;
  }

  if (data.cancellationPolicy) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "CANCELLATION POLICY", y);
    doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(...COLORS.mutedText);
    const policyLines = doc.splitTextToSize(data.cancellationPolicy, pageWidth - 28);
    for (const line of policyLines) {
      y = checkPageBreak(doc, y, 5);
      doc.text(line, 14, y + 3);
      y += 4;
    }
    y += 8;
  }

  y = checkPageBreak(doc, y, 60);
  doc.setFillColor(...COLORS.teal).roundedRect(14, y, pageWidth - 28, 50, 4, 4, "F");
  doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(...COLORS.white);
  doc.text("Ready to Book Your Adventure?", pageWidth / 2, y + 13, { align: "center" });
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text(`Email: ${data.company.email}   |   Phone: ${data.company.phone}`, pageWidth / 2, y + 23, { align: "center" });
  doc.text(`Website: ${data.company.website}`, pageWidth / 2, y + 31, { align: "center" });
  doc.setFontSize(8).text("Instagram: @param.adventures  |  YouTube: @ParamAdventures", pageWidth / 2, y + 40, { align: "center" });

  y += 58;
  doc.setFontSize(7).setTextColor(...COLORS.mutedText);
  doc.text(`© ${new Date().getFullYear()} ${data.company.name}. All rights reserved.`, pageWidth / 2, y + 4, { align: "center", maxWidth: pageWidth - 28 });
}

// ─── Component ───────────────────────────────────────────

interface DownloadItineraryBtnProps {
  readonly slug: string;
  readonly variant?: "sidebar" | "inline" | "success";
}

export default function DownloadItineraryBtn({
  slug,
  variant = "sidebar",
}: DownloadItineraryBtnProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function generatePDF() {
    setIsGenerating(true);
    try {
      const resp = await fetch(`/api/experiences/${slug}/itinerary-data`);
      if (!resp.ok) throw new Error("Fetch failed");
      const data = await resp.json();

      const [logo, cover, ...gallery] = await Promise.all([
        fetchImageAsBase64(`${globalThis.location.origin}/param-logo.png`),
        data.coverImage ? fetchImageAsBase64(data.coverImage) : null,
        ...(data.images || []).slice(0, 4).map((img: string) => fetchImageAsBase64(img)),
      ]);

      const doc = new jsPDF("p", "mm", "a4");
      
      drawCoverPage(doc, data, logo, cover);
      let y = 20;
      doc.addPage();
      y = drawStatsOverview(doc, data, y);
      y = drawHighlightsAndAbout(doc, data, y);
      y = drawItinerary(doc, data, y);
      drawInclusionsExclusionsPacking(doc, data, gallery, y);
      drawEssentialInfoAndContact(doc, data);

      const total = doc.getNumberOfPages();
      for (let i = 2; i <= total; i++) {
        doc.setPage(i);
        addPageFooter(doc, i - 1, total - 1);
      }

      const safeName = data.title.replaceAll(/[^a-zA-Z0-9]/g, "_");
      doc.save(`${safeName}_Itinerary_Param_Adventures.pdf`);
    } catch (e) {
      console.error("PDF Fail", e);
      alert("Error generating PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  const isLoadingVariant = isGenerating ? (
    <>
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>{variant === "inline" ? "Generating…" : "Generating Itinerary…"}</span>
    </>
  ) : null;

  if (variant === "success") {
    return (
      <button type="button" onClick={generatePDF} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 transition-all rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50">
        {isLoadingVariant || <><FileDown className="w-5 h-5" />Download Trip Itinerary (PDF)</>}
      </button>
    );
  }

  if (variant === "inline") {
    return (
      <button type="button" onClick={generatePDF} disabled={isGenerating} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50">
        {isLoadingVariant || <><Download className="w-4 h-4" />Download Itinerary</>}
      </button>
    );
  }

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <button type="button" onClick={generatePDF} disabled={isGenerating} className="w-full flex items-center justify-center gap-2.5 px-5 py-3 bg-gradient-to-r from-primary/90 to-primary text-primary-foreground hover:from-primary hover:to-primary/90 transition-all rounded-xl font-semibold shadow-md hover:shadow-lg disabled:opacity-60">
        {isLoadingVariant || <><FileDown className="w-5 h-5" /><span>Download Itinerary</span></>}
      </button>
      <p className="text-xs text-foreground/40 text-center mt-2">Get the complete trip details as a PDF</p>
    </div>
  );
}
