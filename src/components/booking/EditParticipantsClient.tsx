"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, User, X, AlertTriangle, Edit2, ShieldAlert, CheckCircle2 } from "lucide-react";

interface SelectedAmenity {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

type NullableString = string | null;
type NullableNumber = number | null;
type DateOrStringOrNull = Date | string | null;

interface Participant {
  id: string;
  bookingId: string;
  isPrimary: boolean;
  name: string;
  email: NullableString;
  phoneNumber: NullableString;
  gender: NullableString;
  age: NullableNumber;
  dateOfBirth: DateOrStringOrNull;
  bloodGroup: NullableString;
  emergencyContactName: NullableString;
  emergencyContactNumber: NullableString;
  emergencyRelationship: NullableString;
  pickupPoint: NullableString;
  dropPoint: NullableString;
  selectedAmenities: any;
  isCancelled: boolean;
  cancelledAt: DateOrStringOrNull;
}

interface EditParticipantsClientProps {
  participants: Participant[];
  bookingId: string;
  pickupPoints: string[];
  dropPoints: string[];
}

function getAvatarStyle(isCancelled: boolean, isPrimary: boolean): string {
  if (isCancelled) return "bg-red-500/10 text-red-500 border border-red-500/20";
  if (isPrimary) return "bg-primary text-primary-foreground";
  return "bg-muted text-foreground/40";
}

const renderGuestBadge = (isCancelled: boolean, isPrimary: boolean, isMobile = false) => {
  const textClass = isMobile ? "text-[9px]" : "text-[8px]";
  const paddingClass = isMobile ? "px-2 py-0.5" : "px-1.5 py-0.5";
  if (isCancelled) {
    return (
      <span className={`w-fit ${textClass} bg-red-500/10 text-red-400 ${paddingClass} rounded uppercase font-black tracking-tighter mt-1`}>
        Cancelled
      </span>
    );
  }
  if (isPrimary) {
    return (
      <span className={`w-fit ${textClass} bg-primary/10 text-primary ${paddingClass} rounded uppercase font-black tracking-tighter mt-1`}>
        Primary Host
      </span>
    );
  }
  return null;
};

export default function EditParticipantsClient({
  participants,
  bookingId,
  pickupPoints,
  dropPoints,
}: Readonly<EditParticipantsClientProps>) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [cancellingParticipants, setCancellingParticipants] = useState<Participant[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [isCancelSuccess, setIsCancelSuccess] = useState(false);
  const [cancelRefundAmount, setCancelRefundAmount] = useState(0);

  // Edit details form states
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editBlood, setEditBlood] = useState("");
  const [editEcName, setEditEcName] = useState("");
  const [editEcPhone, setEditEcPhone] = useState("");
  const [editEcRel, setEditEcRel] = useState("");
  const [editPickup, setEditPickup] = useState("");
  const [editDrop, setEditDrop] = useState("");

  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Cancellation form states
  const [cancelPreference, setCancelPreference] = useState<"COUPON" | "BANK_REFUND">("COUPON");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  const activeParticipants = participants.filter((p) => !p.isCancelled);

  const handleOpenEdit = (p: Participant) => {
    setEditingParticipant(p);
    setEditName(p.name || "");
    setEditEmail(p.email || "");
    setEditPhone(p.phoneNumber || "");
    setEditGender(p.gender || "");
    
    let dobString = "";
    if (p.dateOfBirth) {
      const d = new Date(p.dateOfBirth);
      if (!Number.isNaN(d.getTime())) {
        dobString = d.toISOString().split("T")[0];
      }
    }
    setEditDob(dobString);
    setEditBlood(p.bloodGroup || "");
    setEditEcName(p.emergencyContactName || "");
    setEditEcPhone(p.emergencyContactNumber || "");
    setEditEcRel(p.emergencyRelationship || "");
    setEditPickup(p.pickupPoint || "");
    setEditDrop(p.dropPoint || "");
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingParticipant) return;
    setIsEditSubmitting(true);
    setEditError(null);

    // Basic validation
    if (!editName.trim()) { setEditError("Name is required."); setIsEditSubmitting(false); return; }
    if (!editPhone.trim()) { setEditError("Phone number is required."); setIsEditSubmitting(false); return; }
    if (!editDob.trim()) { setEditError("Date of birth is required."); setIsEditSubmitting(false); return; }

    try {
      const res = await fetch(`/api/bookings/${bookingId}/participants/${editingParticipant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phoneNumber: editPhone,
          gender: editGender,
          dateOfBirth: editDob,
          bloodGroup: editBlood,
          emergencyContactName: editEcName,
          emergencyContactNumber: editEcPhone,
          emergencyRelationship: editEcRel,
          pickupPoint: editPickup,
          dropPoint: editDrop,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update details");

      setEditingParticipant(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleCancelParticipant = async () => {
    if (cancellingParticipants.length === 0) return;
    setIsCancelSubmitting(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel-participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: cancellingParticipants.map((p) => p.id),
          preference: cancelPreference,
          reason: cancelReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process cancellation");

      setCancelRefundAmount(data.refundAmount || 0);
      setIsCancelSuccess(true);
      setCancellingParticipants([]);
      setSelectedParticipantIds([]);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  const formatDateDisplay = (dateInput: Date | string | null) => {
    if (!dateInput) return "—";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}/${months[date.getMonth()]}/${date.getFullYear()}`;
  };

  const isFullyCancelledBooking = activeParticipants.length === 0;

  return (
    <div id="guests" className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden scroll-mt-24">
      <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Guest Details</h3>
        <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-bold">
          {activeParticipants.length} Active Guest{activeParticipants.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="p-0">
        {/* Desktop Table - Hidden on smaller screens */}
        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[10px] font-black text-foreground/45 uppercase tracking-widest bg-muted/20 border-b border-border/50">
              <tr>
                {!isFullyCancelledBooking && (
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        activeParticipants.length > 0 &&
                        activeParticipants.every((p) =>
                          selectedParticipantIds.includes(p.id)
                        )
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParticipantIds(activeParticipants.map((p) => p.id));
                        } else {
                          setSelectedParticipantIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Personal Details</th>
                <th className="px-6 py-4">Amenities</th>
                <th className="px-6 py-4 whitespace-nowrap">Pickup & Drop</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {participants.map((p, idx) => (
                <tr
                  key={p.id}
                  className={`transition-colors group ${
                    p.isCancelled ? "bg-muted/10 opacity-55" : "hover:bg-muted/10"
                  }`}
                >
                  {!isFullyCancelledBooking && (
                    <td className="px-6 py-4 w-12 text-center">
                      {!p.isCancelled && (
                        <input
                          type="checkbox"
                          checked={selectedParticipantIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedParticipantIds([...selectedParticipantIds, p.id]);
                            } else {
                              setSelectedParticipantIds(
                                selectedParticipantIds.filter((id) => id !== p.id)
                              );
                            }
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                        />
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarStyle(
                          p.isCancelled,
                          p.isPrimary,
                        )}`}
                      >
                        {p.isCancelled ? "✕" : idx + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-bold ${p.isCancelled ? "line-through text-foreground/45" : "text-foreground"}`}>
                          {p.name}
                        </span>
                        {renderGuestBadge(p.isCancelled, p.isPrimary, false)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground/80 font-medium">{p.email || "—"}</td>
                  <td className="px-6 py-4 text-foreground/80 font-medium">{p.phoneNumber || "—"}</td>
                  <td className="px-6 py-4 text-foreground/70">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span className="font-medium">DOB: {formatDateDisplay(p.dateOfBirth)}</span>
                      <span className="opacity-40">•</span>
                      <span className="font-medium">Age: {p.age || "—"}</span>
                      <span className="opacity-40">•</span>
                      <span className="font-medium">{p.gender || "—"}</span>
                      <span className="opacity-40">•</span>
                      <span className="font-medium">Blood: {p.bloodGroup || "—"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {p.selectedAmenities && Array.isArray(p.selectedAmenities) && p.selectedAmenities.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(p.selectedAmenities as SelectedAmenity[]).map((amenity) => (
                          <span
                            key={amenity.optionId}
                            className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold border border-primary/20 whitespace-nowrap"
                          >
                            {amenity.optionName} (₹{amenity.price})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-foreground/40 italic">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-foreground/80 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-medium">{p.pickupPoint || "Assigned by Manager"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!p.isCancelled && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-2 rounded-lg bg-foreground/5 border border-border text-foreground/70 hover:text-foreground hover:bg-foreground/10 transition-colors"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancellingParticipants([p])}
                          className="px-2.5 py-1 text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg border border-red-500/20 transition-all"
                          title="Cancel Slot"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="xl:hidden divide-y divide-border/50">
          {participants.map((p, idx) => (
            <div
              key={`mob-${p.id}`}
              className={`p-6 space-y-4 transition-colors ${
                p.isCancelled ? "bg-muted/10 opacity-55" : "hover:bg-muted/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {!isFullyCancelledBooking && !p.isCancelled && (
                    <input
                      type="checkbox"
                      checked={selectedParticipantIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParticipantIds([...selectedParticipantIds, p.id]);
                        } else {
                          setSelectedParticipantIds(
                            selectedParticipantIds.filter((id) => id !== p.id)
                          );
                        }
                      }}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer mr-1"
                    />
                  )}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getAvatarStyle(
                      p.isCancelled,
                      p.isPrimary,
                    )}`}
                  >
                    {p.isCancelled ? "✕" : idx + 1}
                  </div>
                  <div>
                    <span className={`font-bold text-lg block ${p.isCancelled ? "line-through text-foreground/45" : "text-foreground"}`}>
                      {p.name}
                    </span>
                    {renderGuestBadge(p.isCancelled, p.isPrimary, true)}
                  </div>
                </div>
                {!p.isCancelled && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(p)}
                      className="p-2 rounded-lg bg-foreground/5 border border-border text-foreground/70 hover:text-foreground transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancellingParticipants([p])}
                      className="px-3 py-1.5 text-xs font-bold text-red-500 bg-red-500/10 rounded-lg border border-red-500/20"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest block">Contact Info</span>
                  <div className="text-foreground/80 font-semibold">{p.email || "No email"}</div>
                  <div className="text-foreground/80 font-semibold">{p.phoneNumber || "No phone"}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest block">Personal Info</span>
                  <div className="text-foreground/70 font-medium">
                    DOB: {formatDateDisplay(p.dateOfBirth)} • {p.age ? `Age: ${p.age}` : "Age: —"} • {p.gender || "—"} • Blood: {p.bloodGroup || "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest block">Amenities Selected</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {p.selectedAmenities && Array.isArray(p.selectedAmenities) && p.selectedAmenities.length > 0 ? (
                      (p.selectedAmenities as SelectedAmenity[]).map((amenity) => (
                        <span
                          key={`mob-amenity-${amenity.optionId}`}
                          className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold border border-primary/20"
                        >
                          {amenity.optionName} (₹{amenity.price})
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-foreground/40 italic">None selected</span>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2 pt-2">
                  <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest block mb-2">Logistics</span>
                  <div className="flex items-center gap-2 bg-muted/40 p-3 rounded-xl border border-border/50 text-xs">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-bold text-foreground">{p.pickupPoint || "Assigned by Trip Manager"}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold text-foreground">Edit Guest Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingParticipant(null)}
                className="text-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="edit-name" className="text-xs font-bold text-foreground/60 uppercase">Full Name *</label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-email" className="text-xs font-bold text-foreground/60 uppercase">Email Address</label>
                  <input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-phone" className="text-xs font-bold text-foreground/60 uppercase">Phone Number *</label>
                  <input
                    id="edit-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-dob" className="text-xs font-bold text-foreground/60 uppercase">Date of Birth *</label>
                  <input
                    id="edit-dob"
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-gender" className="text-xs font-bold text-foreground/60 uppercase">Gender *</label>
                  <select
                    id="edit-gender"
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-blood" className="text-xs font-bold text-foreground/60 uppercase">Blood Group *</label>
                  <input
                    id="edit-blood"
                    type="text"
                    value={editBlood}
                    placeholder="e.g. A+"
                    onChange={(e) => setEditBlood(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 mt-2">
                <span className="text-[10px] font-black text-foreground/45 uppercase tracking-widest block mb-3">Emergency Contact Info</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="edit-ec-name" className="text-[10px] font-bold text-foreground/60 uppercase">Contact Name *</label>
                    <input
                      id="edit-ec-name"
                      type="text"
                      value={editEcName}
                      onChange={(e) => setEditEcName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="edit-ec-phone" className="text-[10px] font-bold text-foreground/60 uppercase">Contact Phone *</label>
                    <input
                      id="edit-ec-phone"
                      type="tel"
                      value={editEcPhone}
                      onChange={(e) => setEditEcPhone(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="edit-ec-rel" className="text-[10px] font-bold text-foreground/60 uppercase">Relationship *</label>
                    <input
                      id="edit-ec-rel"
                      type="text"
                      value={editEcRel}
                      placeholder="e.g. Father"
                      onChange={(e) => setEditEcRel(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              {(pickupPoints.length > 0 || dropPoints.length > 0) && (
                <div className="border-t border-border/50 pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pickupPoints.length > 0 && (
                    <div className="space-y-1.5">
                      <label htmlFor="edit-pickup" className="text-xs font-bold text-foreground/60 uppercase">Pick-up Location</label>
                      <select
                        id="edit-pickup"
                        value={editPickup}
                        onChange={(e) => setEditPickup(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="">Select Pickup</option>
                        {pickupPoints.map((loc) => (
                          <option key={`pick-${loc}`} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {dropPoints.length > 0 && (
                    <div className="space-y-1.5">
                      <label htmlFor="edit-drop" className="text-xs font-bold text-foreground/60 uppercase">Drop-off Location</label>
                      <select
                        id="edit-drop"
                        value={editDrop}
                        onChange={(e) => setEditDrop(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="">Select Drop</option>
                        {dropPoints.map((loc) => (
                          <option key={`drop-${loc}`} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {editError && (
                <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  {editError}
                </p>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setEditingParticipant(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground/60 font-bold hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isEditSubmitting}
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
              >
                {isEditSubmitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancellingParticipants.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-foreground">
                  Cancel {cancellingParticipants.length > 1 ? `${cancellingParticipants.length} Slots` : "Guest Slot"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellingParticipants([])}
                className="text-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {cancellingParticipants.length === activeParticipants.length ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-xl p-4 flex gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    <strong>Warning:</strong> Since you are cancelling all remaining active guest slots,
                    this will cancel the entire booking request.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-foreground/80 leading-relaxed text-left">
                  You are cancelling slots for:{" "}
                  <strong>
                    {cancellingParticipants.map((p) => p.name).join(", ")}
                  </strong>.
                  A partial cancellation refund will be processed to your account.
                </p>
              )}

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left">
                <p className="text-amber-400 text-xs font-bold mb-1">📋 Cancellation Policy</p>
                <p className="text-foreground/60 text-[11px] leading-relaxed">
                  Refunds are processed according to our policy. Depending on the schedule proximity, you may receive a partial coupon code or bank refund.
                </p>
              </div>

              <div className="space-y-2 text-left">
                <p className="text-xs font-bold text-foreground/60 uppercase">Refund Preference</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCancelPreference("COUPON")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      cancelPreference === "COUPON"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground/60 hover:border-foreground/30"
                    }`}
                  >
                    🎟️ Adventure Coupon
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelPreference("BANK_REFUND")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      cancelPreference === "BANK_REFUND"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground/60 hover:border-foreground/30"
                    }`}
                  >
                    🏦 Bank Refund
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label htmlFor="cancel-reason" className="text-xs font-bold text-foreground/60 uppercase">Reason (Optional)</label>
                <textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Why is this slot being cancelled?"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none min-h-20 resize-none"
                />
              </div>

              {cancelError && (
                <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  {cancelError}
                </p>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setCancellingParticipants([])}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground/60 font-bold hover:bg-foreground/5"
              >
                Keep Slots
              </button>
              <button
                type="button"
                disabled={isCancelSubmitting}
                onClick={handleCancelParticipant}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
              >
                {isCancelSubmitting ? "Processing…" : "Cancel Slots"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Select Floating Action Bar */}
      {selectedParticipantIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl bg-background/80 dark:bg-zinc-950/80 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 animate-pulse">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {selectedParticipantIds.length} Guest Slot{selectedParticipantIds.length > 1 ? "s" : ""} Selected
              </p>
              <p className="text-xs text-foreground/60">
                Cancel selected guests in a single request.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setSelectedParticipantIds([])}
              className="flex-1 sm:flex-none px-4 py-2 border border-border rounded-xl text-xs font-bold text-foreground/60 hover:bg-foreground/5 transition-all"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() =>
                setCancellingParticipants(
                  participants.filter((p) => selectedParticipantIds.includes(p.id))
                )
              }
              className="flex-1 sm:flex-none px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/10"
            >
              Cancel Selected
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {isCancelSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.15)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-bold text-foreground">Cancellation Processed</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">
                The requested guest slot(s) have been successfully cancelled.
              </p>
            </div>

            {cancelRefundAmount > 0 && (
              <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-4 max-w-xs mx-auto text-center">
                <span className="text-[10px] font-black text-foreground/50 uppercase tracking-widest block mb-0.5">Pending Refund</span>
                <span className="text-xl font-black text-green-500">₹{cancelRefundAmount.toLocaleString("en-IN")}</span>
                <span className="text-[10px] text-foreground/40 block mt-1">Pending support review & coupon generation.</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsCancelSuccess(false);
                window.location.reload();
              }}
              className="w-full py-3 bg-foreground text-background font-bold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
