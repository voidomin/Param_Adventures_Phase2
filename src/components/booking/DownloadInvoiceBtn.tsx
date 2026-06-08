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
  };
}

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
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

export default function DownloadInvoiceBtn({ bookingId }: Readonly<{ bookingId: string }>) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // 1. Fetch data
      const res = await fetch(`/api/bookings/${bookingId}/invoice`);
      if (!res.ok) throw new Error("Failed to fetch invoice data");
      const data: InvoiceData = await res.json();

      // Fetch logo as base64
      const logoBase64 = await fetchImageAsBase64(`${globalThis.location.origin}/param-logo.png`);

      // 2. Initialize jsPDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const { booking, company, experience, primaryContact, payment } = data;

      // 3. Header Formatting
      // Logo in the top-left
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

      // 4. Details Section (Two card containers side-by-side)
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
      doc.text(`Invoice No: INV-${booking.id.split("-")[0].toUpperCase()}`, 18, cardY + 12);
      doc.text(`Invoice Date: ${new Date(booking.date).toLocaleDateString()}`, 18, cardY + 17);
      doc.text(`Place of Supply: Karnataka (29)`, 18, cardY + 22); 
      doc.text(`Status: ${booking.status}`, 18, cardY + 27);

      // Right Card: Billed To
      const rightCardX = 14 + cardWidth + 6;
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.roundedRect(rightCardX, cardY, cardWidth, cardHeight, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 118, 110); // Teal-700
      doc.text("BILLED TO", rightCardX + 4, cardY + 6);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99); // Slate-600
      doc.text(`Name: ${primaryContact?.name || "Guest"}`, rightCardX + 4, cardY + 12);
      doc.text(`Email: ${primaryContact?.email || "N/A"}`, rightCardX + 4, cardY + 17);
      doc.text(`Phone: ${primaryContact?.phoneNumber || "N/A"}`, rightCardX + 4, cardY + 22);

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
      
      const summaryCardW = 85;
      const summaryCardH = 35;
      const summaryCardX = pageWidth - 14 - summaryCardW;
      const summaryCardY = finalY + 8;

      // Draw Summary Card Background
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

      // Draw a line inside the summary card before total
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setLineWidth(0.3);
      doc.line(summaryCardX + 4, summaryCardY + 24, pageWidth - 18, summaryCardY + 24);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55); // Slate-800
      doc.text("Gross Total:", summaryCardX + 4, summaryCardY + 30);
      doc.text(`Rs ${Number(booking.totalPrice).toFixed(2)}`, pageWidth - 18, summaryCardY + 30, { align: "right" });

      // 7. Footer details
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);

      const footerTextY = summaryCardY + summaryCardH + 10;
      doc.text("Tax is payable on reverse charge basis: NO", 14, footerTextY);
      
      if (payment?.providerPaymentId) {
        doc.text(`Payment Reference ID: ${payment.providerPaymentId}`, 14, footerTextY + 5);
      }

      // Signatory block
      doc.setFont("helvetica", "bold");
      doc.setTextColor(55, 65, 81); // Slate-700
      doc.text(`For ${company.companyName || "Param Adventures Pvt Ltd"}`, pageWidth - 14, footerTextY + 25, { align: "right" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text("Authorized Signatory\n(Computer Generated Invoice)", pageWidth - 14, footerTextY + 32, { align: "right" });

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
