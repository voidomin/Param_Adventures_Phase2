"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  UserCheck,
  UserPlus,
  Phone,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  X,
  Check,
  Play,
  FlagOff,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import BookingDetailsCollapse, { BookingParticipant } from "@/components/admin/BookingDetailsCollapse";

interface TrekLead {
  id: string;
  name: string;
  email: string;
}

interface Booking {
  id: string;
  participantCount: number;
  participants: BookingParticipant[];
  user: { id: string; name: string; email: string; phoneNumber: string | null };
}

interface VendorContact {
  _id: string; // stable client-side key
  label: string;
  value: string;
}

interface StayDetails {
  _id: string;
  name: string;
  contactNumber: string;
  location: string;
  locationLink: string;
  address: string;
}

interface TransportDetails {
  _id: string;
  driverName: string;
  contactNumber: string;
  vehicleNumber: string;
  vehicleType: string;
}

interface StructuredVendorContacts {
  stays?: Partial<StayDetails>[];
  transports?: Partial<TransportDetails>[];
  otherContacts?: VendorContact[];
}

interface TripSlot {
  id: string;
  date: string;
  capacity: number;
  remainingCapacity: number;
  status: string;
  vendorContacts: unknown;
  whatsAppUrl?: string | null;
  experience: {
    title: string;
    location: string;
    durationDays: number;
    difficulty: string;
    images: string[];
  };
  assignments: { trekLead: TrekLead }[];
  bookings: Booking[];
  tripLog?: {
    trekLeadNote?: string | null;
    managerNote?: string | null;
  } | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ConfirmedParticipantsTable({
  bookings,
  totalParticipants,
}: Readonly<{
  bookings: readonly Booking[];
  totalParticipants: number;
}>) {
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  if (bookings.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Confirmed Participants</h2>
        <p className="text-foreground/50 text-sm">No confirmed bookings yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h2 className="text-lg font-bold text-foreground mb-4">
        Confirmed Participants ({bookings.length} booking
        {bookings.length === 1 ? "" : "s"} · {totalParticipants} people)
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-foreground/40 border-b border-border">
              <th className="pb-3 pr-4 font-semibold">#</th>
              <th className="pb-3 pr-4 font-semibold">Name</th>
              <th className="pb-3 pr-4 font-semibold">Email</th>
              <th className="pb-3 pr-4 font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone
              </th>
              <th className="pb-3 font-semibold text-right">Participants</th>
              <th className="pb-3 font-semibold text-right w-10"></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking, idx) => {
              const isExpanded = expandedBookingId === booking.id;
              return (
                <Fragment key={booking.id}>
                  <tr className="border-b border-border/50 last:border-0 hover:bg-foreground/[0.01] transition-colors">
                    <td className="py-3 pr-4 text-foreground/40">{idx + 1}</td>
                    <td className="py-3 pr-4 font-medium text-foreground">
                      {booking.user.name}
                    </td>
                    <td className="py-3 pr-4 text-foreground/60">
                      {booking.user.email}
                    </td>
                    <td className="py-3 pr-4 text-foreground/60">
                      {booking.user.phoneNumber ?? "—"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="font-semibold text-foreground mb-1">
                        {booking.participantCount}
                      </div>
                      {booking.participants && booking.participants.length > 0 && (
                        <div className="text-xs text-foreground/50 space-y-0.5 mt-1 border-t border-border/50 pt-1 inline-block">
                          {booking.participants
                            .filter((p) => !p.isCancelled)
                            .map((p) => (
                              <div key={p.id}>{p.name}</div>
                            ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right pl-4">
                      <button
                        type="button"
                        onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                        className="p-1.5 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                        title={isExpanded ? "Hide Details" : "View Booking & Guest Details"}
                        aria-expanded={isExpanded}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="p-0 bg-foreground/[0.01]">
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden border-b border-border/50"
                          >
                            <div className="p-6">
                              <BookingDetailsCollapse booking={booking} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function parseVendorContacts(rawContacts: unknown) {
  let parsedStays: StayDetails[] = [];
  let parsedTransports: TransportDetails[] = [];
  let parsedContacts: VendorContact[] = [];

  if (rawContacts && typeof rawContacts === "object" && !Array.isArray(rawContacts)) {
    const raw = rawContacts as StructuredVendorContacts;
    parsedStays = (raw.stays ?? []).map((s: Partial<StayDetails>) => ({
      _id: s._id || crypto.randomUUID(),
      name: s.name ?? "",
      contactNumber: s.contactNumber ?? "",
      location: s.location ?? "",
      locationLink: s.locationLink ?? "",
      address: s.address ?? "",
    }));
    parsedTransports = (raw.transports ?? []).map((t: Partial<TransportDetails>) => ({
      _id: t._id || crypto.randomUUID(),
      driverName: t.driverName ?? "",
      contactNumber: t.contactNumber ?? "",
      vehicleNumber: t.vehicleNumber ?? "",
      vehicleType: t.vehicleType ?? "",
    }));
    parsedContacts = (raw.otherContacts ?? []).map((c: Partial<VendorContact>) => ({
      _id: c._id || crypto.randomUUID(),
      label: c.label ?? "",
      value: c.value ?? "",
    }));
  } else {
    const flatContacts = rawContacts as Partial<VendorContact>[] | null | undefined;
    parsedContacts = (flatContacts ?? []).map((c: Partial<VendorContact>) => ({
      _id: crypto.randomUUID(),
      label: c.label ?? "",
      value: c.value ?? "",
    }));
  }

  return { stays: parsedStays, transports: parsedTransports, contacts: parsedContacts };
}

function buildContactsPayload(
  stays: StayDetails[],
  transports: TransportDetails[],
  contacts: VendorContact[]
) {
  const staysPayload = stays.map(({ name, contactNumber, location, locationLink, address }) => ({
    name,
    contactNumber,
    location,
    locationLink,
    address,
  }));
  const transportsPayload = transports.map(({ driverName, contactNumber, vehicleNumber, vehicleType }) => ({
    driverName,
    contactNumber,
    vehicleNumber,
    vehicleType,
  }));
  const otherContactsPayload = contacts.map(({ label, value }) => ({ label, value }));

  return {
    stays: staysPayload,
    transports: transportsPayload,
    otherContacts: otherContactsPayload,
  };
}

interface StaysListEditorProps {
  stays: StayDetails[];
  addStay: () => void;
  removeStay: (id: string) => void;
  updateStay: (id: string, key: keyof Omit<StayDetails, "_id">, val: string) => void;
}

function StaysListEditor({ stays, addStay, removeStay, updateStay }: Readonly<StaysListEditorProps>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
          {" Lodging / Stays"}
        </h3>
        <button
          type="button"
          onClick={addStay}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Stay
        </button>
      </div>

      {stays.length === 0 ? (
        <p className="text-xs text-foreground/40 italic pl-8">No lodging/stays added yet.</p>
      ) : (
        <div className="space-y-4 pl-8">
          {stays.map((s) => (
            <div key={s._id} className="relative bg-foreground/[0.01] border border-border/50 rounded-2xl p-5 pt-10 space-y-4 shadow-xs">
              <button
                type="button"
                onClick={() => removeStay(s._id)}
                className="absolute top-3 right-3 text-foreground/30 hover:text-red-500 transition-colors cursor-pointer"
                aria-label="Remove stay"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor={`stay-name-${s._id}`} className="text-xs font-medium text-foreground/50">Stay Name</label>
                  <input
                    id={`stay-name-${s._id}`}
                    type="text"
                    value={s.name}
                    onChange={(e) => updateStay(s._id, "name", e.target.value)}
                    placeholder="e.g. Hotel Mountain View"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`stay-contact-${s._id}`} className="text-xs font-medium text-foreground/50">Contact Number</label>
                  <input
                    id={`stay-contact-${s._id}`}
                    type="text"
                    value={s.contactNumber}
                    onChange={(e) => updateStay(s._id, "contactNumber", e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`stay-location-${s._id}`} className="text-xs font-medium text-foreground/50">Location / City</label>
                  <input
                    id={`stay-location-${s._id}`}
                    type="text"
                    value={s.location}
                    onChange={(e) => updateStay(s._id, "location", e.target.value)}
                    placeholder="e.g. Manali"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`stay-link-${s._id}`} className="text-xs font-medium text-foreground/50">Location Link (Google Maps)</label>
                  <input
                    id={`stay-link-${s._id}`}
                    type="text"
                    value={s.locationLink}
                    onChange={(e) => updateStay(s._id, "locationLink", e.target.value)}
                    placeholder="e.g. https://maps.google.com/..."
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor={`stay-address-${s._id}`} className="text-xs font-medium text-foreground/50">Physical Address</label>
                <textarea
                  id={`stay-address-${s._id}`}
                  value={s.address}
                  onChange={(e) => updateStay(s._id, "address", e.target.value)}
                  placeholder="e.g. Near Mall Road, Manali, HP"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TransportsListEditorProps {
  transports: TransportDetails[];
  addTransport: () => void;
  removeTransport: (id: string) => void;
  updateTransport: (id: string, key: keyof Omit<TransportDetails, "_id">, val: string) => void;
}

function TransportsListEditor({ transports, addTransport, removeTransport, updateTransport }: Readonly<TransportsListEditorProps>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
          {" Transport Drivers"}
        </h3>
        <button
          type="button"
          onClick={addTransport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Driver
        </button>
      </div>

      {transports.length === 0 ? (
        <p className="text-xs text-foreground/40 italic pl-8">No transport driver details added yet.</p>
      ) : (
        <div className="space-y-4 pl-8">
          {transports.map((t) => (
            <div key={t._id} className="relative bg-foreground/[0.01] border border-border/50 rounded-2xl p-5 pt-10 space-y-4 shadow-xs">
              <button
                type="button"
                onClick={() => removeTransport(t._id)}
                className="absolute top-3 right-3 text-foreground/30 hover:text-red-500 transition-colors cursor-pointer"
                aria-label="Remove driver"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor={`driver-name-${t._id}`} className="text-xs font-medium text-foreground/50">Driver Name</label>
                  <input
                    id={`driver-name-${t._id}`}
                    type="text"
                    value={t.driverName}
                    onChange={(e) => updateTransport(t._id, "driverName", e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`driver-contact-${t._id}`} className="text-xs font-medium text-foreground/50">Contact Number</label>
                  <input
                    id={`driver-contact-${t._id}`}
                    type="text"
                    value={t.contactNumber}
                    onChange={(e) => updateTransport(t._id, "contactNumber", e.target.value)}
                    placeholder="e.g. +91 98765 12345"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`driver-vehicle-${t._id}`} className="text-xs font-medium text-foreground/50">Vehicle Number</label>
                  <input
                    id={`driver-vehicle-${t._id}`}
                    type="text"
                    value={t.vehicleNumber}
                    onChange={(e) => updateTransport(t._id, "vehicleNumber", e.target.value)}
                    placeholder="e.g. KA-51-AB-1234"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`driver-type-${t._id}`} className="text-xs font-medium text-foreground/50">Vehicle Type / Model</label>
                  <input
                    id={`driver-type-${t._id}`}
                    type="text"
                    value={t.vehicleType}
                    onChange={(e) => updateTransport(t._id, "vehicleType", e.target.value)}
                    placeholder="e.g. Tempo Traveler / Force"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManagerTripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slotId = params.id as string;

  const [slot, setSlot] = useState<TripSlot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  // State managed internally inside table component

  // Vendor contacts editing state
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [stays, setStays] = useState<StayDetails[]>([]);
  const [transports, setTransports] = useState<TransportDetails[]>([]);
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [contactsSaved, setContactsSaved] = useState(false);

  // WhatsApp Group Link editing state
  const [whatsAppUrl, setWhatsAppUrl] = useState("");
  const [isSavingWhatsAppUrl, setIsSavingWhatsAppUrl] = useState(false);
  const [whatsAppUrlSaved, setWhatsAppUrlSaved] = useState(false);
  const [whatsAppUrlError, setWhatsAppUrlError] = useState("");

  // Trek Lead assignment
  const [availableLeads, setAvailableLeads] = useState<TrekLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [isAssigningLead, setIsAssigningLead] = useState(false);
  const [leadAssignError, setLeadAssignError] = useState("");
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Start Trip
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // Complete Trip (Phase 5)
  const [managerNote, setManagerNote] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");

  const fetchSlot = useCallback(async () => {
    try {
      const res = await fetch(`/api/manager/trips/${slotId}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to fetch");
      }
      const data = await res.json();
      setSlot(data.slot);
      setWhatsAppUrl(data.slot.whatsAppUrl ?? "");
      
      const { stays: parsedStays, transports: parsedTransports, contacts: parsedContacts } = parseVendorContacts(data.slot.vendorContacts);
      setStays(parsedStays);
      setTransports(parsedTransports);
      setContacts(parsedContacts);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load trip");
    } finally {
      setIsLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    fetchSlot();
    fetch("/api/admin/users/trek-leads")
      .then((r) => r.json())
      .then((d) => setAvailableLeads(d.trekLeads ?? []))
      .catch(console.error);
  }, [fetchSlot]);

  // ─── Stays ─────────────────────────────────────────────────
  const addStay = () =>
    setStays((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        name: "",
        contactNumber: "",
        location: "",
        locationLink: "",
        address: "",
      },
    ]);

  const removeStay = (id: string) =>
    setStays((prev) => prev.filter((s) => s._id !== id));

  const updateStay = (id: string, key: keyof Omit<StayDetails, "_id">, val: string) =>
    setStays((prev) =>
      prev.map((s) => (s._id === id ? { ...s, [key]: val } : s)),
    );

  // ─── Transports ────────────────────────────────────────────
  const addTransport = () =>
    setTransports((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        driverName: "",
        contactNumber: "",
        vehicleNumber: "",
        vehicleType: "",
      },
    ]);

  const removeTransport = (id: string) =>
    setTransports((prev) => prev.filter((t) => t._id !== id));

  const updateTransport = (id: string, key: keyof Omit<TransportDetails, "_id">, val: string) =>
    setTransports((prev) =>
      prev.map((t) => (t._id === id ? { ...t, [key]: val } : t)),
    );

  // ─── Vendor Contacts ───────────────────────────────────────
  const addContact = () =>
    setContacts((prev) => [
      ...prev,
      { _id: crypto.randomUUID(), label: "", value: "" },
    ]);

  const removeContact = (id: string) =>
    setContacts((prev) => prev.filter((c) => c._id !== id));

  const updateContact = (id: string, key: "label" | "value", val: string) =>
    setContacts((prev) =>
      prev.map((c) => (c._id === id ? { ...c, [key]: val } : c)),
    );

  const saveContacts = async () => {
    setIsSavingContacts(true);
    setContactsSaved(false);
    try {
      const payload = buildContactsPayload(stays, transports, contacts);

      const res = await fetch(`/api/manager/trips/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorContacts: payload }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setContactsSaved(true);
      setTimeout(() => setContactsSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingContacts(false);
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
      const res = await fetch(`/api/manager/trips/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsAppUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setWhatsAppUrlSaved(true);
      setTimeout(() => setWhatsAppUrlSaved(false), 3000);
    } catch (e: unknown) {
      setWhatsAppUrlError(
        e instanceof Error ? e.message : "Failed to save WhatsApp group link"
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

  // ─── Trek Lead Assignment ──────────────────────────────────
  const assignedLeadIds = slot?.assignments.map((a) => a.trekLead.id) ?? [];
  const unassignedLeads = availableLeads.filter(
    (l) => !assignedLeadIds.includes(l.id),
  );

  const handleAssignLead = async () => {
    if (!selectedLeadId) return;
    setIsAssigningLead(true);
    setLeadAssignError("");
    try {
      const res = await fetch(`/api/admin/trips/${slotId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedLeadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign");
      setShowLeadModal(false);
      setSelectedLeadId("");
      await fetchSlot();
    } catch (e: unknown) {
      setLeadAssignError(
        e instanceof Error ? e.message : "Failed to assign trek lead",
      );
    } finally {
      setIsAssigningLead(false);
    }
  };

  const handleRemoveLead = async (userId: string) => {
    try {
      await fetch(
        `/api/admin/trips/${slotId}/assign?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      await fetchSlot();
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Start Trip ────────────────────────────────────────────
  const handleStartTrip = async () => {
    setIsStarting(true);
    setStartError("");
    try {
      const res = await fetch(`/api/manager/trips/${slotId}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start trip");
      await fetchSlot(); // refresh status badge
    } catch (e: unknown) {
      setStartError(e instanceof Error ? e.message : "Failed to start trip");
    } finally {
      setIsStarting(false);
    }
  };

  // ─── Complete Trip ────────────────────────────────────────
  const handleCompleteTrip = async () => {
    setIsCompleting(true);
    setCompleteError("");
    try {
      const res = await fetch(`/api/manager/trips/${slotId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete trip");
      await fetchSlot();
    } catch (e: unknown) {
      setCompleteError(
        e instanceof Error ? e.message : "Failed to complete trip",
      );
    } finally {
      setIsCompleting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────
  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );

  if (error || !slot)
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-400 font-medium">{error || "Trip not found"}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 text-sm text-foreground/60 hover:text-foreground"
        >
          ← Go back
        </button>
      </div>
    );

  const totalParticipants = slot.bookings.reduce(
    (sum, b) => sum + b.participantCount,
    0,
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back */}
      <Link
        href="/dashboard/manager"
        className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Trips
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              {slot.experience.title}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 text-sm text-foreground/60">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" /> {formatDate(slot.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {slot.experience.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {totalParticipants} participant
                {totalParticipants === 1 ? "" : "s"} confirmed
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                slot.status === "ACTIVE"
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }`}
            >
              {slot.status.replace("_", " ")}
            </div>

            {/* Start Trip button — only show when UPCOMING */}
            {slot.status === "UPCOMING" && (
              <button
                type="button"
                onClick={handleStartTrip}
                disabled={isStarting || slot.assignments.length === 0}
                title={
                  slot.assignments.length === 0
                    ? "Assign at least one Trek Lead first"
                    : "Start this trip"
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-green-900/30"
              >
                {isStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                {isStarting ? "Starting..." : "Start Trip"}
              </button>
            )}
          </div>
        </div>

        {/* Start error */}
        {startError && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {startError}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* ── Trek Lead Assignment ── */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Trek Leads</h2>
              <button
                type="button"
                onClick={() => {
                  setShowLeadModal(true);
                  setLeadAssignError("");
                  setSelectedLeadId("");
                }}
                disabled={unassignedLeads.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" /> Assign Lead
              </button>
            </div>

            {slot.assignments.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                No Trek Lead assigned yet. Assign at least one before starting.
              </div>
            ) : (
              <div className="space-y-2">
                {slot.assignments.map((a) => (
                  <div
                    key={a.trekLead.id}
                    className="flex items-center justify-between px-4 py-3 bg-foreground/5 border border-border rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {a.trekLead.name}
                        </p>
                        <p className="text-xs text-foreground/50">
                          {a.trekLead.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLead(a.trekLead.id)}
                      className="text-foreground/30 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── WhatsApp Group Link ── */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              <svg className="w-5 h-5 text-green-500 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.26-4.821c1.644.976 3.255 1.489 4.887 1.49 5.541.002 10.051-4.505 10.054-10.046.002-2.684-1.038-5.207-2.93-7.099-1.892-1.892-4.409-2.934-7.098-2.935-5.552 0-10.06 4.507-10.064 10.049-.002 1.776.47 3.51 1.365 5.048l-1.01 3.688 3.796-1.195zm11.38-4.526c-.305-.153-1.805-.89-2.083-.99-.278-.102-.48-.153-.68.152-.2.304-.775.98-.95 1.18-.175.203-.35.229-.655.076-1.879-.942-3.153-2.046-4.148-3.754-.262-.451.262-.418.75-1.393.076-.153.038-.288-.019-.402-.057-.113-.48-1.157-.658-1.585-.173-.415-.347-.359-.48-.365-.123-.005-.264-.006-.405-.006s-.37.053-.564.264c-.194.21-.74.723-.74 1.761s.755 2.039.86 2.179c.107.14 1.488 2.274 3.602 3.185.503.216.896.346 1.203.443.506.161.966.138 1.33.084.405-.06 1.805-.738 2.062-1.45.258-.713.258-1.322.18-1.45-.078-.127-.283-.203-.588-.356z" />
              </svg>
              <h2 className="text-lg font-bold">WhatsApp Group Link</h2>
            </div>
            <p className="text-sm text-foreground/50 leading-relaxed">
              Provide the invite link for the participants&apos; WhatsApp group. Once saved, it will show up automatically under their bookings.
            </p>
            <div className="space-y-3">
              <input
                type="url"
                value={whatsAppUrl}
                onChange={(e) => setWhatsAppUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {whatsAppUrlError && (
                <p className="text-xs text-red-400">{whatsAppUrlError}</p>
              )}
              <button
                type="button"
                onClick={saveWhatsAppUrl}
                disabled={isSavingWhatsAppUrl}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:scale-105 transition-transform disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {getWhatsAppIcon()}
                {whatsAppUrlSaved ? "Saved!" : "Save Link"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── Trip Operations & Vendor Details ── */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Trip Operations & Vendor Details
              </h2>
              <p className="text-sm text-foreground/50 mt-1">
                Manage lodging/stays, transport drivers, and other operational contacts for this trip.
              </p>
            </div>

            <hr className="border-border/50" />

            <StaysListEditor
              stays={stays}
              addStay={addStay}
              removeStay={removeStay}
              updateStay={updateStay}
            />

            <hr className="border-border/30 pl-8" />

            <TransportsListEditor
              transports={transports}
              addTransport={addTransport}
              removeTransport={removeTransport}
              updateTransport={updateTransport}
            />

            <hr className="border-border/30 pl-8" />

            {/* 3. Other Contacts Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                  {" Other Operational Contacts"}
                </h3>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Contact
                </button>
              </div>

              {contacts.length === 0 ? (
                <p className="text-xs text-foreground/40 italic pl-8">No other operational contacts added yet.</p>
              ) : (
                <div className="space-y-2 pl-8">
                  {contacts.map((c) => (
                    <div key={c._id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={c.label}
                        aria-label="Contact label"
                        onChange={(e) => updateContact(c._id, "label", e.target.value)}
                        placeholder="Label (e.g. Cook)"
                        className="w-1/3 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <input
                        type="text"
                        value={c.value}
                        aria-label="Contact value"
                        onChange={(e) => updateContact(c._id, "value", e.target.value)}
                        placeholder="Value (e.g. +91 99999...)"
                        className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        type="button"
                        onClick={() => removeContact(c._id)}
                        className="text-foreground/30 hover:text-red-500 transition-colors cursor-pointer"
                        aria-label="Remove contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-border/50" />

            <button
              type="button"
              onClick={saveContacts}
              disabled={isSavingContacts}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:scale-105 transition-transform disabled:opacity-50 shadow-lg shadow-primary/20 cursor-pointer"
            >
              {(() => {
                if (isSavingContacts) return <Loader2 className="w-4 h-4 animate-spin" />;
                if (contactsSaved) return <Check className="w-4 h-4" />;
                return <Save className="w-4 h-4" />;
              })()}
              {contactsSaved ? "Saved Details!" : "Save Operations Details"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Confirmed Participants ── */}
      <ConfirmedParticipantsTable bookings={slot.bookings} totalParticipants={totalParticipants} />

      {/* ── Completion Approval: only when TREK_ENDED ── */}
      {slot.status === "TREK_ENDED" && (
        <div className="bg-card border border-orange-500/20 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FlagOff className="w-5 h-5 text-orange-400" /> Trek Ended — Approve
            Completion
          </h2>

          {slot.tripLog?.trekLeadNote && (
            <div className="p-4 bg-foreground/5 border border-border rounded-xl space-y-1">
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">
                Trek Lead Note
              </p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {slot.tripLog.trekLeadNote}
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="manager-note"
              className="block text-sm font-medium text-foreground/60 mb-2"
            >
              Your note (optional)
            </label>
            <textarea
              id="manager-note"
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
              placeholder="Trip completed successfully. All participants safe. Great job by the trek lead team."
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          {completeError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {completeError}
            </div>
          )}

          <button
            type="button"
            onClick={handleCompleteTrip}
            disabled={isCompleting}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-50 shadow-lg shadow-purple-900/30"
          >
            {isCompleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isCompleting ? "Completing..." : "Approve & Complete Trip"}
          </button>
        </div>
      )}

      {slot.status === "COMPLETED" && (
        <div className="bg-card border border-purple-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-purple-400 font-bold mb-1">
            <CheckCircle className="w-5 h-5" /> Trip Completed!
          </div>
          <p className="text-sm text-foreground/60">
            This trip has been fully completed. Participants who attended can
            now write reviews.
          </p>
        </div>
      )}

      {/* Assign Trek Lead Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-border rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Assign Trek Lead</h2>
              <button
                type="button"
                onClick={() => setShowLeadModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {leadAssignError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {leadAssignError}
                </div>
              )}
              <div>
                <label
                  htmlFor="trek-lead-select"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Select Trek Lead
                </label>
                <select
                  id="trek-lead-select"
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">— Choose a trek lead —</option>
                  {unassignedLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignLead}
                  disabled={!selectedLeadId || isAssigningLead}
                  className="px-5 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2"
                >
                  {isAssigningLead ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
