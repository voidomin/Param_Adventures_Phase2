"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  CalendarDays,
} from "lucide-react";
import { ExperienceSkeleton } from "@/components/admin/ExperienceSkeleton";


interface Category {
  id: string;
  name: string;
}

interface ExperienceList {
  id: string;
  title: string;
  basePrice: number;
  durationDays: number;
  difficulty: string;
  capacity: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  location: string;
  categories: { category: Category }[];
  _count: {
    slots: number;
    bookings: number;
  };
}

export default function AdminExperiencesPage() {
  const [experiences, setExperiences] = useState<ExperienceList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExperiences = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/experiences");
      if (res.ok) {
        const data = await res.json();
        setExperiences(data.experiences);
      }
    } catch (err) {
      console.error("Failed to fetch experiences:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiences();
  }, []);

  const handleDelete = async (
    id: string,
    title: string,
    bookingsCount: number,
  ) => {
    if (bookingsCount > 0) {
      if (
        !globalThis.confirm(
          `Warning: "${title}" has ${bookingsCount} bookings. Deleting it will only archive/soft-delete it. Continue?`,
        )
      ) {
        return;
      }
    } else if (
      !globalThis.confirm(
        `Are you sure you want to permanently delete "${title}"?`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/experiences/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchExperiences();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    }
  };

  const togglePublishStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/admin/experiences/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchExperiences();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to change status");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "ARCHIVED":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Experiences
          </h1>
          <p className="text-foreground/60 mt-1">
            Build and manage your trips, events, and packages.
          </p>
        </div>
        <Link
          href="/admin/experiences/new"
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/25"
        >
          <Plus className="w-5 h-5" />
          Create Trip
        </Link>
      </div>

      {isLoading && <ExperienceSkeleton />}
      {!isLoading && experiences.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-foreground/60">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50 text-foreground/50" />
          <h3 className="text-lg font-bold text-foreground mb-2">
            No Experiences Yet
          </h3>
          <p className="mb-6">Start building your first unforgettable trip.</p>
          <Link
            href="/admin/experiences/new"
            className="inline-block bg-background border border-border text-foreground px-6 py-2.5 rounded-full font-bold hover:bg-foreground/5 transition-colors"
          >
            Create your first trip
          </Link>
        </div>
      )}
      {!isLoading && experiences.length > 0 && (
        <div className="grid gap-4">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:bg-foreground/5 transition-colors"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-foreground">
                    {exp.title}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(
                      exp.status,
                    )}`}
                  >
                    {exp.status}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-background border border-border text-foreground/80">
                    {exp.difficulty}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground/60">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {exp.location || "No Location"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {exp.durationDays} Days
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Max {exp.capacity} pax
                  </div>
                  <div className="font-medium text-primary">
                    ₹{Number(exp.basePrice).toLocaleString("en-IN")}
                  </div>
                </div>

                {exp.categories.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {exp.categories.map((c) => (
                      <span
                        key={c.category.id}
                        className="text-xs text-foreground/70 bg-background border border-border px-2 py-1 rounded"
                      >
                        {c.category.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto border-t border-border md:border-none pt-4 md:pt-0">
                <div className="text-right mr-4 hidden md:block text-sm text-foreground/60">
                  <div>
                    <strong className="text-foreground">
                      {exp._count.slots}
                    </strong>{" "}
                    Slots
                  </div>
                  <div>
                    <strong className="text-foreground">
                      {exp._count.bookings}
                    </strong>{" "}
                    Bookings
                  </div>
                </div>

                {exp.status === "DRAFT" && (
                  <button
                    onClick={() => togglePublishStatus(exp.id, exp.status)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-lg transition-colors font-medium border border-green-500/20"
                  >
                    <CheckCircle className="w-4 h-4" /> Publish
                  </button>
                )}
                {exp.status === "PUBLISHED" && (
                  <button
                    onClick={() => togglePublishStatus(exp.id, exp.status)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 rounded-lg transition-colors font-medium border border-orange-500/20"
                    title="Unpublish to Draft"
                  >
                    <XCircle className="w-4 h-4" /> Unpublish
                  </button>
                )}

                <Link
                  href={`/admin/experiences/${exp.id}`}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors font-medium border border-primary/20"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </Link>
                <Link
                  href={`/admin/experiences/${exp.id}/slots`}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-foreground/5 text-foreground/70 hover:bg-foreground/10 rounded-lg transition-colors font-medium border border-border"
                  title="Manage Slots"
                >
                  <CalendarDays className="w-4 h-4" /> Slots
                </Link>
                <button
                  onClick={() =>
                    handleDelete(exp.id, exp.title, exp._count.bookings)
                  }
                  className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
