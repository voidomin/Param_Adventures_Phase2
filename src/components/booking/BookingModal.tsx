"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  X,
  CalendarDays,
  Users,
  IndianRupee,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";

interface Slot {
  id: string;
  date: string;
  capacity: number;
  remainingCapacity: number;
}

interface BookingModalProps {
  experienceId: string;
  experienceTitle: string;
  experienceSlug: string;
  basePrice: number;
  maxCapacity: number;
  onClose: () => void;
}

interface ParticipantDetails {
  id: string;
  isPrimary: boolean;
  name: string;
  email: string;
  phoneNumber: string;
  gender: string;
  age: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  emergencyRelationship: string;
}

type Step =
  | "slots"
  | "participants"
  | "summary"
  | "processing"
  | "success"
  | "error";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (
      typeof globalThis !== "undefined" &&
      (globalThis as any).Razorpay !== undefined
    ) {
      resolve(true);
      return;
    }
    const script = globalThis.document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.crossOrigin = "anonymous";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    globalThis.document.body.appendChild(script);
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BookingModal({
  experienceId,
  experienceTitle,
  experienceSlug,
  basePrice,
  maxCapacity,
  onClose,
}: Readonly<BookingModalProps>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { user } = useAuth();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [participants, setParticipants] = useState(1);
  const [step, setStep] = useState<Step>("slots");
  const [errorMsg, setErrorMsg] = useState("");
  const [slotPage, setSlotPage] = useState(0);
  const SLOTS_PER_PAGE = 4;

  const [partInfo, setPartInfo] = useState<ParticipantDetails[]>([]);

  const createParticipant = useCallback(
    (isPrimary: boolean): ParticipantDetails => {
      const p: ParticipantDetails = {
        id: Math.random().toString(),
        isPrimary,
        name: "",
        email: "",
        phoneNumber: "",
        gender: "",
        age: "",
        bloodGroup: "",
        emergencyContactName: "",
        emergencyContactNumber: "",
        emergencyRelationship: "",
      };

      if (isPrimary && user) {
        if (user.name) p.name = user.name;
        if (user.email) p.email = user.email;
        if (user.phoneNumber) p.phoneNumber = user.phoneNumber;
        if (user.gender) p.gender = user.gender;
        if (user.age) p.age = user.age.toString();
        if (user.bloodGroup) p.bloodGroup = user.bloodGroup;
        if (user.emergencyContactName)
          p.emergencyContactName = user.emergencyContactName;
        if (user.emergencyContactNumber)
          p.emergencyContactNumber = user.emergencyContactNumber;
        if (user.emergencyRelationship)
          p.emergencyRelationship = user.emergencyRelationship;
      }

      return p;
    },
    [user],
  );

  const fetchSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/experiences/${experienceSlug}/slots`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [experienceSlug]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    setPartInfo((prev) => {
      if (prev.length === participants) return prev;
      const newArr = [...prev];
      if (newArr.length < participants) {
        const toAdd = participants - newArr.length;
        for (let i = 0; i < toAdd; i++) {
          newArr.push(createParticipant(newArr.length === 0));
        }
      } else {
        newArr.splice(participants);
      }
      return newArr;
    });
  }, [participants, createParticipant]);

  const updatePart = (
    index: number,
    field: keyof ParticipantDetails,
    value: string,
  ) => {
    const updated = [...partInfo];
    updated[index] = { ...updated[index], [field]: value };
    setPartInfo(updated);
  };

  const removePrimary = (index: number) => {
    const updated = [...partInfo];
    updated[index] = {
      ...updated[index],
      isPrimary: false,
      name: "",
      email: "",
      phoneNumber: "",
      gender: "",
      age: "",
      bloodGroup: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
      emergencyRelationship: "",
    };
    setPartInfo(updated);
  };

  const validateParticipants = () => {
    for (const p of partInfo) {
      if (!p.name.trim() || !p.phoneNumber.trim()) return false;
    }
    return true;
  };

  const handleDetailsSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateParticipants()) {
      alert(
        "Please fill all compulsory fields (Name, Phone Number) for all participants.",
      );
      return;
    }
    setStep("summary");
  };

  const totalPrice = basePrice * participants;
  const visibleSlots = slots.slice(
    slotPage * SLOTS_PER_PAGE,
    (slotPage + 1) * SLOTS_PER_PAGE,
  );
  const totalPages = Math.ceil(slots.length / SLOTS_PER_PAGE);

  async function handleProceedToPay() {
    setStep("processing");
    setErrorMsg("");

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setErrorMsg(
        "Failed to load payment gateway. Please check your internet connection.",
      );
      setStep("error");
      return;
    }

    try {
      if (!selectedSlot) throw new Error("No slot selected.");

      const bookRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceId,
          slotId: selectedSlot.id,
          participantCount: participants,
          participants: partInfo,
        }),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok)
        throw new Error(bookData.error || "Failed to create booking.");

      const { bookingId: bId, orderId, amount, currency, keyId } = bookData;

      const rzp = new (globalThis as any).Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Param Adventures",
        description: experienceTitle,
        theme: { color: "#D4AF37" },
        handler: async (response: Record<string, string>) => {
          try {
            const verifyRes = await fetch("/api/bookings/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: bId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error);
            setStep("success");
          } catch (err: unknown) {
            setErrorMsg(
              err instanceof Error
                ? err.message
                : "Payment verification failed.",
            );
            setStep("error");
          }
        },
        modal: {
          ondismiss: () => setStep("summary"),
        },
      });
      rzp.open();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStep("error");
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground">
              Book Experience
            </h2>
            <p className="text-xs text-foreground/50 mt-0.5 truncate max-w-[280px]">
              {experienceTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors text-foreground/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step: Slot Selection */}
        {step === "slots" && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
              Choose a Date
            </h3>

            {slotsLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {!slotsLoading && slots.length === 0 && (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 text-foreground/20" />
                <p className="text-foreground/50 font-medium">
                  No available dates
                </p>
                <p className="text-foreground/40 text-sm mt-1">
                  Check back soon for upcoming slots.
                </p>
              </div>
            )}

            {!slotsLoading && slots.length > 0 && (
              <>
                <div className="space-y-3">
                  {visibleSlots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <div
                        key={slot.id}
                        className={`w-full rounded-xl border transition-all overflow-hidden ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-foreground/30 bg-background"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className="w-full flex items-center justify-between p-4"
                        >
                          <div className="flex items-center gap-3">
                            <CalendarDays
                              className={`w-5 h-5 ${isSelected ? "text-primary" : "text-foreground/40"}`}
                            />
                            <div className="text-left">
                              <p className="font-semibold text-foreground text-sm">
                                {formatDate(slot.date)}
                              </p>
                              <p className="text-xs text-foreground/50 mt-0.5">
                                {slot.remainingCapacity} seat
                                {slot.remainingCapacity === 1 ? "" : "s"}{" "}
                                available
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                            </span>
                          )}
                        </button>

                        {isSelected && (
                          <div className="px-4 pb-4 pt-2 border-t border-primary/10">
                            <div className="flex items-center justify-between bg-background rounded-lg p-3 border border-border/50">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-foreground/50" />
                                <span className="text-sm font-medium text-foreground">
                                  Participants
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() =>
                                    setParticipants((p) => Math.max(1, p - 1))
                                  }
                                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:bg-foreground/5 font-bold text-foreground"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center font-bold text-foreground">
                                  {participants}
                                </span>
                                <button
                                  onClick={() =>
                                    setParticipants((p) =>
                                      Math.min(
                                        maxCapacity,
                                        selectedSlot.remainingCapacity,
                                        p + 1,
                                      ),
                                    )
                                  }
                                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:bg-foreground/5 font-bold text-foreground"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => setSlotPage((p) => Math.max(0, p - 1))}
                      disabled={slotPage === 0}
                      className="p-1.5 rounded-lg border border-border hover:bg-foreground/5 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-foreground/50">
                      {slotPage + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setSlotPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={slotPage === totalPages - 1}
                      className="p-1.5 rounded-lg border border-border hover:bg-foreground/5 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}

            {selectedSlot && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-foreground/60">
                    ₹{basePrice.toLocaleString("en-IN")} × {participants} person
                    {participants === 1 ? "" : "s"}
                  </span>
                  <span className="text-xl font-black text-primary">
                    ₹{totalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <button
                  onClick={() => setStep("participants")}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  Continue to Details
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Participants Form */}
        {step === "participants" && (
          <form onSubmit={handleDetailsSubmit} className="p-6 space-y-8">
            <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-2">
              Participant Details
            </h3>

            {partInfo.map((p, index) => (
              <details
                key={p.id}
                open={index === 0}
                className="bg-background rounded-xl border border-border overflow-hidden group shadow-sm"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer select-none bg-card hover:bg-foreground/5 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-4">
                    <User className="w-5 h-5 text-primary shrink-0" />
                    <div className="text-left">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        Participant {index + 1}{" "}
                        {p.isPrimary && (
                          <span className="text-xs font-semibold text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded uppercase">
                            Primary
                          </span>
                        )}
                      </h4>
                      <div className="mt-1 text-xs text-foreground/60 flex flex-wrap gap-x-3 gap-y-1 items-center">
                        {p.name ? (
                          <span className="font-medium text-foreground/80">
                            {p.name}
                          </span>
                        ) : (
                          <span className="text-red-400 italic">
                            Name Required
                          </span>
                        )}
                        {p.email && <span>{p.email}</span>}
                        {p.phoneNumber ? (
                          <span>{p.phoneNumber}</span>
                        ) : (
                          <span className="text-red-400 italic">
                            Phone Required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {p.isPrimary && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          removePrimary(index);
                        }}
                        className="text-xs text-red-500 font-bold hover:underline"
                      >
                        Remove Myself
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-foreground/40 group-open:rotate-90 transition-transform shrink-0" />
                  </div>
                </summary>

                <div className="p-5 border-t border-border/50 bg-background">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Personal Details */}
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor={`name-${index}`}
                          className="block text-xs font-bold text-foreground/60 mb-1"
                        >
                          Full Name *
                        </label>
                        <input
                          id={`name-${index}`}
                          type="text"
                          required
                          value={p.name}
                          onChange={(e) =>
                            updatePart(index, "name", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`phone-${index}`}
                          className="block text-xs font-bold text-foreground/60 mb-1"
                        >
                          Phone Number *
                        </label>
                        <div className="flex gap-0 border border-border rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-primary bg-card">
                          <div className="pl-3 pr-1 py-2 text-foreground/40 font-bold bg-muted/20 select-none">
                            +
                          </div>
                          <input
                            id={`phone-${index}`}
                            type="text"
                            value={p.phoneNumber.replace("+", "")}
                            onChange={(e) =>
                              updatePart(
                                index,
                                "phoneNumber",
                                `+${e.target.value}`,
                              )
                            }
                            required
                            className="flex-1 min-w-0 py-2 pr-3 bg-transparent outline-none"
                            placeholder="91 99999 99999"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor={`email-${index}`}
                          className="block text-xs font-bold text-foreground/60 mb-1"
                        >
                          Email ID
                        </label>
                        <input
                          id={`email-${index}`}
                          type="email"
                          value={p.email}
                          onChange={(e) =>
                            updatePart(index, "email", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    {/* Health Details */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label
                            htmlFor={`gender-${index}`}
                            className="block text-xs font-bold text-foreground/60 mb-1"
                          >
                            Gender
                          </label>
                          <select
                            id={`gender-${index}`}
                            value={p.gender}
                            onChange={(e) =>
                              updatePart(index, "gender", e.target.value)
                            }
                            className="w-full px-2 py-2 bg-card border border-border rounded-lg outline-none appearance-none"
                          >
                            <option value="">Select</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor={`age-${index}`}
                            className="block text-xs font-bold text-foreground/60 mb-1"
                          >
                            Age
                          </label>
                          <input
                            id={`age-${index}`}
                            type="number"
                            value={p.age}
                            onChange={(e) =>
                              updatePart(index, "age", e.target.value)
                            }
                            className="w-full px-2 py-2 bg-card border border-border rounded-lg outline-none"
                            placeholder="e.g 25"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor={`bloodgroup-${index}`}
                          className="block text-xs font-bold text-foreground/60 mb-1"
                        >
                          Blood Group
                        </label>
                        <select
                          id={`bloodgroup-${index}`}
                          value={p.bloodGroup}
                          onChange={(e) =>
                            updatePart(index, "bloodGroup", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-card border border-border rounded-lg outline-none appearance-none"
                        >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="md:col-span-2 space-y-4 mt-2 pt-4 border-t border-border/50">
                      <h5 className="text-xs font-semibold text-foreground/50 uppercase tracking-widest flex items-center gap-1">
                        Emergency Information
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor={`ecname-${index}`}
                            className="block text-xs font-bold text-foreground/60 mb-1"
                          >
                            Emergency Name
                          </label>
                          <input
                            id={`ecname-${index}`}
                            type="text"
                            value={p.emergencyContactName}
                            onChange={(e) =>
                              updatePart(
                                index,
                                "emergencyContactName",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`ecphone-${index}`}
                            className="block text-xs font-bold text-foreground/60 mb-1"
                          >
                            Emergency Number
                          </label>
                          <div className="flex gap-0 border border-border rounded-lg overflow-hidden bg-card focus-within:ring-1 focus-within:ring-primary">
                            <div className="pl-3 pr-1 py-2 text-foreground/40 font-bold bg-muted/20 select-none">
                              +
                            </div>
                            <input
                              id={`ecphone-${index}`}
                              type="text"
                              value={p.emergencyContactNumber.replace("+", "")}
                              onChange={(e) =>
                                updatePart(
                                  index,
                                  "emergencyContactNumber",
                                  `+${e.target.value}`,
                                )
                              }
                              className="flex-1 min-w-0 py-2 pr-3 bg-transparent outline-none"
                              placeholder="91 88888 88888"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label
                            htmlFor={`ecrel-${index}`}
                            className="block text-xs font-bold text-foreground/60 mb-1"
                          >
                            Relationship
                          </label>
                          <input
                            id={`ecrel-${index}`}
                            type="text"
                            value={p.emergencyRelationship}
                            onChange={(e) =>
                              updatePart(
                                index,
                                "emergencyRelationship",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            ))}

            <div className="flex gap-3 sticky bottom-0 bg-card py-4 border-t border-border z-10 w-full mt-0 -mx-6 px-6 -mb-6">
              <button
                type="button"
                onClick={() => setStep("slots")}
                className="w-1/3 py-3 border border-border rounded-xl text-foreground hover:bg-foreground/5 transition-colors font-bold"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                Review Booking
              </button>
            </div>
          </form>
        )}

        {/* Step: Summary */}
        {step === "summary" && selectedSlot && (
          <div className="p-6 space-y-5">
            <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider">
              Booking Summary
            </h3>

            <div className="space-y-3">
              {[
                {
                  icon: <CalendarDays className="w-4 h-4" />,
                  label: "Date",
                  value: formatDate(selectedSlot.date),
                },
                {
                  icon: <Users className="w-4 h-4" />,
                  label: "Participants",
                  value: `${participants} person${participants === 1 ? "" : "s"}`,
                },
                {
                  icon: <IndianRupee className="w-4 h-4" />,
                  label: "Total",
                  value: `₹${totalPrice.toLocaleString("en-IN")}`,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-3 border-b border-border last:border-none"
                >
                  <div className="flex items-center gap-2 text-foreground/60">
                    {row.icon}
                    <span className="text-sm">{row.label}</span>
                  </div>
                  <span className="font-semibold text-foreground text-sm">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-foreground/[0.03] border border-border rounded-xl p-3 text-xs text-foreground/50 text-center">
              Secure payment powered by Razorpay • 100% Safe
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("participants")}
                className="flex-1 py-3 border border-border rounded-xl text-foreground hover:bg-foreground/5 font-bold"
              >
                ← Edit Details
              </button>
              <button
                onClick={handleProceedToPay}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                Pay ₹{totalPrice.toLocaleString("en-IN")}
              </button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {step === "processing" && (
          <div className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="font-semibold text-foreground">Preparing payment…</p>
            <p className="text-sm text-foreground/50 mt-1">
              Please do not close this window.
            </p>
          </div>
        )}

        {/* Success State */}
        {step === "success" && (
          <div className="p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Booking Confirmed!</h3>
            <p className="text-sm mb-6 text-foreground/70">
              Check your dashboard for details.
            </p>
            <a
              href="/dashboard"
              className="block w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-center"
            >
              View Dashboard
            </a>
          </div>
        )}

        {/* Error State */}
        {step === "error" && (
          <div className="p-10 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-red-500">Error</h3>
            <p className="text-sm mb-6 text-foreground/70">
              {errorMsg || "Payment failed."}
            </p>
            <button
              onClick={() => setStep("summary")}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
