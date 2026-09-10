"use client";

import { useState, useEffect } from "react";
import { Check, X, Save } from "lucide-react";
import { TableSkeleton } from "@/components/admin/TableSkeleton";

interface HomepageSection {
  id: string;
  layout: string;
  name: string;
  heading: string;
  subheading: string | null;
  displayOrder: number;
  isActive: boolean;
  experienceCount: number;
}

// Human-readable label for each immutable layout, purely informational --
// admins can rename the section, never the design it renders.
const LAYOUT_LABELS: Record<string, string> = {
  MOSAIC_GRID: "Mosaic Grid",
  SPOTLIGHT_MANIFEST: "Spotlight + Manifest",
  PILGRIMAGE_TRAIL: "Pilgrimage Trail",
  SPEC_PANELS: "Spec Panels",
  ALTITUDE_TICKER: "Altitude Ticker",
};

interface DraftFields {
  name: string;
  heading: string;
  subheading: string;
  isActive: boolean;
}

export default function HomepageSectionsTab() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, DraftFields>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/homepage-sections");
      const data = await res.json();
      if (res.ok) {
        setSections(data.sections);
        setDrafts(
          Object.fromEntries(
            (data.sections as HomepageSection[]).map((s) => [
              s.id,
              { name: s.name, heading: s.heading, subheading: s.subheading ?? "", isActive: s.isActive },
            ]),
          ),
        );
      } else {
        console.error("Failed to fetch homepage sections:", data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const updateDraft = (id: string, field: keyof DraftFields, value: string | boolean) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const isDirty = (section: HomepageSection) => {
    const draft = drafts[section.id];
    if (!draft) return false;
    return (
      draft.name !== section.name ||
      draft.heading !== section.heading ||
      draft.subheading !== (section.subheading ?? "") ||
      draft.isActive !== section.isActive
    );
  };

  const handleSave = async (section: HomepageSection) => {
    const draft = drafts[section.id];
    if (!draft) return;
    setSavingId(section.id);
    setErrorById((prev) => ({ ...prev, [section.id]: "" }));

    try {
      const res = await fetch(`/api/admin/homepage-sections/${section.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          heading: draft.heading,
          subheading: draft.subheading || null,
          isActive: draft.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save section");
      }
      await fetchSections();
    } catch (err: unknown) {
      setErrorById((prev) => ({
        ...prev,
        [section.id]: err instanceof Error ? err.message : "An error occurred",
      }));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">
          Homepage Sections
        </h1>
        <p className="text-foreground/60 mt-1">
          Rename and edit the 5 fixed homepage showcase sections. Assign
          trips to a section from the trip editor. Distinct from
          &ldquo;Categories&rdquo; below, which powers the /experiences filter.
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton columns={5} rows={5} />
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((section) => {
            const draft = drafts[section.id];
            if (!draft) return null;
            const dirty = isDirty(section);
            const error = errorById[section.id];

            return (
              <div
                key={section.id}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary">
                      {LAYOUT_LABELS[section.layout] ?? section.layout}
                    </span>
                    <span className="text-xs text-foreground/50">
                      {section.experienceCount} trip{section.experienceCount === 1 ? "" : "s"} assigned
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateDraft(section.id, "isActive", !draft.isActive)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      draft.isActive
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {draft.isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    {draft.isActive ? "Visible on homepage" : "Hidden from homepage"}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`name-${section.id}`} className="block text-xs font-semibold text-foreground/60 mb-1.5">
                      Section name (admin-facing)
                    </label>
                    <input
                      id={`name-${section.id}`}
                      type="text"
                      value={draft.name}
                      onChange={(e) => updateDraft(section.id, "name", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/20 border border-white/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor={`heading-${section.id}`} className="block text-xs font-semibold text-foreground/60 mb-1.5">
                      Public heading
                    </label>
                    <input
                      id={`heading-${section.id}`}
                      type="text"
                      value={draft.heading}
                      onChange={(e) => updateDraft(section.id, "heading", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/20 border border-white/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor={`subheading-${section.id}`} className="block text-xs font-semibold text-foreground/60 mb-1.5">
                      Public subheading
                    </label>
                    <input
                      id={`subheading-${section.id}`}
                      type="text"
                      value={draft.subheading}
                      onChange={(e) => updateDraft(section.id, "subheading", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black/20 border border-white/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <p className="mt-3 text-sm text-red-400">{error}</p>
                )}

                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => handleSave(section)}
                    disabled={!dirty || savingId === section.id}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100 shadow-lg shadow-primary/25"
                  >
                    <Save className="w-4 h-4" />
                    {savingId === section.id ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
