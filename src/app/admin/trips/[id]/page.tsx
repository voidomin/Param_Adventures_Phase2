"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  MapPin,
  CalendarDays,
  Phone,
  Mail,
  UserCheck,
  UserPlus,
  Trash2,
  Download,
  Loader2,
  Check,
  Save,
  ChevronDown,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import BookingDetailsCollapse from "@/components/admin/BookingDetailsCollapse";

interface TrekLead {
  id: string;
  name: string;
  email: string;
}

interface BookingParticipant {
  id: string;
  isPrimary: boolean;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  gender: string | null;
  age: number | null;
  bloodGroup: string | null;
  emergencyContactName: string | null;
  emergencyContactNumber: string | null;
  emergencyRelationship: string | null;
  pickupPoint: string | null;
  dropPoint: string | null;
}

interface Participant {
  id: string;
  participantCount: number;
  totalPrice: number;
  bookingStatus: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
  };
  participants: BookingParticipant[];
}

interface TripSlot {
  id: string;
  date: string;
  capacity: number;
  remainingCapacity: number;
  status: string;
  experienceId: string;
  experience: {
    id: string;
    title: string;
    location: string;
  };
  whatsAppUrl?: string | null;
  assignments: { trekLead: TrekLead }[];
  vendorContacts?: unknown;
}

export default function TripManifestPage() {
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<TripSlot | null>(null);
  const [manifest, setManifest] = useState<Participant[]>([]);
  const [availableLeads, setAvailableLeads] = useState<TrekLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleForceCompleteTrip = async () => {
    if (!globalThis.confirm("Are you sure you want to end/complete this trip? This will mark the trip status as COMPLETED and allow experience/slot deletions.")) return;

    setIsCompleting(true);
    setError("");
    try {
      const res = await fetch(`/api/manager/trips/${tripId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerNote: "Completed by Administrator" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete trip.");
      
      fetchTripDetails(); // Refresh slot details/status
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete trip.");
    } finally {
      setIsCompleting(false);
    }
  };

  // WhatsApp Group Link state
  const [whatsAppUrl, setWhatsAppUrl] = useState("");
  const [isSavingWhatsAppUrl, setIsSavingWhatsAppUrl] = useState(false);
  const [whatsAppUrlSaved, setWhatsAppUrlSaved] = useState(false);
  const [whatsAppUrlError, setWhatsAppUrlError] = useState("");

  const handleExport = async () => {
    if (manifest.length === 0 || !trip) {
      alert("No confirmed bookings to export.");
      return;
    }

    setIsExporting(true);
    try {
      const rows = manifest.flatMap((booking) => {
        // If there are no participants, fallback to lead booker info as a row
        if (!booking.participants || booking.participants.length === 0) {
          return [
            {
              "Trek/Experience": trip.experience.title,
              "Departure Date": new Date(trip.date),
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

        return booking.participants.map((p) => ({
          "Trek/Experience": trip.experience.title,
          "Departure Date": new Date(trip.date),
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
          const valStr = row[key] instanceof Date
            ? row[key].toISOString().split("T")[0]
            : String(row[key] ?? "");
          if (valStr.length > maxLens[key]) {
            maxLens[key] = valStr.length;
          }
        });
      });

      worksheet["!cols"] = Object.keys(maxLens).map((key) => ({
        wch: Math.max(maxLens[key] + 3, 10),
      }));

      const dateStr = new Date(trip.date).toISOString().split("T")[0];
      const sanitizedTitle = trip.experience.title.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `${sanitizedTitle}_manifest_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export manifest. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const fetchTripDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/manager/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch trip details");
      const data = await res.json();
      if (data.slot) {
        setTrip(data.slot);
        setWhatsAppUrl(data.slot.whatsAppUrl ?? "");
      }
    } catch (err) {
      console.error(err);
    }
  }, [tripId]);

  const fetchManifest = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/trips/${tripId}/manifest`);
      const data = await res.json();
      setManifest(data.manifest || []);
    } catch (err) {
      console.error(err);
    }
  }, [tripId]);

  const fetchTrekLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users?role=TREK_LEAD");
      const data = await res.json();
      setAvailableLeads(data.users || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchTripDetails(), fetchManifest(), fetchTrekLeads()]).then(
      () => setIsLoading(false),
    );
  }, [fetchTripDetails, fetchManifest, fetchTrekLeads]);

  const handleAssignLead = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    setIsAssigning(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/trips/${tripId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedLeadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign lead.");

      setSelectedLeadId("");
      fetchTripDetails(); // Refresh assignments
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign lead.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveLead = async (userId: string) => {
    if (!globalThis.confirm("Remove this Trek Lead from the trip?")) return;

    try {
      const res = await fetch(
        `/api/admin/trips/${tripId}/assign?userId=${userId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to remove lead.");

      fetchTripDetails();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to remove lead.");
    }
  };

  const saveWhatsAppUrl = async () => {
    setIsSavingWhatsAppUrl(true);
    setWhatsAppUrlSaved(false);
    setWhatsAppUrlError("");

    if (whatsAppUrl && !whatsAppUrl.startsWith("http://") && !whatsAppUrl.startsWith("https://")) {
      setWhatsAppUrlError("URL must start with http:// or https://");
      setIsSavingWhatsAppUrl(false);
      return;
    }

    try {
      const res = await fetch(`/api/manager/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsAppUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save WhatsApp group link");
      setWhatsAppUrlSaved(true);
      setTimeout(() => setWhatsAppUrlSaved(false), 3000);
    } catch (err: unknown) {
      setWhatsAppUrlError(
        err instanceof Error ? err.message : "Failed to save WhatsApp group link"
      );
    } finally {
      setIsSavingWhatsAppUrl(false);
    }
  };

  const getWhatsAppIcon = () => {
    if (isSavingWhatsAppUrl) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (whatsAppUrlSaved) return <Check className="w-4 h-4" />;
    return <Save className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Trip not found</h2>
        <Link
          href="/admin/trips"
          className="text-primary hover:underline mt-4 inline-block"
        >
          Return to Trips
        </Link>
      </div>
    );
  }

  const bookedCount = trip.capacity - trip.remainingCapacity;
  const isPast = new Date(trip.date) < new Date();

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/trips"
          className="p-2 hover:bg-foreground/10 rounded-full transition-colors text-foreground/50 hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {trip.experience.title}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-foreground/60 text-sm">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {new Date(trip.date).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {trip.experience.location || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Manifest */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">
                  Participant Manifest
                </h2>
              </div>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || manifest.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-foreground/5 hover:bg-foreground/10 border border-border rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export Excel (.xlsx)"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExporting ? "Exporting..." : "Export"}
              </button>
            </div>

            {manifest.length === 0 ? (
              <div className="p-12 text-center text-foreground/50">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No confirmed bookings yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {manifest.map((p, ix) => {
                  const isExpanded = expandedBookingId === p.id;
                  return (
                    <div key={p.id} className="border-b border-border last:border-0">
                      <button
                        type="button"
                        onClick={() => setExpandedBookingId(isExpanded ? null : p.id)}
                        aria-label={`View participant details for ${p.user.name}`}
                        aria-expanded={isExpanded}
                        className="w-full text-left p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:bg-foreground/[0.04] cursor-pointer transition-colors outline-none focus-visible:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {ix + 1}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              {p.user.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-foreground/60">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {p.user.email}
                              </span>
                              {p.user.phoneNumber && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {p.user.phoneNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-auto sm:ml-0">
                          <div className="bg-foreground/5 border border-border px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap text-center">
                            {p.participantCount} Guest
                            {p.participantCount === 1 ? "" : "s"}
                          </div>
                          <ChevronDown className={`w-5 h-5 text-foreground/45 transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden bg-foreground/[0.01] border-t border-border/50"
                          >
                            <div className="p-6 border-b border-border/50">
                              <BookingDetailsCollapse booking={p} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-foreground/[0.02] border-t border-border px-6 py-4 flex items-center justify-between text-sm font-medium">
              <span className="text-foreground/60">
                Total Confirmed Guests:
              </span>
              <span className="text-lg text-foreground font-bold">
                {manifest.reduce((acc, p) => acc + p.participantCount, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Trek Leads & Stats */}
        <div className="space-y-6">
          {/* Trip Status & Force End */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-2">
                Trip Status
              </h3>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${trip.status === "COMPLETED" ? "bg-green-500" : "bg-blue-500 animate-pulse"}`} />
                <span className="font-bold text-foreground capitalize">
                  {trip.status.toLowerCase().replace("_", " ")}
                </span>
              </div>
            </div>

            {trip.status !== "COMPLETED" && (
              <button
                type="button"
                onClick={handleForceCompleteTrip}
                disabled={isCompleting}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCompleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "End / Complete Trip"
                )}
              </button>
            )}
          </div>

          {/* Capacity Snapshot */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-4">
              Capacity Status
            </h3>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-black text-foreground">
                {bookedCount}
              </span>
              <span className="text-foreground/50 font-medium pb-1">
                / {trip.capacity} Booked
              </span>
            </div>
            <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min((bookedCount / trip.capacity) * 100, 100)}%`,
                }}
              />
            </div>
            {isPast && (
              <div className="mt-4 text-sm font-medium text-orange-500 bg-orange-500/10 px-3 py-2 rounded-lg text-center">
                This trip has already occurred.
              </div>
            )}
          </div>

          {/* Trek Lead Management */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Assigned Trek Leads
            </h3>

            <div className="space-y-3 mb-6">
              {trip.assignments.length === 0 ? (
                <div className="text-sm text-foreground/50 italic">
                  No Trek Leads assigned yet.
                </div>
              ) : (
                trip.assignments.map((a) => (
                  <div
                    key={a.trekLead.id}
                    className="flex items-center justify-between bg-background border border-border p-3 rounded-xl"
                  >
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {a.trekLead.name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveLead(a.trekLead.id)}
                      className="p-1.5 text-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleAssignLead}
              className="space-y-3 border-t border-border pt-5 mt-5"
            >
              <h4 className="text-xs font-bold text-foreground/50 uppercase">
                Assign New Lead
              </h4>
              <select
                required
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="" disabled>
                  Select a Trek Lead...
                </option>
                {availableLeads.map((lead) => (
                  <option
                    key={lead.id}
                    value={lead.id}
                    disabled={trip.assignments.some(
                      (a) => a.trekLead.id === lead.id,
                    )}
                  >
                    {lead.name}{" "}
                    {trip.assignments.some((a) => a.trekLead.id === lead.id)
                      ? "(Assigned)"
                      : ""}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isAssigning || !selectedLeadId}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-foreground border border-border text-background rounded-xl font-bold hover:bg-foreground/90 disabled:opacity-50 transition-colors text-sm"
              >
                <UserPlus className="w-4 h-4" />
                {isAssigning ? "Assigning..." : "Assign Lead"}
              </button>
            </form>
          </div>

          {/* WhatsApp Group Link */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.26-4.821c1.644.976 3.255 1.489 4.887 1.49 5.541.002 10.051-4.505 10.054-10.046.002-2.684-1.038-5.207-2.93-7.099-1.892-1.892-4.409-2.934-7.098-2.935-5.552 0-10.06 4.507-10.064 10.049-.002 1.776.47 3.51 1.365 5.048l-1.01 3.688 3.796-1.195zm11.38-4.526c-.305-.153-1.805-.89-2.083-.99-.278-.102-.48-.153-.68.152-.2.304-.775.98-.95 1.18-.175.203-.35.229-.655.076-1.879-.942-3.153-2.046-4.148-3.754-.262-.451.262-.418.75-1.393.076-.153.038-.288-.019-.402-.057-.113-.48-1.157-.658-1.585-.173-.415-.347-.359-.48-.365-.123-.005-.264-.006-.405-.006s-.37.053-.564.264c-.194.21-.74.723-.74 1.761s.755 2.039.86 2.179c.107.14 1.488 2.274 3.602 3.185.503.216.896.346 1.203.443.506.161.966.138 1.33.084.405-.06 1.805-.738 2.062-1.45.258-.713.258-1.322.18-1.45-.078-.127-.283-.203-.588-.356z" />
              </svg>
              WhatsApp Group Link
            </h3>
            <p className="text-xs text-foreground/50 leading-relaxed">
              Provide the invite link for the participants&apos; WhatsApp group. Once saved, it will show up automatically under their bookings.
            </p>
            <div className="space-y-3">
              <input
                type="url"
                value={whatsAppUrl}
                onChange={(e) => setWhatsAppUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
              {whatsAppUrlError && (
                <p className="text-xs text-red-400 font-medium">{whatsAppUrlError}</p>
              )}
              <button
                onClick={saveWhatsAppUrl}
                disabled={isSavingWhatsAppUrl}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-foreground border border-border text-background rounded-xl font-bold hover:bg-foreground/90 disabled:opacity-50 transition-colors text-sm"
              >
                {getWhatsAppIcon()}
                {whatsAppUrlSaved ? "Saved!" : "Save Link"}
              </button>
            </div>
          </div>

          {/* Trip Operations & Vendor Details */}
          {!!trip.vendorContacts && (() => {
            const raw = trip.vendorContacts as Record<string, unknown> | null;
            const isStructured = raw && typeof raw === "object" && !Array.isArray(raw);
            
            interface StayDetail {
              name: string;
              address?: string;
              location?: string;
              contactNumber?: string;
              locationLink?: string;
            }

            interface TransportDetail {
              driverName: string;
              vehicleType?: string;
              vehicleNumber?: string;
              contactNumber?: string;
            }

            interface OtherContact {
              label: string;
              value: string;
            }

            let stays: StayDetail[] = [];
            let transports: TransportDetail[] = [];
            let other: OtherContact[] = [];

            if (isStructured) {
              stays = (raw.stays as StayDetail[]) ?? [];
              transports = (raw.transports as TransportDetail[]) ?? [];
              other = (raw.otherContacts as OtherContact[]) ?? [];
            } else if (Array.isArray(raw)) {
              other = raw as OtherContact[];
            }

            const hasData = stays.length > 0 || transports.length > 0 || other.length > 0;
            if (!hasData) return null;

            return (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider flex items-center gap-2">
                  Trip Operations & Vendor Details
                </h3>
                
                <div className="space-y-5">
                  {/* Stays */}
                  {stays.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-foreground/50 uppercase">Stays / Lodging</h4>
                      <div className="space-y-3">
                        {stays.map((s: StayDetail) => (
                          <div key={`stay-${s.name}-${s.location}`} className="bg-foreground/[0.02] border border-border/50 rounded-xl p-3 space-y-1">
                            <p className="font-semibold text-foreground text-sm">{s.name}</p>
                            <p className="text-xs text-foreground/60">{s.address}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
                              <span className="text-foreground/50">{s.location}</span>
                              {s.contactNumber && (
                                <a href={`tel:${s.contactNumber}`} className="text-primary hover:underline flex items-center gap-1 font-medium">
                                  <Phone className="w-3 h-3" /> Call
                                </a>
                              )}
                              {s.locationLink && (
                                <a href={s.locationLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                                  Maps ↗
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transports */}
                  {transports.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-foreground/50 uppercase">Transport & Drivers</h4>
                      <div className="space-y-3">
                        {transports.map((t: TransportDetail) => (
                          <div key={`transport-${t.driverName}-${t.vehicleNumber}`} className="bg-foreground/[0.02] border border-border/50 rounded-xl p-3 space-y-1">
                            <p className="font-semibold text-foreground text-sm">{t.driverName}</p>
                            <p className="text-xs text-foreground/60">{t.vehicleType} · <span className="font-mono">{t.vehicleNumber}</span></p>
                            {t.contactNumber && (
                              <div className="pt-1">
                                <a href={`tel:${t.contactNumber}`} className="text-primary hover:underline flex items-center gap-1 text-xs font-medium">
                                  <Phone className="w-3 h-3" /> {t.contactNumber}
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Contacts */}
                  {other.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-foreground/50 uppercase">Other Contacts</h4>
                      <div className="bg-foreground/[0.02] border border-border/50 rounded-xl p-3 space-y-2">
                        {other.map((vc: OtherContact) => (
                          <div key={`other-${vc.label}-${vc.value}`} className="flex justify-between text-xs py-0.5 border-b border-border/30 last:border-0">
                            <span className="text-foreground/50">{vc.label}</span>
                            <span className="font-medium text-foreground">{vc.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
