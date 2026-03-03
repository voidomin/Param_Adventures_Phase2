"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  CalendarDays,
  Users,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";

interface Slot {
  id: string;
  date: string;
  capacity: number;
  remainingCapacity: number;
  _count: { bookings: number };
}

interface SlotFormData {
  date: string;
  capacity: number;
}

const emptyForm: SlotFormData = { date: "", capacity: 10 };

export default function SlotsManagementPage() {
  const params = useParams();
  const router = useRouter();
  const experienceId = params.id as string;

  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [formData, setFormData] = useState<SlotFormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [experienceTitle, setExperienceTitle] = useState("Experience");

  const fetchSlots = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/experiences/${experienceId}/slots`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [experienceId]);

  // Fetch experience title
  useEffect(() => {
    fetch(`/api/admin/experiences/${experienceId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.experience?.title) setExperienceTitle(d.experience.title);
      })
      .catch(() => {});
    fetchSlots();
  }, [experienceId, fetchSlots]);

  function openAddModal() {
    setEditingSlot(null);
    setFormData(emptyForm);
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(slot: Slot) {
    setEditingSlot(slot);
    setFormData({
      date: new Date(slot.date).toISOString().slice(0, 10),
      capacity: slot.capacity,
    });
    setError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const url = editingSlot
        ? `/api/admin/experiences/${experienceId}/slots/${editingSlot.id}`
        : `/api/admin/experiences/${experienceId}/slots`;
      const method = editingSlot ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save slot.");

      setIsModalOpen(false);
      fetchSlots();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(slot: Slot) {
    if (
      !globalThis.confirm(
        `Delete slot on ${formatDate(slot.date)}? This cannot be undone.`,
      )
    )
      return;

    try {
      const res = await fetch(
        `/api/admin/experiences/${experienceId}/slots/${slot.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchSlots();
    } catch (err: unknown) {
      globalThis.alert(
        err instanceof Error ? err.message : "Failed to delete slot.",
      );
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const bookedCount = (slot: Slot) => slot.capacity - slot.remainingCapacity;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2 text-sm text-foreground/50">
        <Link
          href="/admin/experiences"
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Experiences
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="truncate max-w-[200px]">{experienceTitle}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span>Slots</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Slot Management
          </h1>
          <p className="text-foreground/60 mt-1">
            Manage available date slots and seat capacity.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
        >
          <Plus className="w-4 h-4" />
          Add Slot
        </button>
      </div>

      {/* Slot Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : slots.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
          <p className="text-foreground/50 font-medium">No slots yet</p>
          <p className="text-foreground/40 text-sm mt-1">
            Add a slot to let users book this experience.
          </p>
          <button
            onClick={openAddModal}
            className="mt-6 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Add First Slot
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-foreground/[0.02]">
                <th className="text-left text-xs font-semibold text-foreground/50 uppercase tracking-wider px-6 py-4">
                  Date
                </th>
                <th className="text-left text-xs font-semibold text-foreground/50 uppercase tracking-wider px-6 py-4">
                  Capacity
                </th>
                <th className="text-left text-xs font-semibold text-foreground/50 uppercase tracking-wider px-6 py-4">
                  Booked
                </th>
                <th className="text-left text-xs font-semibold text-foreground/50 uppercase tracking-wider px-6 py-4">
                  Available
                </th>
                <th className="text-left text-xs font-semibold text-foreground/50 uppercase tracking-wider px-6 py-4">
                  Status
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {slots.map((slot) => {
                const booked = bookedCount(slot);
                const isFull = slot.remainingCapacity === 0;
                const isPast = new Date(slot.date) < new Date();
                const fillPct = Math.round((booked / slot.capacity) * 100);

                return (
                  <tr
                    key={slot.id}
                    className="hover:bg-foreground/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-foreground/40 shrink-0" />
                        <span
                          className={`font-medium ${isPast ? "text-foreground/40" : "text-foreground"}`}
                        >
                          {formatDate(slot.date)}
                        </span>
                        {isPast && (
                          <span className="text-[10px] bg-foreground/10 text-foreground/50 px-1.5 py-0.5 rounded-full">
                            Past
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-foreground/70">
                        <Users className="w-3.5 h-3.5" />
                        {slot.capacity}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                        <span className="text-sm text-foreground/70">
                          {booked}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground/70">
                      {slot.remainingCapacity}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isPast
                            ? "bg-foreground/5 text-foreground/40"
                            : isFull
                              ? "bg-red-500/10 text-red-500"
                              : "bg-green-500/10 text-green-500"
                        }`}
                      >
                        {isPast ? "Past" : isFull ? "Full" : "Available"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(slot)}
                          className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors text-foreground/50 hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(slot)}
                          disabled={booked > 0}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-foreground/50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={
                            booked > 0
                              ? "Cannot delete: has bookings"
                              : "Delete"
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="text-lg font-heading font-bold text-foreground">
                {editingSlot ? "Edit Slot" : "Add New Slot"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors text-foreground/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  Slot Date
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, date: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  Seat Capacity
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={500}
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      capacity: Number(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
                {editingSlot && (
                  <p className="text-xs text-foreground/40 mt-1">
                    Currently{" "}
                    {editingSlot.capacity - editingSlot.remainingCapacity}{" "}
                    seat(s) booked — remaining will be adjusted automatically.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-foreground/70 hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingSlot ? "Save Changes" : "Create Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
