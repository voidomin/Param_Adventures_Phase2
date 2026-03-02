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
  ArrowRight,
} from "lucide-react";

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
        !window.confirm(
          `Warning: "${title}" has ${bookingsCount} bookings. Deleting it will only archive/soft-delete it. Continue?`,
        )
      ) {
        return;
      }
    } else {
      if (
        !window.confirm(
          `Are you sure you want to permanently delete "${title}"?`,
        )
      ) {
        return;
      }
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
          <h1 className="text-3xl font-heading font-bold text-white">
            Experiences
          </h1>
          <p className="text-slate-400 mt-1">
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

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : experiences.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center text-slate-400">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-white mb-2">
            No Experiences Yet
          </h3>
          <p className="mb-6">Start building your first unforgettable trip.</p>
          <Link
            href="/admin/experiences/new"
            className="inline-block bg-white/10 text-white px-6 py-2.5 rounded-full font-bold hover:bg-white/20 transition-colors"
          >
            Create your first trip
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:bg-white/10 transition-colors"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white">{exp.title}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(
                      exp.status,
                    )}`}
                  >
                    {exp.status}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300">
                    {exp.difficulty}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
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
                        className="text-xs text-slate-500 bg-black/30 px-2 py-1 rounded"
                      >
                        {c.category.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto border-t border-white/10 md:border-none pt-4 md:pt-0">
                <div className="text-right mr-4 hidden md:block text-sm text-slate-400">
                  <div>
                    <strong className="text-white">{exp._count.slots}</strong>{" "}
                    Slots
                  </div>
                  <div>
                    <strong className="text-white">
                      {exp._count.bookings}
                    </strong>{" "}
                    Bookings
                  </div>
                </div>

                <Link
                  href={`/admin/experiences/${exp.id}`}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors font-medium"
                >
                  <Edit2 className="w-4 h-4" /> Edit
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
