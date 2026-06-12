"use client";

import { useState, useMemo } from "react";
import { CalendarDays, Loader2, IndianRupee } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import BookingModal from "@/components/booking/BookingModal";
import DownloadItineraryBtn from "@/components/experiences/DownloadItineraryBtn";

interface Slot {
  id: string;
  date: Date | string;
  status: string;
  remainingCapacity: number;
}

interface BookingSidebarCardProps {
  experienceId: string;
  experienceTitle: string;
  experienceSlug: string;
  basePrice: number;
  maxCapacity: number;
  pickupPoints: string[];
  dropPoints?: string[];
  slots: Slot[];
}

export default function BookingSidebarCard({
  experienceId,
  experienceTitle,
  experienceSlug,
  basePrice,
  maxCapacity,
  pickupPoints,
  dropPoints = [],
  slots,
}: Readonly<BookingSidebarCardProps>) {
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Extract unique months chronologically from slots
  const months = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const uniqueMonths = new Map<string, { label: string; key: string }>();

    const sortedSlots = [...slots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedSlots.forEach((slot) => {
      const d = new Date(slot.date);
      const m = d.getMonth();
      const y = d.getFullYear();
      const key = `${m}-${y}`;
      if (!uniqueMonths.has(key)) {
        uniqueMonths.set(key, {
          label: `${monthNames[m]} ${y}`,
          key,
        });
      }
    });

    return Array.from(uniqueMonths.values());
  }, [slots]);

  // Filter slots by selected month
  const filteredSlots = useMemo(() => {
    if (selectedMonth === "All") {
      return slots;
    }
    return slots.filter((slot) => {
      const d = new Date(slot.date);
      const key = `${d.getMonth()}-${d.getFullYear()}`;
      return key === selectedMonth;
    });
  }, [slots, selectedMonth]);


  const handleSlotClick = (slot: Slot) => {
    if (slot.remainingCapacity <= 0) return;
    setSelectedSlotId((prev) => (prev === slot.id ? null : slot.id));
  };

  const handleBookClick = () => {
    if (!selectedSlotId) return;
    if (!user) {
      router.push(`/login?redirect=/experiences/${experienceSlug}`);
      return;
    }
    setIsModalOpen(true);
  };



  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-xl flex flex-col gap-5 sticky top-28 z-20">
      <div>
        <h3 className="text-lg font-heading font-bold text-foreground">
          Reserve Your Spot
        </h3>
        <p className="text-xs text-foreground/50 mt-1">
          Select an upcoming batch and secure your tickets
        </p>
      </div>

      <div className="flex items-end gap-1 mb-1 pb-4 border-b border-border">
        <span className="text-3xl font-black flex items-center text-foreground">
          <IndianRupee className="w-6 h-6 text-foreground mr-0.5" />
          {Number(basePrice).toLocaleString("en-IN")}
        </span>
        <span className="text-foreground/50 text-xs font-semibold mb-1">
          / person
        </span>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border rounded-xl">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 text-foreground/20" />
          <p className="text-sm text-foreground/50 font-medium">No active departures</p>
        </div>
      ) : (
        <>
          {/* Month filter buttons */}
          {months.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              <button
                type="button"
                onClick={() => setSelectedMonth("All")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
                  selectedMonth === "All"
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-border text-foreground/75 hover:bg-foreground/5"
                }`}
              >
                All Months
              </button>
              {months.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMonth(m.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
                    selectedMonth === m.key
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-border text-foreground/75 hover:bg-foreground/5"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Slots grid */}
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
            {filteredSlots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              const isSoldOut = slot.remainingCapacity <= 0;

              const getCardClasses = () => {
                if (isSelected) {
                  return "bg-primary/5 border-primary shadow-sm ring-1 ring-primary";
                }
                if (isSoldOut) {
                  return "bg-foreground/[0.01] border-border/40 opacity-45 cursor-not-allowed";
                }
                return "bg-background border-border hover:border-foreground/20 hover:bg-foreground/[0.01]";
              };

              const getBadgeClasses = () => {
                if (isSoldOut) {
                  return "bg-red-500/10 text-red-500";
                }
                if (isSelected) {
                  return "bg-primary/10 text-primary";
                }
                return "bg-foreground/5 text-foreground/50";
              };

              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={isSoldOut}
                  onClick={() => handleSlotClick(slot)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center relative group select-none ${getCardClasses()}`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    isSelected ? "text-primary" : "text-foreground/45"
                  }`}>
                    {new Date(slot.date).toLocaleDateString("en-IN", { weekday: "short" })}
                  </span>
                  <span className="text-sm font-black text-foreground mt-0.5">
                    {new Date(slot.date).toLocaleDateString("en-IN", { day: "numeric" })}{" "}
                    {new Date(slot.date).toLocaleDateString("en-IN", { month: "short" })}
                  </span>
                  <span className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded-full ${getBadgeClasses()}`}>
                    {isSoldOut ? "Sold Out" : `${slot.remainingCapacity} left`}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Booking and dynamic glowing behavior */}
      <div className="space-y-3">
        {selectedSlotId ? (
          <button
            type="button"
            onClick={handleBookClick}
            disabled={authLoading}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/25 cursor-pointer flex items-center justify-center gap-2"
          >
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Book Now"
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full py-4 rounded-xl bg-muted border border-border text-foreground/35 font-bold text-base cursor-not-allowed transition-all duration-300"
          >
            Select a Date to Book
          </button>
        )}

        <p className="text-center text-[10px] text-foreground/40 font-medium">
          Secure payment powered by Razorpay
        </p>
      </div>

      <DownloadItineraryBtn slug={experienceSlug} />

      {isModalOpen && selectedSlotId && (
        <BookingModal
          experienceId={experienceId}
          experienceTitle={experienceTitle}
          experienceSlug={experienceSlug}
          basePrice={basePrice}
          maxCapacity={maxCapacity}
          pickupPoints={pickupPoints}
          dropPoints={dropPoints}
          initialSelectedSlotId={selectedSlotId}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
