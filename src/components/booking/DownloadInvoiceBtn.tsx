"use client";

import { useState } from "react";
import { Download, Loader2, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceData {
  booking: {
    id: string;
    date: string;
    status: string;
    participantCount: number;
    baseFare: number;
    totalPrice: number;
    taxBreakdown: { name: string; percentage: number; amount: number }[];
    paymentType?: string;
    paidAmount?: number;
    remainingBalance?: number;
    paymentStatus?: string;
    couponDiscount?: number;
  };
  company: {
    companyName: string;
    companyAddress: string;
    gstNumber: string;
    stateCode: string;
    panNumber: string;
  };
  experience: {
    title: string;
    location: string;
  };
  primaryContact: {
    name: string;
    email: string;
    phoneNumber: string;
  };
  payment: {
    providerPaymentId?: string;
  } | null;
  payments?: {
    id: string;
    amount: number;
    status: string;
    providerPaymentId?: string;
    createdAt: string;
  }[];
}

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

export async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function formatInvoiceDate(d: string | Date) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}/${months[date.getMonth()]}/${date.getFullYear()}`;
}

export function drawInvoiceHeader(
  doc: jsPDF,
  logoBase64: string | null,
  company: InvoiceData['company'],
  pageWidth: number
): number {
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 14, 12, 18, 18);
    } catch (err) {
      console.warn("Failed to draw logo on PDF:", err);
    }
  }

  // Company details next to logo
  const companyDetailsStartX = logoBase64 ? 36 : 14;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55); // Slate-800
  doc.text(company.companyName || "PARAM ADVENTURES", companyDetailsStartX, 18);
  
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  
  // Split and render address dynamically to handle any address length without overlap
  const addressText = company.companyAddress || "";
  const addressLines = doc.splitTextToSize(addressText, pageWidth - companyDetailsStartX - 70) as string[];
  const addressLineHeight = 3.6;
  addressLines.forEach((line, index) => {
    doc.text(line, companyDetailsStartX, 23 + (index * addressLineHeight));
  });

  const gstY = 23 + (addressLines.length * addressLineHeight) + 0.5;
  doc.text(`GSTIN: ${company.gstNumber || "N/A"} | PAN: ${company.panNumber || "N/A"}`, companyDetailsStartX, gstY);
  
  const stateCodeY = gstY + 3.8;
  doc.text(`State Code: ${company.stateCode || "N/A"}`, companyDetailsStartX, stateCodeY);

  // TAX INVOICE Title (top-right)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110); // Teal-700
  doc.text("TAX INVOICE", pageWidth - 14, 18, { align: "right" });

  // Divider Line placed dynamically below the company info
  const dividerY = Math.max(36, stateCodeY + 5);
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(14, dividerY, pageWidth - 14, dividerY);

  return dividerY;
}

export function drawInvoiceDetailsAndBilledTo(
  doc: jsPDF,
  booking: InvoiceData['booking'],
  primaryContact: InvoiceData['primaryContact'],
  dividerY: number,
  pageWidth: number
): { cardHeight: number; cardY: number } {
  const cardWidth = (pageWidth - 34) / 2;
  const cardHeight = 32;
  const cardY = dividerY + 6;

  // Left Card: Invoice details
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, "F");
  
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110); // Teal-700
  doc.text("INVOICE DETAILS", 18, cardY + 6);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99); // Slate-600
  doc.text(`Invoice No: PARAM-${booking.id.split("-")[0].toUpperCase()}`, 18, cardY + 12);
  doc.text(`Date: ${formatInvoiceDate(booking.date)}`, 18, cardY + 17);
  doc.text(`Booking Status: ${booking.status}`, 18, cardY + 22);

  // Right Card: Billed to details
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14 + cardWidth + 6, cardY, cardWidth, cardHeight, 2, 2, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110);
  doc.text("BILLED TO", 14 + cardWidth + 10, cardY + 6);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  doc.text(primaryContact?.name || "Customer", 14 + cardWidth + 10, cardY + 12);
  doc.text(primaryContact?.email || "—", 14 + cardWidth + 10, cardY + 17);
  doc.text(primaryContact?.phoneNumber || "—", 14 + cardWidth + 10, cardY + 22);

  return { cardHeight, cardY };
}

export function drawPaymentAndSummaryBlocks(
  doc: jsPDF,
  booking: InvoiceData['booking'],
  payment: InvoiceData['payment'],
  payments: InvoiceData['payments'],
  finalY: number,
  pageWidth: number
): { summaryCardY: number; summaryCardH: number } {
  const hasCoupon = booking.couponDiscount && booking.couponDiscount > 0;
  const summaryCardW = 85;
  const summaryCardH = hasCoupon ? 47 : 35;
  const summaryCardX = pageWidth - 14 - summaryCardW;
  const summaryCardY = finalY + 8;

  // Left Card: Payment Transaction History & Balance Breakdown
  const paymentCardX = 14;
  const paymentCardW = summaryCardX - 14 - 6; // 91mm wide
  const paymentCardH = summaryCardH;
  const paymentCardY = summaryCardY;

  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(paymentCardX, paymentCardY, paymentCardW, paymentCardH, 2, 2, "F");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110); // Teal-700
  doc.text("PAYMENT HISTORY", paymentCardX + 4, paymentCardY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99); // Slate-600

  let payY = paymentCardY + 12;
  const paidAmt = Number(booking.paidAmount ?? booking.totalPrice);
  const remBal = Number(booking.remainingBalance ?? 0);
  const paidPayments = payments ? payments.filter((p) => p.status === "PAID") : [];

  if (paidPayments.length > 0) {
    paidPayments.forEach((p, idx) => {
      const isAdvance = idx === 0 && booking.paymentType === "ADVANCE";
      const label = isAdvance ? "Advance Payment" : `Payment #${idx + 1}`;
      const dateStr = formatInvoiceDate(p.createdAt);
      const refStr = p.providerPaymentId ? `Ref: ${p.providerPaymentId}` : "Ref: N/A";
      doc.text(`${label}: Rs ${p.amount.toFixed(2)} on ${dateStr} (${refStr})`, paymentCardX + 4, payY);
      payY += 5;
    });
  } else {
    const refStr = payment?.providerPaymentId ? `Ref: ${payment.providerPaymentId}` : "Ref: N/A";
    const dateStr = formatInvoiceDate(booking.date);
    doc.text(`Payment: Rs ${paidAmt.toFixed(2)} on ${dateStr} (${refStr})`, paymentCardX + 4, payY);
    payY += 5;
  }

  // Draw horizontal separator inside the payment card before footer line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.line(paymentCardX + 4, paymentCardY + paymentCardH - 11, paymentCardX + paymentCardW - 4, paymentCardY + paymentCardH - 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);

  if (remBal <= 0.01) {
    doc.setTextColor(34, 197, 94); // Green-500
    doc.text(`Total Paid: Rs ${paidAmt.toFixed(2)}`, paymentCardX + 4, paymentCardY + paymentCardH - 5);
    doc.text("FULLY PAID", paymentCardX + paymentCardW - 25, paymentCardY + paymentCardH - 5);
  } else {
    doc.setTextColor(217, 119, 6); // Amber-600
    doc.text(`Paid: Rs ${paidAmt.toFixed(2)}`, paymentCardX + 4, paymentCardY + paymentCardH - 5);
    doc.text(`Balance Due: Rs ${remBal.toFixed(2)}`, paymentCardX + paymentCardW - 45, paymentCardY + paymentCardH - 5);
  }

  // Right Card: Summary / Invoice Totals
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(summaryCardX, summaryCardY, summaryCardW, summaryCardH, 2, 2, "F");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  
  doc.text("Taxable Base Fare:", summaryCardX + 4, summaryCardY + 8);
  doc.text(`Rs ${Number(booking.baseFare).toFixed(2)}`, pageWidth - 18, summaryCardY + 8, { align: "right" });

  let currentY = summaryCardY + 14;
  if (Array.isArray(booking.taxBreakdown)) {
    booking.taxBreakdown.forEach((tax) => {
      doc.text(`${tax.name} (${tax.percentage}%):`, summaryCardX + 4, currentY);
      doc.text(`Rs ${Number(tax.amount || 0).toFixed(2)}`, pageWidth - 18, currentY, { align: "right" });
      currentY += 6;
    });
  }

  // Draw a line inside the summary card before Gross Total
  const line1Y = currentY + 1.5;
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.line(summaryCardX + 4, line1Y, pageWidth - 18, line1Y);

  const grossTotalY = line1Y + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55); // Slate-800
  doc.text("Gross Total:", summaryCardX + 4, grossTotalY);
  doc.text(`Rs ${Number(booking.totalPrice).toFixed(2)}`, pageWidth - 18, grossTotalY, { align: "right" });

  if (hasCoupon) {
    const couponDiscount = Number(booking.couponDiscount);
    const couponY = grossTotalY + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(249, 115, 22); // Orange-500
    doc.text("Coupon Applied:", summaryCardX + 4, couponY);
    doc.text(`-Rs ${couponDiscount.toFixed(2)}`, pageWidth - 18, couponY, { align: "right" });

    // Draw second separator line before Net Price
    const line2Y = couponY + 2.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(summaryCardX + 4, line2Y, pageWidth - 18, line2Y);

    const netPriceY = line2Y + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text("Net Total Paid/Due:", summaryCardX + 4, netPriceY);
    doc.text(`Rs ${(Number(booking.totalPrice) - couponDiscount).toFixed(2)}`, pageWidth - 18, netPriceY, { align: "right" });
  }

  return { summaryCardY, summaryCardH };
}

export function drawInvoiceFooter(
  doc: jsPDF,
  companyName: string,
  summaryCardY: number,
  summaryCardH: number,
  pageWidth: number
) {
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);

  const footerTextY = summaryCardY + summaryCardH + 10;
  doc.text("Tax is payable on reverse charge basis: NO", 14, footerTextY);
  doc.text("Payment transactions processed securely via Razorpay.", 14, footerTextY + 5);

  // Signatory block
  doc.setFont("helvetica", "bold");
  doc.setTextColor(55, 65, 81); // Slate-700
  doc.text(`For ${companyName || "Param Adventures Pvt Ltd"}`, pageWidth - 14, footerTextY + 25, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text("Authorized Signatory\n(Computer Generated Invoice)", pageWidth - 14, footerTextY + 32, { align: "right" });
}

export default function DownloadInvoiceBtn({ bookingId }: Readonly<{ bookingId: string }>) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // 1. Fetch data
      let data: InvoiceData;
      if (bookingId === "dummy") {
        data = {
          booking: {
            id: "32765c47-d803-4cfb-9ce1-0fd2c40a11a2",
            date: "2026-03-31T09:05:52.115Z",
            status: "CONFIRMED",
            participantCount: 1,
            baseFare: 900,
            totalPrice: 900,
            taxBreakdown: []
          },
          company: {
            companyName: "Param Adventures",
            companyAddress: "Kuvempu Nagar Main Rd, \nDoddakallasandra,\nBengaluru, Karnataka 560062",
            gstNumber: "NIL",
            stateCode: "62",
            panNumber: "ABJFPI574A"
          },
          experience: {
            title: "Kedarkantha Winter Trek: The Summit of Dreams",
            location: "Bengaluru"
          },
          primaryContact: {
            name: "Akashkbhat216",
            email: "akashkbhat216@gmail.com",
            phoneNumber: "+91-097163748"
          },
          payment: {
            providerPaymentId: "12345567"
          }
        };
      } else {
        const res = await fetch(`/api/bookings/${bookingId}/invoice`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(`Failed to fetch invoice data: Status ${res.status} - ${errBody.error || "Unknown Error"}`);
        }
        data = await res.json();
      }

      // Fetch logo as base64
      const logoBase64 = await fetchImageAsBase64(`${globalThis.location.origin}/param-logo.png`);

      // 2. Initialize jsPDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const { booking, company, experience, primaryContact, payment, payments } = data;

      // 3. Header Formatting
      const dividerY = drawInvoiceHeader(doc, logoBase64, company, pageWidth);

      // 4. Details Section (Two card containers side-by-side)
      const { cardHeight, cardY } = drawInvoiceDetailsAndBilledTo(doc, booking, primaryContact, dividerY, pageWidth);

      // 5. Table of Items
      const tableData = [
        [
          "1", 
          `Adventure Package: ${experience.title}\nLocation: ${experience.location}\nGuests: ${booking.participantCount}`, 
          "9985", // Generic SAC code for tour operator services
          booking.participantCount.toString(),
          `Rs ${Number(booking.baseFare).toFixed(2)}`
        ]
      ];

      autoTable(doc, {
        startY: cardY + cardHeight + 6,
        head: [['S.No', 'Description of Services', 'SAC', 'Qty', 'Taxable Value']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [15, 118, 110], // Teal-700
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        styles: { fontSize: 8.5, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 12 },
          2: { cellWidth: 20 },
          3: { cellWidth: 15 },
          4: { cellWidth: 35, halign: 'right' }
        }
      });

      // 6. Summary Block
      const finalY = (doc as unknown as JsPDFWithAutoTable).lastAutoTable?.finalY || 110;
      const { summaryCardY, summaryCardH } = drawPaymentAndSummaryBlocks(doc, booking, payment, payments, finalY, pageWidth);

      // 7. Footer details
      drawInvoiceFooter(doc, company.companyName, summaryCardY, summaryCardH, pageWidth);

      // Save
      doc.save(`Invoice_PARAM_${booking.id.split("-")[0].toUpperCase()}.pdf`);

    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate invoice. Please try again later.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className="w-full flex items-center justify-between px-4 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors rounded-xl font-semibold border border-transparent"
    >
      <div className="flex items-center gap-2">
         <FileText className="w-4 h-4" />
         <span>{isDownloading ? "Generating Bill..." : "Download Tax Invoice"}</span>
      </div>
      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
    </button>
  );
}
