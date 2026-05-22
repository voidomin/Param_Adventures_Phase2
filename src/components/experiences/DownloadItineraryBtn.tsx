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
  fitnessRequirement?: string;
  ageRange?: string;
  minAge?: number | null;
  cancellationPolicy?: string;
  categories?: string[];
  vibeTags?: string[];
  pickupPoints?: string[];
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
  
  const bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/experiences/${data.slug}` : `https://www.paramadventures.in/experiences/${data.slug}`;
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
  doc.line(14, pageHeight * 0.70, pageWidth - 14, pageHeight * 0.70);

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
  const bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/experiences/${data.slug}` : `https://www.paramadventures.in/experiences/${data.slug}`;
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
    const descLen = day.description?.length ?? 0;
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

    if (day.description) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.darkText);
      const dayDescLines = doc.splitTextToSize(cleanTextForPdf(day.description), pageWidth - 48);
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

function drawEssentialInfoAndContact(doc: jsPDF, data: ItineraryBookingData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.addPage();
  const startY = 20;
  let y = startY;

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
    y = drawSectionHeader(doc, "AVAILABLE PICKUP & DROP LOCATIONS", y);
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(...COLORS.darkText);
    for (const point of data.pickupPoints) {
      y = checkPageBreak(doc, y, 6);
      doc.setFillColor(...COLORS.primary);
      doc.circle(16, y + 3.5, 1, "F");
      doc.text(cleanTextForPdf(point), 20, y + 4);
      y += 6;
    }
    y += 8;
  }

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

  if (data.cancellationPolicy) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "CANCELLATION POLICY", y);
    doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(...COLORS.mutedText);
    const policyLines = doc.splitTextToSize(cleanTextForPdf(data.cancellationPolicy), pageWidth - 28);
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

  drawSocialButton(doc, "FACEBOOK", "https://www.facebook.com/profile.php?id=61576234846405", startX, btnY, [24, 119, 242], "fb");
  drawSocialButton(doc, "INSTAGRAM", "https://www.instagram.com/param.adventures?igsh=MXUzc25yYTN5NXRmZw%3D%3D&utm_source=qr", startX + 38, btnY, [225, 48, 108], "insta");
  drawSocialButton(doc, "YOUTUBE", "https://www.youtube.com/@ParamAdventures", startX + 76, btnY, [255, 0, 0], "yt");
  drawSocialButton(doc, "WHATSAPP", whatsappUrl, startX + 114, btnY, [37, 211, 102], "wa");

  y += 58;
  doc.setFontSize(7).setTextColor(...COLORS.mutedText);
  doc.text(`© ${new Date().getFullYear()} ${cleanTextForPdf(data.company?.name ?? "")}. All rights reserved.`, pageWidth / 2, y + 4, { align: "center", maxWidth: pageWidth - 28 });
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
