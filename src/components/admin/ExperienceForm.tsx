"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Save,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import MediaUploader from "./MediaUploader";

interface Category {
  id: string;
  name: string;
}

interface ItineraryDay {
  _id?: string;
  title: string;
  description: string;
}

export default function ExperienceForm({
  initialData = null,
}: Readonly<{
  initialData?: any;
}>) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [basePrice, setBasePrice] = useState(initialData?.basePrice || 0);
  const [capacity, setCapacity] = useState(initialData?.capacity || 10);
  const [durationDays, setDurationDays] = useState(
    initialData?.durationDays || 1,
  );
  const [location, setLocation] = useState(initialData?.location || "");
  const [difficulty, setDifficulty] = useState(
    initialData?.difficulty || "EASY",
  );
  const [status, setStatus] = useState(initialData?.status || "DRAFT");
  const [isFeatured, setIsFeatured] = useState(
    initialData?.isFeatured || false,
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.categories?.map((c: any) => c.categoryId) || [],
  );

  // Arrays
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(
    (initialData?.itinerary || [{ title: "", description: "" }]).map(
      (d: any) => ({
        ...d,
        _id: d._id || crypto.randomUUID(),
      }),
    ),
  );

  useEffect(() => {
    // Fetch available categories
    const fetchCats = async () => {
      try {
        const res = await fetch("/api/admin/categories");
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    fetchCats();
  }, []);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleItineraryChange = (
    index: number,
    field: keyof ItineraryDay,
    value: string,
  ) => {
    setItinerary((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItineraryDay = () =>
    setItinerary((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        title: "",
        description: "",
      },
    ]);
  const removeItineraryDay = (index: number) =>
    setItinerary((prev) => prev.filter((_, i) => i !== index));

  const addImageUrl = () => setImages((prev) => [...prev, ""]);
  const updateImageUrl = (index: number, val: string) => {
    setImages((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };
  const removeImageUrl = (index: number) =>
    setImages((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const payload = {
      title,
      description,
      basePrice: Number(basePrice),
      capacity: Number(capacity),
      durationDays: Number(durationDays),
      location,
      difficulty,
      status,
      isFeatured,
      images: images.filter((url) => url.trim() !== ""),
      itinerary,
      categoryIds: selectedCategories,
    };

    try {
      const url = isEditing
        ? `/api/admin/experiences/${initialData.id}`
        : "/api/admin/experiences";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save experience");

      router.push("/admin/experiences");
      router.refresh(); // Ensure the list page shows the new data
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/experiences"
            className="p-2 hover:bg-foreground/10 rounded-full transition-colors text-foreground/50 hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {isEditing ? "Edit Trip" : "Create New Trip"}
          </h1>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/25"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? "Saving..." : "Save Trip"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-medium">
          {error}
        </div>
      )}

      {/* Grid Layout for Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content (Left Column) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Basic Info
            </h2>
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="e.g. Everest Base Camp Trek"
              />
            </div>
            <div>
              <label
                htmlFor="desc"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Description
              </label>
              <textarea
                id="desc"
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="Describe the experience..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="loc"
                  className="block text-sm font-medium text-foreground/80 mb-1"
                >
                  Location
                </label>
                <input
                  id="loc"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="e.g. Nepal"
                />
              </div>
              <div>
                <label
                  htmlFor="dur"
                  className="block text-sm font-medium text-foreground/80 mb-1"
                >
                  Duration (Days)
                </label>
                <input
                  id="dur"
                  type="number"
                  min="1"
                  required
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Itinerary Builder
            </h2>
            {itinerary.map((day, ix) => (
              <div
                key={day._id || `itinerary-${ix}`}
                className="bg-background border border-border rounded-xl p-4 flex gap-4"
              >
                <div className="text-foreground/50 pt-2 cursor-grab">
                  <GripVertical className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={day.title}
                    onChange={(e) =>
                      handleItineraryChange(ix, "title", e.target.value)
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50"
                    placeholder={`Day ${ix + 1} Title (e.g. Arrival in Kathmandu)`}
                    required
                  />
                  <textarea
                    rows={2}
                    value={day.description}
                    onChange={(e) =>
                      handleItineraryChange(ix, "description", e.target.value)
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50"
                    placeholder="Day description..."
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItineraryDay(ix)}
                  className="text-foreground/50 hover:text-red-500 transition-colors p-2 h-fit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItineraryDay}
              className="w-full py-3 border-2 border-dashed border-border rounded-xl text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Day
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Media & Images
            </h2>
            <p className="text-sm text-foreground/60 pb-2">
              Upload images directly to your media library, or add external
              URLs.
            </p>

            <MediaUploader
              onUploadSuccess={(urls) => {
                if (urls && urls.length > 0) {
                  setImages((prev) => [...prev, ...urls]);
                }
              }}
            />

            {images.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Attached Media
                </h3>
                {images.map((url, ix) => (
                  <div key={`${url}-${ix}`} className="flex gap-2">
                    <div className="flex-1 flex gap-2 items-center bg-background border border-border rounded-lg px-3 py-2">
                      <ImageIcon className="w-4 h-4 text-foreground/50" />
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateImageUrl(ix, e.target.value)}
                        className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImageUrl(ix)}
                      className="p-2 text-foreground/50 hover:text-red-500 transition-colors rounded-lg bg-background border border-border"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="font-medium text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add another image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Settings (Right Column) */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Pricing & Logistics
            </h2>
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Base Price (₹)
              </label>
              <input
                id="price"
                type="number"
                min="0"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50 text-xl font-semibold"
              />
            </div>
            <div>
              <label
                htmlFor="cap"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Total Capacity
              </label>
              <input
                id="cap"
                type="number"
                min="1"
                required
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Publishing
            </h2>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="DRAFT">Draft — Hidden</option>
                <option value="PUBLISHED">Published — Public</option>
                <option value="ARCHIVED">
                  Archived — Hidden, not accepting bookings
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="difficulty"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Difficulty
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="EASY">Easy</option>
                <option value="MODERATE">Moderate</option>
                <option value="HARD">Hard</option>
                <option value="EXTREME">Extreme</option>
              </select>
            </div>

            <label
              htmlFor="featured"
              className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-foreground/5 transition-colors"
              aria-labelledby="featured-label"
            >
              <input
                id="featured"
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-background bg-background"
              />
              <div id="featured-label">
                <span className="block text-sm font-medium text-foreground">
                  Featured Trip
                </span>
                <span className="block text-xs text-foreground/60">
                  Show strictly on the homepage banner
                </span>
              </div>
            </label>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Categories
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background bg-background"
                  />
                  <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                    {cat.name}
                  </span>
                </label>
              ))}
              {categories.length === 0 && (
                <span className="text-sm text-foreground/50">
                  No categories found.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
