"use client";

import { useState } from "react";
import { Download, Loader2, FileDown, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/lib/AuthContext";
import { getPlainTextFromJSON } from "@/lib/utils/rich-text";

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
  lightTeal: [230, 250, 248] as [number, number, number],   // #E6FAF8
  softGray: [248, 248, 250] as [number, number, number],    // #F8F8FA
  paleGreen: [236, 253, 243] as [number, number, number],   // #ECFDF3
  paleRed: [254, 242, 242] as [number, number, number],     // #FEF2F2
};

interface ItineraryBookingData {
  title: string;
  slug: string;
  basePrice: number;
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
    description?: string | object;
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
  fitnessRequirement?: string;
  ageRange?: string;
  minAge?: number | null;
  cancellationPolicy?: string;
  categories?: string[];
  vibeTags?: string[];
  pickupPoints?: string[];
  dropPoints?: string[];
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

function cleanTextForPdf(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "-")
    .replace(/[^\x00-\x7F]/g, "") // Strip emojis/non-ASCII characters
    .replace(/[ \t]+/g, " ")     // Collapse duplicate spaces
    .trim();
}

function drawSocialButton(doc: jsPDF, label: string, url: string, x: number, y: number, color: [number, number, number], iconType: "fb" | "insta" | "yt" | "wa") {
  const w = 32;
  const h = 8;
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");
  
  doc.setDrawColor(255, 255, 255);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.4);
  
  const ix = x + 3;
  const iy = y + 2.25;
  
  if (iconType === "fb") {
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(255, 255, 255);
    doc.text("f", ix + 1.2, iy + 3.8);
  } else if (iconType === "insta") {
    doc.roundedRect(ix, iy, 3.5, 3.5, 0.8, 0.8, "D");
    doc.circle(ix + 1.75, iy + 1.75, 0.8, "D");
    doc.circle(ix + 2.7, iy + 0.8, 0.15, "F");
  } else if (iconType === "yt") {
    doc.triangle(ix, iy, ix, iy + 3.2, ix + 3, iy + 1.6, "F");
  } else if (iconType === "wa") {
    doc.circle(ix + 1.6, iy + 1.6, 1.4, "D");
    doc.triangle(ix + 0.6, iy + 2.6, ix + 0.2, iy + 3.1, ix + 1.1, iy + 2.8, "F");
  }
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(label, x + 7 + (w - 7) / 2, y + 5.5, { align: "center" });
  doc.link(x, y, w, h, { url });
}

function addPageHeader(doc: jsPDF, data: ItineraryBookingData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Orange accent dot
  doc.setFillColor(...COLORS.orange);
  doc.circle(16, 8, 1.2, "F");
  
  // Brand name
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.navy);
  doc.text("PARAM ADVENTURES", 19, 9);
  
  // Subtle divider line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.line(14, 12, pageWidth - 14, 12);
  
  // Book Online tab
  const tabW = 26;
  const tabH = 5.5;
  const tabX = pageWidth - 14 - tabW;
  const tabY = 5;
  
  doc.setFillColor(...COLORS.orange);
  doc.roundedRect(tabX, tabY, tabW, tabH, 1.5, 1.5, "F");
  
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("BOOK ONLINE", tabX + tabW / 2, tabY + 3.8, { align: "center" });
  
  const bookingUrl = globalThis.window === undefined ? `https://www.paramadventures.in/experiences/${data.slug}` : `${globalThis.window.location.origin}/experiences/${data.slug}`;
  doc.link(tabX, tabY, tabW, tabH, { url: bookingUrl });
}

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(...COLORS.orange);
  doc.rect(0, pageHeight - 12, pageWidth, 12, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.white);
  doc.text("www.paramadventures.in", 14, pageHeight - 4.5);
  doc.link(14, pageHeight - 8, 35, 8, { url: "https://www.paramadventures.in" });
  doc.text(
    `Page ${pageNum} of ${totalPages}`,
    pageWidth - 14,
    pageHeight - 4.5,
    { align: "right" }
  );
}

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  // Teal accent bar
  doc.setFillColor(...COLORS.teal);
  doc.roundedRect(14, y, 4, 10, 1, 1, "F");
  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.navy);
  doc.text(title, 22, y + 7.5);
  // Light divider line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(14, y + 13, pageWidth - 14, y + 13);
  // Orange accent underline (partial)
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.8);
  doc.line(14, y + 13.8, 55, y + 13.8);
  return y + 19;
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

  // Orange accent stripe
  doc.setFillColor(...COLORS.orange);
  doc.rect(0, pageHeight * 0.58, pageWidth, 3, "F");

  // Logo + Company block
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 14, pageHeight * 0.62, 22, 22);
  }
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.orange);
  doc.text("PARAM ADVENTURES", 40, pageHeight * 0.62 + 10);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Your Gateway to Unforgettable Experiences", 40, pageHeight * 0.62 + 16);

  // Decorative thin separator
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.3);
  doc.line(14, pageHeight * 0.7, pageWidth - 14, pageHeight * 0.7);

  // Title
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  const titleLines = doc.splitTextToSize(cleanTextForPdf(data.title).toUpperCase(), pageWidth - 28);
  doc.text(titleLines, 14, pageHeight * 0.74);

  // Pill badges for metadata
  const badgeY = pageHeight * 0.74 + titleLines.length * 11 + 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  let pillX = 14;
  const pills = [
    cleanTextForPdf(data.location),
    `${data.durationDays}D / ${Math.max(data.durationDays - 1, 0)}N`,
  ];
  if (data.difficulty) {
    pills.push(cleanTextForPdf(data.difficulty).charAt(0) + cleanTextForPdf(data.difficulty).slice(1).toLowerCase());
  }
  pills.forEach((label) => {
    const tw = doc.getTextWidth(label) + 12;
    doc.setFillColor(...COLORS.orange);
    doc.roundedRect(pillX, badgeY - 4.5, tw, 9, 4.5, 4.5, "F");
    doc.setTextColor(...COLORS.white);
    doc.text(label, pillX + 6, badgeY + 1.5);
    pillX += tw + 4;
  });

  // Category tags as outlined pills
  let tagRowY = badgeY + 12;
  if (data.categories && data.categories.length > 0) {
    let catX = 14;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    data.categories.forEach((cat) => {
      const catText = cleanTextForPdf(cat);
      const tw = doc.getTextWidth(catText) + 8;
      if (catX + tw > pageWidth - 14) { catX = 14; tagRowY += 9; }
      doc.setDrawColor(120, 120, 140);
      doc.setLineWidth(0.3);
      doc.roundedRect(catX, tagRowY - 3.5, tw, 7, 3.5, 3.5, "D");
      doc.setTextColor(180, 180, 200);
      doc.text(catText, catX + 4, tagRowY + 1);
      catX += tw + 3;
    });
    tagRowY += 9;
  }

  // Vibe tags as teal outlined pills
  if (data.vibeTags && data.vibeTags.length > 0) {
    let vibeX = 14;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    data.vibeTags.forEach((tag) => {
      const tagText = cleanTextForPdf(tag);
      const tw = doc.getTextWidth(tagText) + 8;
      if (vibeX + tw > pageWidth - 14) { vibeX = 14; tagRowY += 9; }
      doc.setDrawColor(...COLORS.teal);
      doc.setLineWidth(0.3);
      doc.roundedRect(vibeX, tagRowY - 3.5, tw, 7, 3.5, 3.5, "D");
      doc.setTextColor(...COLORS.teal);
      doc.text(tagText, vibeX + 4, tagRowY + 1);
      vibeX += tw + 3;
    });
  }

  // Footer badge
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.mutedText);
  doc.text("DETAILED TRIP ITINERARY", pageWidth / 2, pageHeight - 18, { align: "center" });

  doc.setFillColor(...COLORS.orange);
  doc.rect(0, pageHeight - 8, pageWidth, 8, "F");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.white);
  doc.text(cleanTextForPdf(data.company?.website ?? ""), pageWidth / 2, pageHeight - 3, { align: "center" });
}

function drawStatsOverview(doc: jsPDF, data: ItineraryBookingData, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  y = drawSectionHeader(doc, "TRIP AT A GLANCE", y);
  y += 2;

  const stats = [
    { label: "Duration", value: `${data.durationDays} Days / ${Math.max(data.durationDays - 1, 0)} Nights` },
    { label: "Max Altitude", value: data.maxAltitude || "N/A" },
    { label: "Total Distance (Both Ways)", value: data.trekDistance || "N/A" },
    { label: "Difficulty", value: data.difficulty ? data.difficulty.charAt(0) + data.difficulty.slice(1).toLowerCase() : "N/A" },
    { label: "Best Season", value: data.bestTimeToVisit || "Year Round" },
    { label: "Group Size", value: data.maxGroupSize ? `Max ${data.maxGroupSize}` : "N/A" },
  ];

  const cardW = (pageWidth - 28 - 10) / 2;
  const cardH = 22;

  stats.forEach((stat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 14 + col * (cardW + 10);
    const cy = y + row * (cardH + 6);

    // Card background
    doc.setFillColor(...COLORS.lightOrange);
    doc.roundedRect(cx, cy, cardW, cardH, 3, 3, "F");

    // Left accent bar (alternating teal/orange)
    const accentColor = i % 2 === 0 ? COLORS.teal : COLORS.orange;
    doc.setFillColor(...accentColor);
    doc.roundedRect(cx, cy, 3, cardH, 1.5, 1.5, "F");

    // Label (uppercase)
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.mutedText);
    doc.text(stat.label.toUpperCase(), cx + 8, cy + 8);

    // Value
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text(cleanTextForPdf(stat.value), cx + 8, cy + 17);
  });

  const startY = y + Math.ceil(stats.length / 2) * (cardH + 6) + 4;
  const bannerW = pageWidth - 28;
  const bannerH = 14;
  
  // Draw banner background
  doc.setFillColor(...COLORS.lightOrange);
  doc.roundedRect(14, startY, bannerW, bannerH, 3, 3, "F");
  
  // Draw border
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, startY, bannerW, bannerH, 3, 3, "D");
  
  // Draw Text
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.navy);
  doc.text("Booking Amount:", 20, startY + 9);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.orange);
  const priceVal = data.basePrice ? `INR ${data.basePrice.toLocaleString("en-IN")}` : "On Request";
  doc.text(priceVal, 50, startY + 9.5);
  
  // Draw link
  const linkX = pageWidth - 60;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.teal);
  doc.text("Book Now (Click Here)", linkX, startY + 9);
  
  // Draw underline for the link
  const textWidth = doc.getTextWidth("Book Now (Click Here)");
  doc.setDrawColor(...COLORS.teal);
  doc.line(linkX, startY + 10, linkX + textWidth, startY + 10);
  
  // Add active link hotspot
  const bookingUrl = globalThis.window === undefined ? `https://www.paramadventures.in/experiences/${data.slug}` : `${globalThis.window.location.origin}/experiences/${data.slug}`;
  doc.link(linkX, startY, textWidth, bannerH, { url: bookingUrl });
  
  return startY + bannerH + 10;
}

function drawHighlightsAndAbout(doc: jsPDF, data: ItineraryBookingData, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  if (data.highlights && data.highlights.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "HIGHLIGHTS", y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    data.highlights.forEach((h: string) => {
      y = checkPageBreak(doc, y, 9);
      // Filled green dot
      doc.setFillColor(...COLORS.green);
      doc.circle(19, y + 3, 1.8, "F");
      // White check mark inside dot
      doc.setFontSize(5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.white);
      doc.text("*", 18.2, y + 4.2);
      // Text
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.darkText);
      const lines = doc.splitTextToSize(cleanTextForPdf(h), pageWidth - 40);
      doc.text(lines, 26, y + 4);
      y += lines.length * 5 + 4;
    });
    y += 6;
  }

  if (data.description) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "ABOUT THE EXPERIENCE", y);
    // Subtle container background
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.darkText);
    const descLines = doc.splitTextToSize(cleanTextForPdf(data.description), pageWidth - 36);
    const containerH = descLines.length * 5 + 10;
    y = checkPageBreak(doc, y, containerH);
    doc.setFillColor(...COLORS.softGray);
    doc.roundedRect(14, y, pageWidth - 28, containerH, 3, 3, "F");
    // Left teal accent on container
    doc.setFillColor(...COLORS.teal);
    doc.roundedRect(14, y, 2.5, containerH, 1, 1, "F");
    let textY = y + 6;
    for (const line of descLines) {
      doc.text(line, 22, textY);
      textY += 5;
    }
    y += containerH + 8;
  }
  return y;
}

function drawItinerary(doc: jsPDF, data: ItineraryBookingData, y: number): number {
  if (!Array.isArray(data.itinerary) || data.itinerary.length === 0) return y;

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.addPage();
  y = 20;
  y = drawSectionHeader(doc, "DAY-BY-DAY ITINERARY", y);
  y += 4;

  data.itinerary.forEach((day, index) => {
    const dayNum = index + 1;
    const plainDesc = getPlainTextFromJSON(day.description);
    const descLen = plainDesc.length;
    const neededHeight = 40 + (descLen / 4);
    y = checkPageBreak(doc, y, neededHeight);

    const blockStartY = y;

    // Light background behind content area
    doc.setFillColor(...COLORS.softGray);
    doc.roundedRect(28, y - 1, pageWidth - 42, neededHeight - 6, 3, 3, "F");

    // Day number circle
    doc.setFillColor(...COLORS.orange);
    doc.circle(22, y + 6, 5.5, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(`D${dayNum}`, 22, y + 7.5, { align: "center" });

    // Day title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text(cleanTextForPdf(day.title || `Day ${dayNum}`), 32, y + 8);

    if (plainDesc) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.darkText);
      const dayDescLines = doc.splitTextToSize(cleanTextForPdf(plainDesc), pageWidth - 48);
      doc.text(dayDescLines, 32, y + 15);
      y += 15 + dayDescLines.length * 4.8;
    } else {
      y += 16;
    }

    // Chip-style meals and accommodation tags
    if (day.meals || day.accommodation) {
      y += 2;
      let chipX = 32;
      if (day.meals) {
        const mealsStr = Array.isArray(day.meals) ? day.meals.join(", ") : (day.meals || "");
        const mealsText = `Meals: ${cleanTextForPdf(mealsStr)}`;
        doc.setFontSize(7);
        const chipW = doc.getTextWidth(mealsText) + 8;
        doc.setFillColor(...COLORS.lightTeal);
        doc.roundedRect(chipX, y - 3, chipW, 7, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.teal);
        doc.text(mealsText, chipX + 4, y + 1.5);
        chipX += chipW + 4;
      }
      if (day.accommodation) {
        const stayText = `Stay: ${cleanTextForPdf(day.accommodation)}`;
        doc.setFontSize(7);
        const chipW = doc.getTextWidth(stayText) + 8;
        doc.setFillColor(...COLORS.lightOrange);
        doc.roundedRect(chipX, y - 3, chipW, 7, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.orange);
        doc.text(stayText, chipX + 4, y + 1.5);
      }
      y += 8;
    }

    y += 4;

    // Vertical timeline line connecting to next day
    if (index < (data.itinerary?.length ?? 0) - 1) {
      doc.setDrawColor(220, 220, 225);
      doc.setLineWidth(0.6);
      doc.line(22, blockStartY + 12, 22, y);
    }

    // Subtle separator
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.15);
    doc.line(32, y, pageWidth - 14, y);
    y += 8;
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
      inclusions.forEach((item: string, i: number) => {
        y = checkPageBreak(doc, y, 9);
        // Zebra stripe
        if (i % 2 === 0) {
          doc.setFillColor(...COLORS.paleGreen);
          doc.rect(14, y - 1, pageWidth - 28, 8, "F");
        }
        // Filled green dot
        doc.setFillColor(...COLORS.green);
        doc.circle(19, y + 3, 1.8, "F");
        // Text
        doc.setTextColor(...COLORS.darkText).setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(cleanTextForPdf(item), pageWidth - 40);
        doc.text(lines, 26, y + 4);
        y += lines.length * 5 + 3;
      });
      y += 10;
    }

    if (exclusions.length > 0) {
      y = checkPageBreak(doc, y, 20);
      y = drawSectionHeader(doc, "WHAT'S NOT INCLUDED", y);
      doc.setFontSize(9);
      exclusions.forEach((item: string, i: number) => {
        y = checkPageBreak(doc, y, 9);
        // Zebra stripe
        if (i % 2 === 0) {
          doc.setFillColor(...COLORS.paleRed);
          doc.rect(14, y - 1, pageWidth - 28, 8, "F");
        }
        // Filled red dot
        doc.setFillColor(...COLORS.red);
        doc.circle(19, y + 3, 1.8, "F");
        // Text
        doc.setTextColor(...COLORS.darkText).setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(cleanTextForPdf(item), pageWidth - 40);
        doc.text(lines, 26, y + 4);
        y += lines.length * 5 + 3;
      });
      y += 10;
    }

    if (thingsToCarry.length > 0) {
      y = checkPageBreak(doc, y, 20);
      y = drawSectionHeader(doc, "THINGS TO CARRY", y);
      doc.setFontSize(9);
      const colWidth = (pageWidth - 28) / 2;
      thingsToCarry.forEach((item: string, i: number) => {
        if (i % 2 === 0) y = checkPageBreak(doc, y, 8);
        const cx = i % 2 === 0 ? 18 : 14 + colWidth;
        // Filled orange dot
        doc.setFillColor(...COLORS.orange);
        doc.circle(cx + 2, y + 3, 1.5, "F");
        doc.setTextColor(...COLORS.darkText).setFont("helvetica", "normal");
        const cleanItem = cleanTextForPdf(item);
        doc.text(doc.splitTextToSize(cleanItem, colWidth - 14)[0] || cleanItem, cx + 8, y + 4);
        if (i % 2 === 1) y += 8;
      });
      if (thingsToCarry.length % 2 !== 0) y += 8;
      y += 12;
    }

    // Gallery with shadow effect
    const validGallery = galleryImages.filter((img): img is string => !!img);
    if (validGallery.length > 0) {
      y = checkPageBreak(doc, y, 65);
      y = drawSectionHeader(doc, "TRIP GALLERY", y);
      y += 5;
      const imgW = (pageWidth - 28 - 15) / 4;
      const imgH = 30;
      validGallery.forEach((img, i) => {
        const ix = 14 + i * (imgW + 5);
        // Shadow rect
        doc.setFillColor(220, 220, 220);
        doc.roundedRect(ix + 1, y + 1, imgW, imgH, 2, 2, "F");
        // Image
        try { doc.addImage(img, "JPEG", ix, y, imgW, imgH, undefined, "FAST"); } catch { /* skip */ }
      });
      y += imgH + 12;
    }
  }
  return y;
}

function drawRouteLogistics(doc: jsPDF, data: ItineraryBookingData, y: number, pageWidth: number): number {
  if (data.meetingPoint) {
    y = drawSectionHeader(doc, "STARTING POINT", y);
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(...COLORS.darkText);
    const pickupLines = doc.splitTextToSize(cleanTextForPdf(data.meetingPoint), pageWidth - 28);
    for (const line of pickupLines) {
      y = checkPageBreak(doc, y, 6);
      doc.text(line, 14, y + 4);
      y += 5;
    }
    y += 8;
  }

  if (data.pickupPoints && data.pickupPoints.length > 0) {
    const hasDropPoints = data.dropPoints && data.dropPoints.length > 0;
    const title = hasDropPoints ? "AVAILABLE PICKUP LOCATIONS" : "AVAILABLE PICKUP & DROP LOCATIONS";
    y = drawSectionHeader(doc, title, y);
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(...COLORS.darkText);
    for (const point of data.pickupPoints) {
      y = checkPageBreak(doc, y, 6);
      doc.setFillColor(...COLORS.orange);
      doc.circle(16, y + 3.5, 1, "F");
      doc.text(cleanTextForPdf(point), 20, y + 4);
      y += 6;
    }
    y += 8;
  }

  if (data.dropPoints && data.dropPoints.length > 0) {
    y = drawSectionHeader(doc, "AVAILABLE DROP-OFF LOCATIONS", y);
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(...COLORS.darkText);
    for (const point of data.dropPoints) {
      y = checkPageBreak(doc, y, 6);
      doc.setFillColor(...COLORS.orange);
      doc.circle(16, y + 3.5, 1, "F");
      doc.text(cleanTextForPdf(point), 20, y + 4);
      y += 6;
    }
    y += 8;
  }

  return y;
}

function drawEssentialInfoTable(doc: jsPDF, data: ItineraryBookingData, y: number): number {
  const logistics = [
    { label: "Starting Time", value: cleanTextForPdf(data.meetingTime) },
    { label: "Drop-off Time", value: cleanTextForPdf(data.dropoffTime) },
    { label: "Network/WiFi", value: cleanTextForPdf(data.networkConnectivity) },
    { label: "Fitness Requirement", value: cleanTextForPdf(data.fitnessRequirement) },
    { label: "Age Range", value: cleanTextForPdf(data.ageRange || (data.minAge ? `${data.minAge}+` : null)) },
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
  return y;
}

function parseCancellationPolicy(cancellationPolicy: string | null | undefined): {
  policyTemplate: string;
  policyText: string;
} {
  if (!cancellationPolicy) {
    return { policyTemplate: "custom", policyText: "" };
  }
  try {
    const parsed = JSON.parse(cancellationPolicy);
    if (parsed && typeof parsed === "object" && "template" in parsed) {
      return {
        policyTemplate: String(parsed.template || "custom"),
        policyText: String(parsed.text || ""),
      };
    }
  } catch {
    // ignore
  }
  return { policyTemplate: "custom", policyText: cancellationPolicy };
}

function drawPolicyLines(doc: jsPDF, text: string, y: number, pageWidth: number): number {
  doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(...COLORS.mutedText);
  const policyLines = doc.splitTextToSize(cleanTextForPdf(text), pageWidth - 28);
  let currentY = y;
  for (const line of policyLines) {
    currentY = checkPageBreak(doc, currentY, 5);
    doc.text(line, 14, currentY + 3);
    currentY += 4;
  }
  return currentY;
}

function drawPDFCancellationPolicy(doc: jsPDF, data: ItineraryBookingData, y: number, pageWidth: number): number {
  if (!data.cancellationPolicy) return y;

  const { policyTemplate, policyText } = parseCancellationPolicy(data.cancellationPolicy);

  const isTemplate =
    policyTemplate === "one_two_days" ||
    policyTemplate === "multi_days" ||
    policyTemplate === "international";

  if (isTemplate) {
    y = checkPageBreak(doc, y, 40);
    y = drawSectionHeader(doc, "CANCELLATION POLICY", y);

    const templates = {
      one_two_days: {
        title: "One- & Two-Days Treks or Trips Policy",
        headers: ["Policy", "21 days Prior", "20-16 days", "15-6 days", "5-0 days"],
        rows: [
          ["Batch Shifting", "Yes", "Yes", "No", "No"],
          ["Cancellation Charge", "Free Cancellation", "25% of Trip", "50% of Trip", "100% of Trip"],
          ["Booking Amount", "Refunded original mode", "Adjusted in Refund", "Adjusted in Refund", "No Refund"],
          ["Remaining Amount", "Full Refund (5% fee)", "Refund minus 25%", "Refund minus 50%", "No Refund"]
        ]
      },
      multi_days: {
        title: "Multiple Days Treks or Trips Policy",
        headers: ["Policy", "46 days Prior", "45-31 days", "30-21 days", "20-0 days"],
        rows: [
          ["Batch Shifting", "Yes", "No", "No", "No"],
          ["Cancellation Charge", "Free Cancellation", "50% of Trip", "75% of Trip", "100% of Trip"],
          ["Booking Amount", "Refunded original mode", "Adjusted in Refund", "Adjusted in Refund", "No Refund"],
          ["Remaining Amount", "Full Refund (5% fee)", "Refund minus 50%", "Refund minus 75%", "No Refund"]
        ]
      },
      international: {
        title: "International Treks & Trips Policy",
        headers: ["Policy", "61 days Prior", "60-46 days", "45-31 days", "30-0 days"],
        rows: [
          ["Batch Shifting", "Yes", "No", "No", "No"],
          ["Cancellation Charge", "Free Cancellation", "50% of Trip", "75% of Trip", "100% of Trip"],
          ["Booking Amount", "Refunded original mode", "Adjusted in Refund", "Adjusted in Refund", "No Refund"],
          ["Remaining Amount", "Full Refund (10% fee)", "Refund minus 50%", "Refund minus 75%", "No Refund"]
        ]
      }
    };

    const t = templates[policyTemplate];
    
    doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(...COLORS.navy);
    doc.text(t.title, 14, y + 4);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [t.headers],
      body: t.rows,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: COLORS.teal, textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY ?? y;
    y += 8;

    if (policyText) {
      y = checkPageBreak(doc, y, 20);
      y = drawPolicyLines(doc, policyText, y, pageWidth);
      y += 8;
    }
  } else if (policyText) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "CANCELLATION POLICY", y);
    y = drawPolicyLines(doc, policyText, y, pageWidth);
    y += 8;
  }
  return y;
}

function drawContactFooterBox(doc: jsPDF, data: ItineraryBookingData, y: number, pageWidth: number): void {
  y = checkPageBreak(doc, y, 60);
  doc.setFillColor(...COLORS.teal).roundedRect(14, y, pageWidth - 28, 50, 4, 4, "F");
  doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(...COLORS.white);
  doc.text("Ready to Book Your Adventure?", pageWidth / 2, y + 13, { align: "center" });
  doc.setFontSize(9).setFont("helvetica", "normal");
  
  const emailText = `Email: ${cleanTextForPdf(data.company?.email ?? "")}`;
  const phoneText = `Phone: ${cleanTextForPdf(data.company?.phone ?? "")}`;
  const contactText = `${emailText}   |   ${phoneText}`;
  doc.text(contactText, pageWidth / 2, y + 23, { align: "center" });
  
  const webText = `Website: ${cleanTextForPdf(data.company?.website ?? "")}`;
  doc.text(webText, pageWidth / 2, y + 31, { align: "center" });

  // Add click links to email/website
  const totalContactWidth = doc.getTextWidth(contactText);
  const startEmailX = (pageWidth - totalContactWidth) / 2;
  const emailWidth = doc.getTextWidth(emailText);
  doc.link(startEmailX, y + 19, emailWidth, 6, { url: `mailto:${data.company?.email || "booking@paramadventures.in"}` });

  const webWidth = doc.getTextWidth(webText);
  doc.link((pageWidth - webWidth) / 2, y + 27, webWidth, 6, { url: `https://${data.company?.website || "www.paramadventures.in"}` });

  // Draw clickable social buttons
  const startX = (pageWidth - 146) / 2;
  const btnY = y + 36;
  const companyPhone = data.company?.phone ?? "";
  const waPhone = companyPhone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${waPhone || "919876543210"}`;

  drawSocialButton(doc, "FACEBOOK", "https://www.facebook.com/profile.php?id=61590660992017&sk=directory_contact_info", startX, btnY, [24, 119, 242], "fb");
  drawSocialButton(doc, "INSTAGRAM", "https://www.instagram.com/param.adventures/", startX + 38, btnY, [225, 48, 108], "insta");
  drawSocialButton(doc, "YOUTUBE", "https://www.youtube.com/", startX + 76, btnY, [255, 0, 0], "yt");
  drawSocialButton(doc, "WHATSAPP", whatsappUrl, startX + 114, btnY, [37, 211, 102], "wa");

  y += 58;
  doc.setFontSize(7).setTextColor(...COLORS.mutedText);
  doc.text(`© ${new Date().getFullYear()} ${cleanTextForPdf(data.company?.name ?? "")}. All rights reserved.`, pageWidth / 2, y + 4, { align: "center", maxWidth: pageWidth - 28 });
}

function drawEssentialInfoAndContact(doc: jsPDF, data: ItineraryBookingData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.addPage();
  const startY = 20;
  let y = startY;

  y = drawRouteLogistics(doc, data, y, pageWidth);
  y = drawEssentialInfoTable(doc, data, y);
  y = drawPDFCancellationPolicy(doc, data, y, pageWidth);
  drawContactFooterBox(doc, data, y, pageWidth);
}

function drawWhyParamAdventures(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.addPage();
  
  let y = 20;
  y = drawSectionHeader(doc, "WHY PARAM ADVENTURES?", y);
  y += 5;

  const reasons = [
    {
      title: "Your Happiness & Safety is Our Reward",
      description: "With over 5 years of expertise in Himalayan, Western Ghats, and Sahyadri treks, Spiritual tours, Holiday Packages and more. We ensure every journey is safe, well-planned, and memorable."
    },
    {
      title: "Inclusive for Everyone",
      description: "Whether you're a kid, adult, solo traveler, family, group of friends, or corporate team—we design experiences for all."
    },
    {
      title: "Certified & Experienced Leaders",
      description: "Our trek and trip leaders are trained professionals and certified first responders, ensuring you're always in safe hands."
    },
    {
      title: "Women-Friendly & Safe Environment",
      description: "We prioritize safety for women travelers and have dedicated female trek and trip leaders on trips."
    },
    {
      title: "Zero Tolerance for Smoking & Alcohol",
      description: "We promote clean, responsible, and mindful travel experiences."
    },
    {
      title: "Eco-Conscious Adventures",
      description: "“Leave No Trace” is our mantra—we strictly avoid plastic and protect nature at every step."
    },
    {
      title: "Budget-Friendly Without Compromise",
      description: "Quality experiences at affordable prices—because adventure should be accessible to everyone."
    },
    {
      title: "Personalized Attention",
      description: "We focus on small group sizes to ensure every participant gets individual care and guidance."
    },
    {
      title: "Local Expertise & Hidden Gems",
      description: "Discover offbeat trails and unexplored locations that typical tourists miss."
    },
    {
      title: "Community & Connection",
      description: "Meet like-minded adventurers, build friendships, and create unforgettable memories together."
    },
    {
      title: "Well-Planned Itineraries",
      description: "Every trip is thoughtfully curated to balance adventure, relaxation, and exploration."
    },
    {
      title: "Emergency Preparedness",
      description: "We are equipped with first-aid kits, safety protocols, and backup plans for all situations."
    },
    {
      title: "Authentic Experiences",
      description: "From local culture to regional food, we give you a real taste of every destination."
    },
    {
      title: "Customer-Centric Approach",
      description: "Your comfort, feedback, and experience matter—we continuously improve based on your needs."
    }
  ];

  const colWidth = (pageWidth - 28 - 6) / 2;
  const leftX = 14;
  const rightX = leftX + colWidth + 6;

  reasons.forEach((reason, index) => {
    const isEven = index % 2 === 0;
    const x = isEven ? leftX : rightX;
    const row = Math.floor(index / 2);
    const itemY = y + row * 31.5;

    // Background card (soft orange tint)
    doc.setFillColor(...COLORS.lightOrange);
    doc.roundedRect(x, itemY, colWidth, 27, 2, 2, "F");

    // Primary accent line on the left side of the card
    doc.setFillColor(...COLORS.orange);
    doc.rect(x, itemY, 1.2, 27, "F");

    // Title
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold").setTextColor(...COLORS.navy);
    doc.text(cleanTextForPdf(reason.title), x + 4, itemY + 5, { maxWidth: colWidth - 8 });

    // Description
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal").setTextColor(...COLORS.darkText);
    const lines = doc.splitTextToSize(cleanTextForPdf(reason.description), colWidth - 8);
    doc.text(lines, x + 4, itemY + 10, { maxWidth: colWidth - 8 });
  });
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
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [otherSource, setOtherSource] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadError, setLeadError] = useState("");

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
      drawWhyParamAdventures(doc);
      drawEssentialInfoAndContact(doc, data);

      const total = doc.getNumberOfPages();
      for (let i = 2; i <= total; i++) {
        doc.setPage(i);
        addPageHeader(doc, data);
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

  const handleButtonClick = () => {
    if (user) {
      generatePDF();
    } else {
      setShowLeadModal(true);
    }
  };

  async function handleLeadSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmittingLead(true);
    setLeadError("");

    if (leadPhone.trim().length < 10) {
      setLeadError("Phone number must be at least 10 digits");
      setIsSubmittingLead(false);
      return;
    }

    try {
      const finalSource = referralSource === "Other" ? `Other (${otherSource.trim()})` : referralSource;
      const requirementsStr = `Referral Source: ${finalSource}`;

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName.trim(),
          email: leadEmail.trim(),
          phone: leadPhone.trim(),
          requirements: requirementsStr,
          source: `ITINERARY_DOWNLOAD: ${slug}`,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to submit request.");
      }

      // Close modal and reset fields
      setShowLeadModal(false);
      setLeadName("");
      setLeadEmail("");
      setLeadPhone("");
      setReferralSource("");
      setOtherSource("");

      // Download the PDF
      await generatePDF();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setLeadError(message);
    } finally {
      setIsSubmittingLead(false);
    }
  }

  const isLoadingVariant = isGenerating ? (
    <>
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>{variant === "inline" ? "Generating…" : "Generating Itinerary…"}</span>
    </>
  ) : null;

  const renderModal = () => {
    if (!showLeadModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Get Trip Itinerary</h3>
              <p className="text-foreground/50 text-xs mt-0.5">Please share a few details to download the PDF</p>
            </div>
            <button
              type="button"
              onClick={() => setShowLeadModal(false)}
              className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground/45 hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLeadSubmit} className="p-6 space-y-4">
            {leadError && (
              <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-xs font-medium">
                {leadError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="lead-name" className="text-xs font-bold text-foreground/60">
                Full Name
              </label>
              <input
                id="lead-name"
                type="text"
                required
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="lead-email" className="text-xs font-bold text-foreground/60">
                Email Address
              </label>
              <input
                id="lead-email"
                type="email"
                required
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="lead-phone" className="text-xs font-bold text-foreground/60">
                Phone Number
              </label>
              <input
                id="lead-phone"
                type="tel"
                required
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="lead-referral" className="text-xs font-bold text-foreground/60">
                How did you hear about us?
              </label>
              <select
                id="lead-referral"
                required
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
              >
                <option value="" disabled>Select an option</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="Friends">Friends / Word of mouth</option>
                <option value="YouTube">YouTube</option>
                <option value="Search Engine">Search Engine (Google, etc.)</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {referralSource === "Other" && (
              <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                <label htmlFor="lead-other" className="text-xs font-bold text-foreground/60">
                  Please specify (Source)
                </label>
                <input
                  id="lead-other"
                  type="text"
                  required
                  value={otherSource}
                  onChange={(e) => setOtherSource(e.target.value)}
                  placeholder="e.g. Google Search, Billboard"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingLead}
              className="w-full py-3 mt-2 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmittingLead ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit & Download Itinerary</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  };

  if (variant === "success") {
    return (
      <>
        <button type="button" onClick={handleButtonClick} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 transition-all rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50">
          {isLoadingVariant || <><FileDown className="w-5 h-5" />Download Trip Itinerary (PDF)</>}
        </button>
        {renderModal()}
      </>
    );
  }

  if (variant === "inline") {
    return (
      <>
        <button type="button" onClick={handleButtonClick} disabled={isGenerating} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50">
          {isLoadingVariant || <><Download className="w-4 h-4" />Download Itinerary</>}
        </button>
        {renderModal()}
      </>
    );
  }

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <button type="button" onClick={handleButtonClick} disabled={isGenerating} className="w-full flex items-center justify-center gap-2.5 px-5 py-3 border border-border bg-card hover:bg-accent/10 text-foreground hover:text-primary transition-all rounded-xl font-semibold shadow-sm disabled:opacity-60">
        {isLoadingVariant || <><FileDown className="w-5 h-5 text-primary" /><span>Download Itinerary</span></>}
      </button>
      <p className="text-xs text-foreground/40 text-center mt-2">Get the complete trip details as a PDF</p>
      {renderModal()}
    </div>
  );
}
