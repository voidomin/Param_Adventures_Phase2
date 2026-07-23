"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  UserCheck,
  ChevronRight,
  AlertCircle,
  Briefcase,
  ClipboardList,
  Download,
  Loader2,
} from "lucide-react";
import { 
  STATUS_COLORS, 
  formatDate, 
  DashboardNav, 
  DashboardLoader, 
  DashboardEmptyState 
} from "@/components/dashboard/DashboardShared";

interface VendorContactItem {
  id?: string;
  name?: string;
  phone?: string;
  [key: string]: unknown;
}

interface StructuredVendorContacts {
  stays?: VendorContactItem[];
  transports?: VendorContactItem[];
  otherContacts?: VendorContactItem[];
}

interface TripSlot {
  id: string;
  date: string;
  capacity: number;
  remainingCapacity: number;
  status: string;
  vendorContacts: unknown;
  experience: {
    title: string;
    location: string;
    durationDays: number;
    images: string[];
  };
  assignments: { trekLead: { id: string; name: string; email: string } }[];
  _count: { bookings: number };
}

interface ExportParticipant {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  isPrimary: boolean;
  gender?: string | null;
  age?: number | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactNumber?: string | null;
  emergencyRelationship?: string | null;
  pickupPoint?: string | null;
  dropPoint?: string | null;
  isCancelled?: boolean;
}

interface ExportBooking {
  id: string;
  totalPrice: number | string;
  createdAt: string | Date;
  user: {
    name: string;
    email: string;
    phoneNumber: string | null;
  };
  participants?: ExportParticipant[];
}

async function exportTripManifestExcel(
  tripId: string,
  setIsExporting: (loading: boolean) => void,
) {
  setIsExporting(true);
  try {
    const res = await fetch(`/api/manager/trips/${tripId}`);
    if (!res.ok) throw new Error("Failed to fetch trip details");
    const data = await res.json();
    const fullTrip = data.slot;

    if (!fullTrip?.bookings || fullTrip.bookings.length === 0) {
      alert("No confirmed bookings to export.");
      return;
    }

    const rows = fullTrip.bookings.flatMap((booking: ExportBooking) => {
      const activeParticipants = booking.participants?.filter((p: ExportParticipant) => !p.isCancelled) ?? [];
      
      if (activeParticipants.length === 0) {
        return [
          {
            "Trek/Experience": fullTrip.experience.title,
            "Departure Date": new Date(fullTrip.date),
            "Booking ID": booking.id,
            "Lead Booker Name": booking.user.name,
            "Lead Booker Email": booking.user.email,
            "Lead Booker Phone": booking.user.phoneNumber || "",
            "Participant Name": booking.user.name,
            "Is Primary Booker?": "Yes",
            "Email": booking.user.email,
            "Phone Number": booking.user.phoneNumber || "",
            "Gender": "",
            "Age": "",
            "Blood Group": "",
            "Emergency Contact Name": "",
            "Emergency Contact Phone": "",
            "Relationship": "",
            "Pickup Point": "",
            "Drop Point": "",
            "Price Paid (INR)": Number(booking.totalPrice),
            "Booking Date": new Date(booking.createdAt),
          },
        ];
      }

      return activeParticipants.map((p: ExportParticipant) => ({
        "Trek/Experience": fullTrip.experience.title,
        "Departure Date": new Date(fullTrip.date),
        "Booking ID": booking.id,
        "Lead Booker Name": booking.user.name,
        "Lead Booker Email": booking.user.email,
        "Lead Booker Phone": booking.user.phoneNumber || "",
        "Participant Name": p.name,
        "Is Primary Booker?": p.isPrimary ? "Yes" : "No",
        "Email": p.email || "",
        "Phone Number": p.phoneNumber || "",
        "Gender": p.gender || "",
        "Age": p.age !== null && p.age !== undefined ? String(p.age) : "",
        "Blood Group": p.bloodGroup || "",
        "Emergency Contact Name": p.emergencyContactName || "",
        "Emergency Contact Phone": p.emergencyContactNumber || "",
        "Relationship": p.emergencyRelationship || "",
        "Pickup Point": p.pickupPoint || "",
        "Drop Point": p.dropPoint || "",
        "Price Paid (INR)": Number(booking.totalPrice),
        "Booking Date": new Date(booking.createdAt),
      }));
    });

    // Dynamically import xlsx (SheetJS)
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: true, dateNF: "yyyy-mm-dd" });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Manifest");

    // Auto-fit column widths
    const maxLens = Object.keys(rows[0]).reduce((acc, key) => {
      acc[key] = key.length;
      return acc;
    }, {} as Record<string, number>);

    rows.forEach((row: Record<string, unknown>) => {
      Object.keys(row).forEach((key) => {
        const cellValue = row[key];
        const valStr = cellValue instanceof Date
          ? cellValue.toISOString().split("T")[0]
          : typeof cellValue === "object" && cellValue !== null
            ? JSON.stringify(cellValue)
            : String(cellValue ?? "");
        if (valStr.length > maxLens[key]) {
          maxLens[key] = valStr.length;
        }
      });
    });

    worksheet["!cols"] = Object.keys(maxLens).map((key) => ({
      wch: Math.max(maxLens[key] + 3, 10),
    }));

    const dateStr = new Date(fullTrip.date).toISOString().split("T")[0];
    const sanitizedTitle = fullTrip.experience.title.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${sanitizedTitle}_manifest_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, filename);
  } catch (err) {
    console.error("Export failed:", err);
    alert("Failed to export manifest. Please try again.");
  } finally {
    setIsExporting(false);
  }
}

function formatStructuredContacts(contacts: StructuredVendorContacts) {
  const staysCount = contacts.stays?.length ?? 0;
  const transportsCount = contacts.transports?.length ?? 0;
  const otherCount = contacts.otherContacts?.length ?? 0;
  const vendorCount = staysCount + transportsCount + otherCount;

  const parts: string[] = [];
  if (staysCount > 0) {
    parts.push(`${staysCount} Stay${staysCount === 1 ? "" : "s"}`);
  }
  if (transportsCount > 0) {
    parts.push(`${transportsCount} Transport${transportsCount === 1 ? "" : "s"}`);
  }
  if (otherCount > 0) {
    parts.push(`${otherCount} Other`);
  }

  const vendorText = parts.length > 0 ? parts.join(" · ") : "No Vendor Contacts Yet";
  return { vendorCount, vendorText };
}

function formatArrayContacts(contacts: unknown[]) {
  const vendorCount = contacts.length;
  let vendorText = "No Vendor Contacts Yet";
  if (vendorCount === 1) {
    vendorText = "1 Vendor Contact";
  } else if (vendorCount > 1) {
    vendorText = `${vendorCount} Vendor Contacts`;
  }
  return { vendorCount, vendorText };
}

function getVendorContactsSummary(rawContacts: unknown) {
  const contacts = rawContacts as StructuredVendorContacts | null | undefined;
  if (contacts && typeof contacts === "object" && !Array.isArray(contacts)) {
    return formatStructuredContacts(contacts);
  }
  if (Array.isArray(rawContacts)) {
    return formatArrayContacts(rawContacts);
  }
  return { vendorCount: 0, vendorText: "No Vendor Contacts Yet" };
}

interface ManagerTripCardProps {
  readonly trip: TripSlot;
}

function ManagerTripCard({ trip }: Readonly<ManagerTripCardProps>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    await exportTripManifestExcel(trip.id, setIsExporting);
  };

  const statusColor =
    STATUS_COLORS[trip.status] ?? STATUS_COLORS.UPCOMING;
  const { vendorCount, vendorText } = getVendorContactsSummary(trip.vendorContacts);

  const leadCount = trip.assignments.length;

  let leadText = "No Trek Lead Assigned";
  if (leadCount === 1) leadText = "1 Trek Lead Assigned";
  else if (leadCount > 1)
    leadText = `${leadCount} Trek Leads Assigned`;

  return (
    <div className="bg-card border border-border rounded-[1.5rem] p-6 sm:p-8 flex flex-col gap-6 hover:shadow-xl hover:border-foreground/20 transition-all group">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-foreground">
              {trip.experience.title}
            </h3>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
            >
              {trip.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-foreground/60">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {formatDate(trip.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {trip.experience.location || "N/A"}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {trip._count.bookings} confirmed
            </span>
          </div>
        </div>
      </div>

      {/* Readiness checklist */}
      <div className="flex flex-wrap gap-3 pt-3 border-t border-border/50">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${
            leadCount > 0
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : "bg-orange-500/10 text-orange-400 border-orange-500/20"
          }`}
        >
          {leadCount > 0 ? (
            <UserCheck className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {leadText}
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${
            vendorCount > 0
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          {vendorText}
        </div>
      </div>

      <div className="flex justify-end items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground/5 hover:bg-foreground/10 text-foreground border border-border rounded-xl font-bold transition-all disabled:opacity-50 text-sm cursor-pointer"
          title="Export manifest Excel"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4 text-primary" />
          )}
          Export Excel
        </button>

        <Link
          href={`/dashboard/manager/trips/${trip.id}`}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/20 text-sm opacity-90 group-hover:opacity-100"
        >
          Action Center
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function ManagerTripsPage() {
  const [trips, setTrips] = useState<TripSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/manager/trips");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return (
    <div className="max-w-4xl mx-auto pt-16 px-4 md:px-8 pb-12">
      <DashboardNav />

      <div className="mb-8">
        <h1 className="text-3xl font-heading font-black text-foreground flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-primary" />
          My Assigned Trips
        </h1>
        <p className="text-foreground/60 mt-1">
          Trips assigned to you for management. Set up vendor contacts and trek
          leads before unlocking for operation.
        </p>
      </div>

      {isLoading && <DashboardLoader />}

      {!isLoading && trips.length === 0 && (
        <DashboardEmptyState 
          title="No Trips Assigned"
          description="Ask an admin to assign you to an upcoming trip slot."
        />
      )}

      {!isLoading && trips.length > 0 && (
        <div className="grid gap-4">
          {trips.map((trip) => (
            <ManagerTripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
