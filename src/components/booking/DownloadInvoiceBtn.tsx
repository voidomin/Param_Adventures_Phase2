"use client";

import { useState } from "react";
import { Download, Loader2, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function DownloadInvoiceBtn({ bookingId }: Readonly<{ bookingId: string }>) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // 1. Fetch data
      const res = await fetch(`/api/bookings/${bookingId}/invoice`);
      if (!res.ok) throw new Error("Failed to fetch invoice data");
      const data = await res.json();

      // 2. Initialize jsPDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const { booking, company, experience, primaryContact, payment } = data;

      // 3. Header formatting (Company Docs)
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(company.companyName || "PARAM ADVENTURES", 14, 22);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(company.companyAddress || "", 14, 30);
      doc.text(`GSTIN: ${company.gstNumber || "N/A"} | State Code: ${company.stateCode || "N/A"}`, 14, 36);
      doc.text(`PAN: ${company.panNumber || "N/A"}`, 14, 42);

      // 4. TAX INVOICE Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("TAX INVOICE", pageWidth / 2, 55, { align: "center" });
      
      doc.setLineWidth(0.5);
      doc.line(14, 60, pageWidth - 14, 60); // Divider

      // 5. Invoice & Customer Details Side-by-Side
      doc.setFontSize(10);
      
      // Left: Invoice details
      doc.setFont("helvetica", "bold");
      doc.text("Invoice Details", 14, 70);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice No: INV-${booking.id.split("-")[0].toUpperCase()}`, 14, 76);
      doc.text(`Invoice Date: ${new Date(booking.date).toLocaleDateString()}`, 14, 82);
      doc.text(`Place of Supply: Uttarakhand (05)`, 14, 88); 
      doc.text(`Payment Status: ${booking.status}`, 14, 94);

      // Right: Billed To
      doc.setFont("helvetica", "bold");
      doc.text("Billed To", pageWidth / 2, 70);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${primaryContact?.name || "Guest"}`, pageWidth / 2, 76);
      doc.text(`Email: ${primaryContact?.email || "N/A"}`, pageWidth / 2, 82);
      doc.text(`Phone: ${primaryContact?.phoneNumber || "N/A"}`, pageWidth / 2, 88);

      // 6. Table of Items
      const tableData = [
        [
          "1", 
          `Adventure Package: ${experience.title}\nLocation: ${experience.location}\nGuests: ${booking.participantCount}`, 
          "9985", // Generic SAC code for tour operator services
          booking.participantCount.toString(),
          `Rs ${Number(booking.baseFare).toFixed(2)}`
        ]
      ];

      // Use the function directly instead of doc.autoTable
      autoTable(doc, {
        startY: 105,
        head: [['S.No', 'Description of Services', 'SAC', 'Qty', 'Taxable Value']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        styles: { fontSize: 9 },
      });

      // 7. Tax Breakdown Section
      // @ts-ignore
      const finalY = (doc as any).lastAutoTable.finalY || 135;
      
      // We will place the totals on the right side
      const rightColX = pageWidth - 70;
      doc.setFontSize(10);

      doc.text("Taxable Base Fare:", rightColX, finalY + 10);
      doc.text(`Rs ${Number(booking.baseFare).toFixed(2)}`, pageWidth - 14, finalY + 10, { align: "right" });

      let currentY = finalY + 16;
      if (Array.isArray(booking.taxBreakdown)) {
         booking.taxBreakdown.forEach((tax: any) => {
            doc.text(`${tax.name} (${tax.percentage}%):`, rightColX, currentY);
            doc.text(`Rs ${Number(tax.amount || 0).toFixed(2)}`, pageWidth - 14, currentY, { align: "right" });
            currentY += 6;
         });
      }

      currentY += 2; // Add a little spacing before gross total
      doc.setFont("helvetica", "bold");
      doc.text("Gross Total:", rightColX, currentY);
      doc.text(`Rs ${Number(booking.totalPrice).toFixed(2)}`, pageWidth - 14, currentY, { align: "right" });

      // 8. Footer (Reverse Charge & Signature)
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Tax is payable on reverse charge basis: NO", 14, currentY + 15);
      
      if (payment?.providerPaymentId) {
         doc.text(`Payment Reference ID: ${payment.providerPaymentId}`, 14, currentY + 21);
      }

      doc.text("For Param Adventures Pvt Ltd", pageWidth - 14, currentY + 60, { align: "right" });
      doc.setFontSize(8);
      doc.text("Authorized Signatory\n(Computer Generated Invoice)", pageWidth - 14, currentY + 68, { align: "right" });

      // Save
      doc.save(`Invoice_PARAM_${booking.id.split("-")[0]}.pdf`);

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
