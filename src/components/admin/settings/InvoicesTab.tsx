"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  FileText, 
  Search, 
  Download, 
  Loader2, 
  CalendarDays, 
  CheckSquare, 
  Square,
  AlertCircle
} from "lucide-react";
import { SectionTitle } from "./Common";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  fetchImageAsBase64, 
  drawInvoiceHeader, 
  drawInvoiceDetailsAndBilledTo, 
  drawPaymentAndSummaryBlocks, 
  drawInvoiceFooter 
} from "@/components/booking/DownloadInvoiceBtn";

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

interface MinimalExperience {
  id: string;
  title: string;
}

interface TaxItem {
  name: string;
  percentage: number;
  amount: number;
}

interface AuditBooking {
  id: string;
  participantCount: number;
  totalPrice: number;
  baseFare: number;
  taxBreakdown: TaxItem[] | null;
  bookingStatus: string;
  paymentStatus: string;
  createdAt: string;
  user?: {
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  } | null;
  experience?: {
    title: string;
  } | null;
  slot?: {
    date: string | Date;
  } | null;
  payments?: {
    status: string;
    provider: string;
    providerPaymentId?: string | null;
  }[];
}

// standalone helpers to avoid nested functions complexity
function calculateGstTotals(taxBreakdown: TaxItem[] | null) {
  let gstAmount = 0;
  let gstPercent = 0;
  if (taxBreakdown && Array.isArray(taxBreakdown)) {
    gstAmount = taxBreakdown.reduce((sum: number, item) => sum + (Number(item.amount) || 0), 0);
    gstPercent = taxBreakdown.reduce((sum: number, item) => sum + (Number(item.percentage) || 0), 0);
  }
  return { gstAmount, gstPercent };
}

function getPaymentDetails(payments?: { status: string; provider: string; providerPaymentId?: string | null }[]) {
  const successfulPayment = payments?.find((p) => p.status === "PAID");
  let paymentMode = "—";
  if (successfulPayment) {
    paymentMode = successfulPayment.provider === "MANUAL" ? "Manual Transfer" : "Razorpay Online";
  }
  const paymentRefId = successfulPayment?.providerPaymentId || "—";
  return { paymentMode, paymentRefId };
}

function formatBookingRow(b: AuditBooking) {
  const { gstAmount, gstPercent } = calculateGstTotals(b.taxBreakdown);
  const { paymentMode, paymentRefId } = getPaymentDetails(b.payments);

  return {
    "Booking ID": b.id,
    "Customer Name": b.user?.name || "—",
    "Customer Email": b.user?.email || "—",
    "Customer Phone": b.user?.phoneNumber || "—",
    "Experience Title": b.experience?.title || "—",
    "Slot Date": b.slot ? new Date(b.slot.date) : "—",
    "Pax Count": b.participantCount,
    "Base Taxable Value (INR)": Number(b.baseFare),
    "GST Rate (%)": gstPercent,
    "GST Amount (INR)": gstAmount,
    "Total Price (INR)": Number(b.totalPrice),
    "Booking Status": b.bookingStatus,
    "Payment Status": b.paymentStatus,
    "Payment Mode": paymentMode,
    "Transaction Reference ID": paymentRefId,
    "Booking Date": new Date(b.createdAt),
  };
}

function getStatusBadgeClass(status: string): string {
  if (status === "CONFIRMED") {
    return "bg-green-500/10 text-green-500 border-green-500/20";
  }
  if (status === "CANCELLED") {
    return "bg-red-500/10 text-red-500 border-red-500/20";
  }
  return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
}

export default function InvoicesTab() {
  const [experiences, setExperiences] = useState<MinimalExperience[]>([]);
  const [selectedExp, setSelectedExp] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("CONFIRMED");
  const [bookings, setBookings] = useState<AuditBooking[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/experiences")
      .then((res) => res.json())
      .then((data) => {
        if (data?.experiences) {
          setExperiences(data.experiences);
        }
      })
      .catch(console.error);
  }, []);

  const handleSearch = async () => {
    setIsSearching(true);
    setBookings([]);
    setSelectedIds([]);
    try {
      const params = new URLSearchParams();
      if (selectedExp) params.set("experienceId", selectedExp);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (status !== "ALL") params.set("status", status);
      params.set("limit", "1000");

      const res = await fetch(`/api/admin/bookings?${params}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const list = (data.bookings || []) as AuditBooking[];
      setBookings(list);
      setSelectedIds(list.map((b) => b.id)); // select all by default
    } catch (err) {
      console.error(err);
      alert("Failed to search bookings.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.length === bookings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bookings.map((b) => b.id));
    }
  };

  const handleDownloadBulkPDF = async () => {
    if (selectedIds.length === 0) return;
    
    startTransition(async () => {
      try {
        setExportProgress("Initializing PDF generation...");
        
        // Fetch logo once
        const logoBase64 = await fetchImageAsBase64(`${globalThis.location.origin}/param-logo.png`);
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        for (let i = 0; i < selectedIds.length; i++) {
          const bookingId = selectedIds[i];
          setExportProgress(`Fetching & generating invoice ${i + 1} of ${selectedIds.length}...`);
          
          const res = await fetch(`/api/bookings/${bookingId}/invoice`);
          if (!res.ok) {
            console.error(`Failed to fetch invoice for booking ${bookingId}`);
            continue;
          }
          
          const data = await res.json();
          const { booking, company, experience, primaryContact, payment, payments } = data;

          if (i > 0) {
            doc.addPage();
          }

          // Draw invoice onto this page of doc
          const dividerY = drawInvoiceHeader(doc, logoBase64, company, pageWidth);
          const { cardHeight, cardY } = drawInvoiceDetailsAndBilledTo(doc, booking, primaryContact, dividerY, pageWidth);

          const tableData = [
            [
              "1",
              `Adventure Package: ${experience.title}\nLocation: ${experience.location}\nGuests: ${booking.participantCount}`,
              "9985",
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

          const finalY = (doc as unknown as JsPDFWithAutoTable).lastAutoTable?.finalY || 110;
          const { summaryCardY, summaryCardH } = drawPaymentAndSummaryBlocks(doc, booking, payment, payments, finalY, pageWidth);
          drawInvoiceFooter(doc, company.companyName, summaryCardY, summaryCardH, pageWidth);
        }

        const dateStr = new Date().toISOString().split("T")[0];
        doc.save(`invoices_bulk_export_${dateStr}.pdf`);
      } catch (err) {
        console.error(err);
        alert("Failed to export invoices PDF.");
      } finally {
        setExportProgress(null);
      }
    });
  };

  const handleDownloadBulkExcel = async () => {
    if (selectedIds.length === 0) return;
    
    startTransition(async () => {
      try {
        setExportProgress("Formatting GST sales ledger data...");
        
        const selectedBookings = bookings.filter((b) => selectedIds.includes(b.id));
        const rows = selectedBookings.map(formatBookingRow);

        const XLSX = await import("xlsx");
        const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: true, dateNF: "yyyy-mm-dd" });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "GST Billings");

        // Column Auto-fit
        const maxLens = Object.keys(rows[0] || {}).reduce((acc, key) => {
          acc[key] = key.length;
          return acc;
        }, {} as Record<string, number>);

        rows.forEach((row: Record<string, unknown>) => {
          for (const key of Object.keys(row)) {
            const valStr = row[key] instanceof Date
              ? row[key].toISOString().split("T")[0]
              : String(row[key] ?? "");
            if (valStr.length > (maxLens[key] || 0)) {
              maxLens[key] = valStr.length;
            }
          }
        });

        worksheet["!cols"] = Object.keys(maxLens).map((key) => ({
          wch: Math.max(maxLens[key] + 3, 10),
        }));

        const dateStr = new Date().toISOString().split("T")[0];
        XLSX.writeFile(workbook, `gst_billings_export_${dateStr}.xlsx`);
      } catch (err) {
        console.error(err);
        alert("Failed to export Excel report.");
      } finally {
        setExportProgress(null);
      }
    });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
      <SectionTitle 
        title="Audit & Invoice Downloads" 
        subtitle="Search transactions, generate consolidated tax invoice PDFs, or export GST sales ledgers." 
        icon={FileText} 
      />

      {/* Query Filters */}
      <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="filter-trip" className="block text-xs font-semibold text-foreground/60 mb-1">
              Select Trip/Experience
            </label>
            <select
              id="filter-trip"
              value={selectedExp}
              onChange={(e) => setSelectedExp(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:border-primary/50 text-foreground"
            >
              <option value="">All Trips</option>
              {experiences.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-start-date" className="block text-xs font-semibold text-foreground/60 mb-1">
              Start Date
            </label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:border-primary/50 text-foreground"
            />
          </div>

          <div>
            <label htmlFor="filter-end-date" className="block text-xs font-semibold text-foreground/60 mb-1">
              End Date
            </label>
            <input
              id="filter-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:border-primary/50 text-foreground"
            />
          </div>

          <div>
            <label htmlFor="filter-status" className="block text-xs font-semibold text-foreground/60 mb-1">
              Booking Status
            </label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:border-primary/50 text-foreground"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REQUESTED">Requested</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || exportProgress !== null}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 text-xs"
          >
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            Search Bookings
          </button>
        </div>
      </div>

      {/* Export Action Controls */}
      {bookings.length > 0 && (
        <div className="bg-foreground/[0.02] border border-border/60 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-foreground">
              {selectedIds.length} of {bookings.length} Bookings Selected
            </h4>
            <p className="text-xs text-foreground/50">
              Select bookings in the list below to perform bulk exports.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={selectedIds.length === 0 || exportProgress !== null}
              onClick={handleDownloadBulkPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 text-xs shadow-md shadow-teal-500/10"
            >
              <Download className="w-3.5 h-3.5" />
              Consolidated PDF Invoices
            </button>

            <button
              type="button"
              disabled={selectedIds.length === 0 || exportProgress !== null}
              onClick={handleDownloadBulkExcel}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 text-xs shadow-md shadow-green-500/10"
            >
              <Download className="w-3.5 h-3.5" />
              GST Sales Ledger Excel
            </button>
          </div>
        </div>
      )}

      {/* Exporting Progress Toast */}
      {exportProgress && (
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <p className="text-xs font-semibold text-primary">{exportProgress}</p>
        </div>
      )}

      {/* Bookings Selection List */}
      {bookings.length > 0 ? (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-foreground/5 border-b border-border text-xs font-black uppercase tracking-widest text-foreground/40">
                  <th className="px-6 py-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllToggle}
                      className="text-foreground/60 hover:text-primary transition-colors"
                    >
                      {selectedIds.length === bookings.length ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4">Booking ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Experience</th>
                  <th className="px-6 py-4">Slot Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {bookings.map((b) => {
                  const isChecked = selectedIds.includes(b.id);
                  return (
                    <tr 
                      key={b.id} 
                      className={`hover:bg-foreground/[0.01] transition-colors ${
                        isChecked ? "bg-primary/[0.01]" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectToggle(b.id)}
                          className="text-foreground/60 hover:text-primary transition-colors mx-auto"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-foreground/75">
                        {b.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{b.user?.name || "—"}</div>
                        <div className="text-[10px] text-foreground/45">{b.user?.email || "—"}</div>
                      </td>
                      <td className="px-6 py-4 text-foreground/80 font-medium">
                        {b.experience?.title || "—"}
                      </td>
                      <td className="px-6 py-4 text-foreground/70">
                        {b.slot ? (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 opacity-45" />
                            {new Date(b.slot.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-foreground">
                        ₹{Number(b.totalPrice).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(b.bookingStatus)}`}>
                          {b.bookingStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-3xl p-12 text-center text-foreground/40 space-y-2">
          <AlertCircle className="w-10 h-10 mx-auto opacity-30 animate-pulse" />
          <h4 className="font-bold text-foreground/75">No bookings found</h4>
          <p className="text-xs">Adjust your search parameters and click &quot;Search Bookings&quot; above.</p>
        </div>
      )}
    </div>
  );
}
